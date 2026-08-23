<?php
session_start();
require_once 'config.php';
header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    try {
        $stmt = $pdo->query("SELECT * FROM clients ORDER BY name ASC");
        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
    exit;
}

if ($action === 'add') {
    $name = trim($_POST['name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    if (!$name) { echo json_encode(['status' => 'error', 'message' => 'Name required']); exit; }
    try {
        $stmt = $pdo->prepare("INSERT INTO clients (name, phone) VALUES (?, ?)");
        $stmt->execute([$name, $phone]);
        echo json_encode(['status' => 'success']);
    } catch (PDOException $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
    exit;
}

if ($action === 'clear_debt') {
    $client_id = (int)($_POST['client_id'] ?? 0);
    if (!$client_id) { echo json_encode(['status' => 'error', 'message' => 'Invalid client']); exit; }
    try {
        $pdo->beginTransaction();
        
        // Fetch unpaid sales before clearing them
        $stmtSales = $pdo->prepare("
            SELECT s.sale_id, s.receipt_number, s.sale_date, s.total_amount, u.full_name as attendant 
            FROM sales s 
            LEFT JOIN users u ON s.attendant_id = u.user_id 
            WHERE s.client_id = ? AND s.payment_status = 'Credit'
        ");
        $stmtSales->execute([$client_id]);
        $unpaid_sales = $stmtSales->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch items for these sales
        $items = [];
        if (count($unpaid_sales) > 0) {
            $sale_ids = array_column($unpaid_sales, 'sale_id');
            $inQuery = implode(',', array_fill(0, count($sale_ids), '?'));
            $stmtItems = $pdo->prepare("
                SELECT 
                    si.sale_id,
                    si.quantity as qty,
                    si.price_at_sale as selling_price,
                    si.selected_size,
                    si.selected_color,
                    COALESCE(sh.shoe_name, c.cloth_name, 'Item') as item_name
                FROM sale_items si
                LEFT JOIN shoes sh ON si.shoe_id = sh.shoe_id
                LEFT JOIN clothes c ON si.cloth_id = c.cloth_id
                WHERE si.sale_id IN ($inQuery)
            ");
            $stmtItems->execute($sale_ids);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Clear debt
        $stmt = $pdo->prepare("UPDATE clients SET balance = 0 WHERE client_id = ?");
        $stmt->execute([$client_id]);
        $stmt2 = $pdo->prepare("UPDATE sales SET payment_status = 'Paid' WHERE client_id = ? AND payment_status = 'Credit'");
        $stmt2->execute([$client_id]);
        $pdo->commit();
        
        echo json_encode(['status' => 'success', 'sales' => $unpaid_sales, 'items' => $items]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'edit_balance') {
    $client_id = (int)($_POST['client_id'] ?? 0);
    $new_balance = (float)($_POST['balance'] ?? 0);
    if (!$client_id) { echo json_encode(['status' => 'error', 'message' => 'Invalid client']); exit; }
    try {
        $stmt = $pdo->prepare("UPDATE clients SET balance = ? WHERE client_id = ?");
        $stmt->execute([$new_balance, $client_id]);
        
        if ($new_balance <= 0) {
            $stmt2 = $pdo->prepare("UPDATE sales SET payment_status = 'Paid' WHERE client_id = ? AND payment_status = 'Credit'");
            $stmt2->execute([$client_id]);
        }
        
        echo json_encode(['status' => 'success']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
?>
