<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $type = $_GET['type'] ?? $_POST['type'] ?? '';

    $sql = "SELECT b.*, 
            (SELECT COUNT(*) FROM shoes s WHERE s.brand = b.name AND s.status = 'Active') as total_shoes,
            (SELECT COUNT(*) FROM clothes c WHERE c.brand = b.name AND c.status = 'Active') as total_clothes
            FROM brands b";
    $params = [];
    
    if ($type === 'shoe' || $type === 'cloth') {
        $sql .= " WHERE b.type = ?";
        $params[] = $type;
    }
    $sql .= " ORDER BY b.name ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Brands fetched', $brands);
}
elseif ($action === 'add') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can add brands.');
    }
    $name = trim($_POST['name'] ?? '');
    $type = $_POST['type'] ?? 'shoe';
    if (empty($name)) {
        sendJsonResponse('error', 'Brand name is required.');
    }
    $check = $pdo->prepare("SELECT brand_id FROM brands WHERE name = ?");
    $check->execute([$name]);
    if ($check->fetch()) {
        sendJsonResponse('error', 'Brand already exists.');
    }
    $stmt = $pdo->prepare("INSERT INTO brands (name, type) VALUES (?, ?)");
    if ($stmt->execute([$name, $type])) {
        logActivity($pdo, $_SESSION['user_id'], "Added brand: $name ($type)");
        sendJsonResponse('success', 'Brand added successfully.');
    } else {
        sendJsonResponse('error', 'Failed to add brand.');
    }
}
elseif ($action === 'delete') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can delete brands.');
    }
    $brand_id = intval($_POST['brand_id'] ?? 0);
    $stmt = $pdo->prepare("DELETE FROM brands WHERE brand_id = ?");
    if ($stmt->execute([$brand_id])) {
        sendJsonResponse('success', 'Brand deleted.');
    } else {
        sendJsonResponse('error', 'Failed to delete brand.');
    }
}
elseif ($action === 'edit') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can edit brands.');
    }
    $brand_id = intval($_POST['brand_id'] ?? 0);
    $new_name = trim($_POST['name'] ?? '');
    $type = $_POST['type'] ?? 'shoe';
    
    if (empty($new_name) || $brand_id <= 0) {
        sendJsonResponse('error', 'Valid brand ID and new name are required.');
    }
    
    $stmt = $pdo->prepare("SELECT name FROM brands WHERE brand_id = ?");
    $stmt->execute([$brand_id]);
    $old_brand = $stmt->fetch();
    
    if (!$old_brand) {
        sendJsonResponse('error', 'Brand not found.');
    }
    
    $old_name = $old_brand['name'];
    
    $check = $pdo->prepare("SELECT brand_id FROM brands WHERE name = ? AND brand_id != ?");
    $check->execute([$new_name, $brand_id]);
    if ($check->fetch()) {
        sendJsonResponse('error', 'Another brand with this name already exists.');
    }
    
    $stmt = $pdo->prepare("UPDATE brands SET name = ?, type = ? WHERE brand_id = ?");
    if ($stmt->execute([$new_name, $type, $brand_id])) {
        $stmt_shoes = $pdo->prepare("UPDATE shoes SET brand = ? WHERE brand = ?");
        $stmt_shoes->execute([$new_name, $old_name]);
        
        $stmt_clothes = $pdo->prepare("UPDATE clothes SET brand = ? WHERE brand = ?");
        $stmt_clothes->execute([$new_name, $old_name]);
        
        logActivity($pdo, $_SESSION['user_id'], "Edited brand: $old_name to $new_name");
        sendJsonResponse('success', 'Brand updated successfully.');
    } else {
        sendJsonResponse('error', 'Failed to update brand.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
