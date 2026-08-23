<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

try {
    // Check if clothes table exists
    $clothes_exists = false;
    try {
        $pdo->query("SELECT 1 FROM clothes LIMIT 1");
        $clothes_exists = true;
    } catch(PDOException $e) {
        // Table doesn't exist
    }

    // 1. Total Stock Items & Value
    if ($clothes_exists) {
        $stmt1 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active') + (SELECT COUNT(*) FROM clothes WHERE status = 'Active') as total_items, 
            (SELECT COALESCE(SUM(quantity * selling_price), 0) FROM shoes WHERE status = 'Active') + (SELECT COALESCE(SUM(quantity * selling_price), 0) FROM clothes WHERE status = 'Active') as total_value");
    } else {
        $stmt1 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active') as total_items, 
            (SELECT COALESCE(SUM(quantity * selling_price), 0) FROM shoes WHERE status = 'Active') as total_value");
    }
    $stockStats = $stmt1->fetch(PDO::FETCH_ASSOC);

    // 2. Low Stock Count (threshold: <= 10)
    if ($clothes_exists) {
        $stmt2 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active' AND quantity > 0 AND quantity <= 10) + 
            (SELECT COUNT(*) FROM clothes WHERE status = 'Active' AND quantity > 0 AND quantity <= 10) as low_stock");
    } else {
        $stmt2 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active' AND quantity > 0 AND quantity <= 10) as low_stock");
    }
    $lowStockCount = $stmt2->fetch(PDO::FETCH_ASSOC);

    // 3. Out of Stock Count
    if ($clothes_exists) {
        $stmt3 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active' AND quantity = 0) + 
            (SELECT COUNT(*) FROM clothes WHERE status = 'Active' AND quantity = 0) as out_of_stock");
    } else {
        $stmt3 = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM shoes WHERE status = 'Active' AND quantity = 0) as out_of_stock");
    }
    $outOfStock = $stmt3->fetch(PDO::FETCH_ASSOC);

    // 4. Low Stock Items
    if ($clothes_exists) {
        $stmt4 = $pdo->query("
            SELECT item_name, quantity, size FROM (
                SELECT shoe_name as item_name, quantity, sizes as size FROM shoes WHERE status = 'Active' AND quantity <= 10
                UNION ALL
                SELECT cloth_name as item_name, quantity, size FROM clothes WHERE status = 'Active' AND quantity <= 10
            ) t ORDER BY quantity ASC LIMIT 20
        ");
    } else {
        $stmt4 = $pdo->query("
            SELECT shoe_name as item_name, quantity, sizes as size FROM shoes WHERE status = 'Active' AND quantity <= 10 ORDER BY quantity ASC LIMIT 20
        ");
    }
    $lowStockItems = $stmt4->fetchAll(PDO::FETCH_ASSOC);

    // 5. Sales Today
    $today = date('Y-m-d');
    $stmt5 = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as sales_today, COUNT(*) as sales_count FROM sales WHERE DATE(sale_date) = ?");
    $stmt5->execute([$today]);
    $salesToday = $stmt5->fetch(PDO::FETCH_ASSOC);

    // 6. Total Revenue (This Month)
    $month = date('Y-m');
    $stmt6 = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM sales WHERE DATE_FORMAT(sale_date, '%Y-%m') = ?");
    $stmt6->execute([$month]);
    $totalRevenue = $stmt6->fetch(PDO::FETCH_ASSOC);

    // Combine Data
    $data = [
        'total_items' => $stockStats['total_items'] ?? 0,
        'total_value' => $stockStats['total_value'] ?? 0,
        'low_stock' => $lowStockCount['low_stock'] ?? 0,
        'out_of_stock' => $outOfStock['out_of_stock'] ?? 0,
        'sales_today' => $salesToday['sales_today'] ?? 0,
        'sales_count' => $salesToday['sales_count'] ?? 0,
        'total_revenue' => $totalRevenue['total_revenue'] ?? 0,
        'low_stock_items' => $lowStockItems
    ];

    sendJsonResponse('success', 'Dashboard stats fetched', $data);

} catch (PDOException $e) {
    sendJsonResponse('error', 'Database error: ' . $e->getMessage());
}
?>
