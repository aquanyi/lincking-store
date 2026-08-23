<?php
require_once 'config.php';
header('Content-Type: application/json');

// Fetch all active shoes
$stmt = $pdo->query("SELECT * FROM shoes WHERE status = 'Active' AND quantity > 0 ORDER BY shoe_id DESC");
$shoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($shoes as &$s) {
    $s['sizes'] = json_decode($s['sizes'], true) ?? [$s['sizes']];
    $s['colors'] = json_decode($s['colors'], true) ?? [$s['colors']];
    $s['images'] = json_decode($s['images'], true) ?? [$s['images']];
    $s['item_type'] = 'shoe';
    $s['item_id'] = $s['shoe_id'];
    $s['item_name'] = $s['shoe_name'];
    unset($s['buying_price']);
}

// Optional: If there's a clothes table, you can fetch it and merge here.
$clothes = [];
try {
    $stmt_c = $pdo->query("SELECT * FROM clothes WHERE status = 'Active' AND quantity > 0 ORDER BY cloth_id DESC");
    $clothes = $stmt_c->fetchAll(PDO::FETCH_ASSOC);
    foreach ($clothes as &$c) {
        $c['sizes'] = json_decode($c['size'], true) ?? [$c['size']]; // assuming clothes haven't been migrated yet, use size
        $c['colors'] = json_decode($c['color'], true) ?? [$c['color']];
        $c['images'] = json_decode($c['image'], true) ?? [$c['image']];
        $c['item_type'] = 'cloth';
        $c['item_id'] = $c['cloth_id'];
        $c['item_name'] = $c['cloth_name'];
        unset($c['buying_price']);
    }
} catch(Exception $e) {
    // clothes table might not exist yet
}

$all_items = array_merge($shoes, $clothes);

echo json_encode(['status' => 'success', 'data' => $all_items]);
?>

