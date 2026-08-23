<?php
require_once 'config.php';
require_once 'mailer.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized');
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'search') {
        $q = $_GET['q'] ?? '';
        
        $sql_shoes = "SELECT shoe_id as item_id, shoe_name as item_name, 'shoe' as item_type, barcode, category, brand, selling_price, quantity, sizes as size, colors as color, images as image FROM shoes WHERE status = 'Active' AND quantity > 0";
        $sql_clothes = "SELECT cloth_id as item_id, cloth_name as item_name, 'cloth' as item_type, barcode, category, brand, selling_price, quantity, size, color, image FROM clothes WHERE status = 'Active' AND quantity > 0";
        
        $params = [];
        
        if (!empty($q)) {
            $sql_shoes .= " AND (shoe_name LIKE ? OR barcode LIKE ?)";
            $sql_clothes .= " AND (cloth_name LIKE ? OR barcode LIKE ?)";
            $params = ["%$q%", "%$q%", "%$q%", "%$q%"];
        }
        
        $sql = "($sql_shoes) UNION ($sql_clothes) ORDER BY item_name ASC LIMIT 40";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse('success', '', $items);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle JSON payload (from checkout view) or FormData (from record sale view)
    $isJson = strpos($_SERVER["CONTENT_TYPE"] ?? '', "application/json") !== false;
    
    if ($isJson) {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $action = $data['action'] ?? '';
    } else {
        $data = $_POST;
        if (isset($data['items']) && is_string($data['items'])) {
            $data['items'] = json_decode($data['items'], true);
        }
    }
    
    if (!$data) {
        sendJsonResponse('error', 'Invalid input');
    }
    
    if ($action === 'checkout' || $action === 'process_sale') {
        $items = $data['items'] ?? [];
        $payment_method = $data['payment_method'] ?? 'Cash';
        $amount_received = (float)($data['amount_received'] ?? 0);
        $mpesa_code = $data['mpesa_code'] ?? null;
        
        if (empty($items)) {
            sendJsonResponse('error', 'Cart is empty');
        }
        
        $client_id = !empty($data['client_id']) ? (int)$data['client_id'] : null;
        $payment_status = ($payment_method === 'Credit') ? 'Credit' : 'Paid';
        
        try {
            $pdo->beginTransaction();
            
            $total_amount = 0;
            foreach ($items as $item) {
                $item_id = $item['item_id'] ?? $item['shoe_id'] ?? $item['cloth_id'];
                $item_type = $item['item_type'] ?? ($item['shoe_id'] ? 'shoe' : 'cloth');
                $qty = (int)$item['qty'];
                
                $table = $item_type === 'cloth' ? 'clothes' : 'shoes';
                $id_col = $item_type === 'cloth' ? 'cloth_id' : 'shoe_id';
                
                $stmt = $pdo->prepare("SELECT selling_price, quantity FROM $table WHERE $id_col = ? AND status = 'Active'");
                $stmt->execute([$item_id]);
                $db_item = $stmt->fetch();
                
                if (!$db_item) {
                    throw new Exception(ucfirst($item_type) . " ID $item_id not found or inactive.");
                }
                
                if ($db_item['quantity'] < $qty) {
                    throw new Exception("Insufficient stock for $item_type ID $item_id. Only " . $db_item['quantity'] . " left.");
                }
                
                $total_amount += ((float)$db_item['selling_price'] * $qty);
            }
            
            if ($payment_method === 'Cash' && $amount_received < $total_amount) {
                throw new Exception("Amount received is less than total amount.");
            }
            
            $change = $payment_method === 'Cash' ? ($amount_received - $total_amount) : 0;
            if ($payment_method !== 'Cash' && $payment_method !== 'Credit') {
                $amount_received = $total_amount;
            }
            
            $receipt_number = 'REC-' . strtoupper(uniqid());
            
            $stmt = $pdo->prepare("INSERT INTO sales (receipt_number, attendant_id, payment_method, total_amount, amount_received, change_returned, mpesa_code, client_id, payment_status, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([
                $receipt_number,
                $user_id,
                $payment_method,
                $total_amount,
                $amount_received,
                $change,
                $mpesa_code,
                $client_id,
                $payment_status
            ]);
            $sale_id = $pdo->lastInsertId();
            
            if ($payment_method === 'Credit' && $client_id) {
                $unpaid = $total_amount - $amount_received;
                if ($unpaid > 0) {
                    $pdo->prepare("UPDATE clients SET balance = balance + ? WHERE client_id = ?")->execute([$unpaid, $client_id]);
                }
            }
            
            foreach ($items as $item) {
                $item_id = $item['item_id'] ?? $item['shoe_id'] ?? $item['cloth_id'];
                $item_type = $item['item_type'] ?? ($item['shoe_id'] ? 'shoe' : 'cloth');
                $selected_size = $item['selected_size'] ?? null;
                $selected_color = $item['selected_color'] ?? null;
                
                if ($item_type !== 'shoe' && $item_type !== 'cloth') {
                    throw new Exception("Invalid item type");
                }
                
                $table = $item_type === 'cloth' ? 'clothes' : 'shoes';
                $id_col = $item_type === 'cloth' ? 'cloth_id' : 'shoe_id';
                $qty = (int)$item['qty'];
                
                // Fetch price
                $stmt = $pdo->prepare("SELECT selling_price FROM $table WHERE $id_col = ?");
                $stmt->execute([$item_id]);
                $price = $stmt->fetchColumn();
                $subtotal = $price * $qty;
                
                $stmt = $pdo->prepare("INSERT INTO sale_items (sale_id, shoe_id, cloth_id, quantity, price_at_sale, subtotal, selected_size, selected_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $s_id = $item_type === 'shoe' ? $item_id : null;
                $c_id = $item_type === 'cloth' ? $item_id : null;
                
                $stmt->execute([$sale_id, $s_id, $c_id, $qty, $price, $subtotal, $selected_size, $selected_color]);
                
                // Deduct stock
                $stmt = $pdo->prepare("UPDATE $table SET quantity = quantity - ? WHERE $id_col = ?");
                $stmt->execute([$qty, $item_id]);
                
                // Log stock history
                $stmt = $pdo->prepare("INSERT INTO stock_history (shoe_id, cloth_id, user_id, change_type, quantity_changed, reason, date_changed) VALUES (?, ?, ?, 'Sold', ?, ?, NOW())");
                $stmt->execute([$s_id, $c_id, $user_id, $qty, "Sold (Receipt: $receipt_number)"]);
            }
            
            // Create receipt entry
            $stmt = $pdo->prepare("INSERT INTO receipts (sale_id, receipt_number, receipt_data, created_at) VALUES (?, ?, ?, NOW())");
            $receipt_data = json_encode([
                'items' => $items,
                'total' => $total_amount,
                'received' => $amount_received,
                'change' => $change,
                'method' => $payment_method,
                'mpesa_code' => $mpesa_code
            ]);
            $stmt->execute([$sale_id, $receipt_number, $receipt_data]);
            
            $pdo->commit();
            
            sendJsonResponse('success', 'Sale completed successfully', [
                'receipt' => $receipt_number,
                'total' => $total_amount,
                'change' => $change
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Sale error: ' . $e->getMessage());
            sendJsonResponse('error', $e->getMessage());
        }
    }
}

sendJsonResponse('error', 'Invalid action');



