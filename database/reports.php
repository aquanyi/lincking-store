<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'Admin') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$type      = $_GET['type']  ?? 'all';
$startDate = $_GET['start'] ?? date('Y-m-d');
$endDate   = $_GET['end']   ?? date('Y-m-d');

try {
    $sql = "
        SELECT 
            DATE(s.sale_date)       AS sale_date,
            SUM(si.quantity)        AS items_sold,
            SUM(si.price_at_sale * si.quantity) AS revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        WHERE DATE(s.sale_date) BETWEEN ? AND ?
    ";

    // Filter by product type using the isolated foreign keys
    if ($type === 'shoe') {
        $sql .= " AND si.cloth_id IS NULL AND si.shoe_id IS NOT NULL";
    } elseif ($type === 'cloth') {
        $sql .= " AND si.shoe_id IS NULL AND si.cloth_id IS NOT NULL";
    }

    $sql .= " GROUP BY DATE(s.sale_date) ORDER BY DATE(s.sale_date) DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$startDate, $endDate]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $data]);

} catch (PDOException $e) {
    error_log("Reports Error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Failed to generate report.']);
}
?>
