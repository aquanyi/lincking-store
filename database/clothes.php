<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $stmt = $pdo->query("SELECT * FROM clothes WHERE status = 'Active' ORDER BY cloth_id DESC");
    $clothes = $stmt->fetchAll();
    sendJsonResponse('success', 'Clothes fetched', $clothes);
}
elseif ($action === 'add') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can add new clothes.');
    }

    $cloth_name = $_POST['cloth_name'] ?? '';
    $brand = $_POST['brand'] ?? '';
    $category = $_POST['category'] ?? '';
    $size = $_POST['size'] ?? '';
    $color = $_POST['color'] ?? '';
    $buying_price = (float)($_POST['buying_price'] ?? 0);
    $selling_price = (float)($_POST['selling_price'] ?? 0);
    $quantity = (int)($_POST['quantity'] ?? 0);
    $barcode = $_POST['barcode'] ?? '';

    if (empty($cloth_name) || empty($selling_price)) {
        sendJsonResponse('error', 'Cloth name and selling price are required.');
    }

    // Handle Multiple Image Uploads
    $image_paths = [];
    if (isset($_FILES['images'])) {
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        $file_count = is_array($_FILES['images']['name']) ? count($_FILES['images']['name']) : 0;
        
        for ($i = 0; $i < $file_count; $i++) {
            if ($_FILES['images']['error'][$i] == 0) {
                $filename = $_FILES['images']['name'][$i];
                $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                
                if (in_array($ext, $allowed)) {
                    $new_name = uniqid('cloth_') . '_' . $i . '.' . $ext;
                    $upload_dir = '../uploads/clothes/';
                    if (!is_dir($upload_dir)) {
                        mkdir($upload_dir, 0777, true);
                    }
                    $destination = $upload_dir . $new_name;
                    
                    if (move_uploaded_file($_FILES['images']['tmp_name'][$i], $destination)) {
                        $image_paths[] = 'uploads/clothes/' . $new_name;
                    }
                }
            }
        }
    }
    $image_path = empty($image_paths) ? '' : json_encode($image_paths);

    $stmt = $pdo->prepare("INSERT INTO clothes (cloth_name, brand, category, size, color, buying_price, selling_price, quantity, image, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt->execute([$cloth_name, $brand, $category, $size, $color, $buying_price, $selling_price, $quantity, $image_path, $barcode])) {
        $cloth_id = $pdo->lastInsertId();
        
        $stmt_log = $pdo->prepare("INSERT INTO stock_history (cloth_id, user_id, change_type, quantity_changed, reason, date_changed) VALUES (?, ?, 'Added', ?, 'Initial Stock', NOW())");
        $stmt_log->execute([$cloth_id, $_SESSION['user_id'], $quantity]);
        
        logActivity($pdo, $_SESSION['user_id'], "Added new cloth: $cloth_name");
        sendJsonResponse('success', 'Cloth added successfully.');
    } else {
        sendJsonResponse('error', 'Failed to add cloth.');
    }
}
elseif ($action === 'delete') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can delete clothes.');
    }
    
    $cloth_id = $_POST['cloth_id'] ?? 0;
    $stmt = $pdo->prepare("UPDATE clothes SET status = 'Inactive' WHERE cloth_id = ?");
    if ($stmt->execute([$cloth_id])) {
        logActivity($pdo, $_SESSION['user_id'], "Deleted cloth ID: $cloth_id");
        sendJsonResponse('success', 'Cloth deleted successfully.');
    } else {
        sendJsonResponse('error', 'Failed to delete cloth.');
    }
}
elseif ($action === 'edit') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can edit clothes.');
    }
    
    $cloth_id = $_POST['cloth_id'] ?? 0;
    $cloth_name = $_POST['cloth_name'] ?? '';
    $selling_price = (float)($_POST['selling_price'] ?? 0);
    $quantity = isset($_POST['quantity']) ? (int)$_POST['quantity'] : -1;

    if (empty($cloth_id) || empty($cloth_name)) {
        sendJsonResponse('error', 'Cloth ID and name are required.');
    }

    $updates = ["cloth_name = ?", "selling_price = ?"];
    $params = [$cloth_name, $selling_price];

    if ($quantity !== -1) {
        $updates[] = "quantity = ?";
        $params[] = $quantity;
    }
    
    if (isset($_POST['size'])) {
        $sizes = !is_array($_POST['size']) ? array_map('trim', explode(',', $_POST['size'])) : $_POST['size'];
        $updates[] = "size = ?";
        $params[] = json_encode(array_values(array_filter($sizes)));
    }
    
    if (isset($_POST['color'])) {
        $colors = !is_array($_POST['color']) ? array_map('trim', explode(',', $_POST['color'])) : $_POST['color'];
        $updates[] = "color = ?";
        $params[] = json_encode(array_values(array_filter($colors)));
    }

    // Handle new images if provided
    $image_paths = [];
    if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        $file_count = count($_FILES['images']['name']);
        
        for ($i = 0; $i < $file_count; $i++) {
            if ($_FILES['images']['error'][$i] == 0 && !empty($_FILES['images']['name'][$i])) {
                $filename = $_FILES['images']['name'][$i];
                $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                
                if (in_array($ext, $allowed)) {
                    $new_name = uniqid('cloth_') . '_' . $i . '.' . $ext;
                    $upload_dir = '../uploads/clothes/';
                    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                    
                    $destination = $upload_dir . $new_name;
                    if (move_uploaded_file($_FILES['images']['tmp_name'][$i], $destination)) {
                        $image_paths[] = 'uploads/clothes/' . $new_name;
                    }
                }
            }
        }
    }
    
    if (!empty($image_paths)) {
        $updates[] = "image = ?";
        $params[] = json_encode($image_paths);
    }
    
    $params[] = $cloth_id;
    $sql = "UPDATE clothes SET " . implode(', ', $updates) . " WHERE cloth_id = ?";

    $stmt = $pdo->prepare($sql);
    if ($stmt->execute($params)) {
        logActivity($pdo, $_SESSION['user_id'], "Edited cloth ID: $cloth_id");
        sendJsonResponse('success', 'Cloth updated successfully.');
    } else {
        sendJsonResponse('error', 'Failed to update cloth.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>




