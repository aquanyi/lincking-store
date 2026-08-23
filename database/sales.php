<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'list') {
    try {
        $stmt = $pdo->query("
            SELECT s.sale_id, s.receipt_number, s.payment_method, s.total_amount, 
                   s.amount_received, s.change_returned, s.mpesa_code, s.sale_date,
                   u.full_name,
                   (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.sale_id) as items_sold
            FROM sales s
            LEFT JOIN users u ON s.attendant_id = u.user_id
            ORDER BY s.sale_date DESC
            LIMIT 200
        ");
        $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendJsonResponse('success', 'Sales fetched', $sales);
    } catch (PDOException $e) {
        error_log('Sales list error: ' . $e->getMessage());
        sendJsonResponse('error', 'Failed to load sales.');
    }
}

if ($action === 'get_receipt') {
    $receipt_number = $_GET['receipt_number'] ?? '';
    if (!$receipt_number) {
        sendJsonResponse('error', 'Receipt number required.');
    }
    try {
        // 1. Get the main sale record
        $stmt = $pdo->prepare("
            SELECT s.*, u.full_name 
            FROM sales s 
            LEFT JOIN users u ON s.attendant_id = u.user_id 
            WHERE s.receipt_number = ?
        ");
        $stmt->execute([$receipt_number]);
        $sale = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sale) {
            sendJsonResponse('error', 'Receipt not found.');
        }

        // 2. Get the individual items
        $itemStmt = $pdo->prepare("
            SELECT 
                si.quantity as qty,
                si.price_at_sale as selling_price,
                si.selected_size,
                si.selected_color,
                COALESCE(sh.shoe_name, c.cloth_name, 'Item') as item_name
            FROM sale_items si
            LEFT JOIN shoes sh ON si.shoe_id = sh.shoe_id
            LEFT JOIN clothes c ON si.cloth_id = c.cloth_id
            WHERE si.sale_id = ?
        ");
        $itemStmt->execute([$sale['sale_id']]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'sale' => $sale, 'items' => $items]);
        exit;
    } catch (PDOException $e) {
        error_log('Receipt fetch error: ' . $e->getMessage());
        sendJsonResponse('error', 'Database error retrieving receipt.');
    }
}

sendJsonResponse('error', 'Invalid action.');
?>
