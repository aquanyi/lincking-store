<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $stmt = $pdo->query("SELECT * FROM shoes WHERE status = 'Active' ORDER BY shoe_id DESC");
    $shoes = $stmt->fetchAll();
    // decode json strings before sending to frontend so it's easier to use
    foreach ($shoes as &$s) {
        $s['sizes'] = json_decode($s['sizes'], true) ?? [$s['sizes']];
        $s['colors'] = json_decode($s['colors'], true) ?? [$s['colors']];
        $s['images'] = json_decode($s['images'], true) ?? [$s['images']];
    }
    sendJsonResponse('success', 'Shoes fetched', $shoes);
}
elseif ($action === 'add') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can add new shoes.');
    }

    $shoe_name = $_POST['shoe_name'] ?? '';
    $brand = $_POST['brand'] ?? '';
    $category = $_POST['category'] ?? '';
    
    $sizes = isset($_POST['sizes']) ? $_POST['sizes'] : [];
    $colors = isset($_POST['colors']) ? $_POST['colors'] : [];
    
    if (!is_array($sizes)) $sizes = array_map('trim', explode(',', $sizes));
    if (!is_array($colors)) $colors = array_map('trim', explode(',', $colors));
    
    $buying_price = (float)($_POST['buying_price'] ?? 0);
    $selling_price = (float)($_POST['selling_price'] ?? 0);
    $quantity = (int)($_POST['quantity'] ?? 0);
    $barcode = $_POST['barcode'] ?? '';

    if (empty($shoe_name) || empty($selling_price)) {
        sendJsonResponse('error', 'Shoe name and selling price are required.');
    }

    // --- MULTI-IMAGE UPLOAD LOGIC ---
    $imagePaths = [];
    if (!empty($_FILES['images']['name'][0])) {
        foreach ($_FILES['images']['tmp_name'] as $key => $tmp_name) {
            $fileName = $_FILES['images']['name'][$key];
            if ($fileName) {
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                // Generate a unique name for every single image
                $newName = uniqid('shoe_') . '_' . $key . '.' . $ext;
                $targetPath = '../assets/images/' . $newName;
                
                if (move_uploaded_file($tmp_name, $targetPath)) {
                    $imagePaths[] = 'assets/images/' . $newName;
                }
            }
        }
    }

    $sizes_json = json_encode(array_values(array_filter($sizes)));
    $colors_json = json_encode(array_values(array_filter($colors)));
    $images_json = json_encode($imagePaths);

    $stmt = $pdo->prepare("INSERT INTO shoes (shoe_name, brand, category, sizes, colors, buying_price, selling_price, quantity, images, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt->execute([$shoe_name, $brand, $category, $sizes_json, $colors_json, $buying_price, $selling_price, $quantity, $images_json, $barcode])) {
        $shoe_id = $pdo->lastInsertId();
        
        // Log Initial Stock
        $stmt = $pdo->prepare("INSERT INTO stock_history (shoe_id, user_id, change_type, quantity_changed, reason) VALUES (?, ?, 'Initial', ?, 'New shoe added')");
        $stmt->execute([$shoe_id, $_SESSION['user_id'], $quantity]);
        
        sendJsonResponse('success', 'Shoe added successfully.');
    } else {
        sendJsonResponse('error', 'Database error.');
    }
}
elseif ($action === 'edit') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can edit shoes.');
    }

    $shoe_id = (int)($_POST['shoe_id'] ?? 0);
    $shoe_name = $_POST['shoe_name'] ?? '';
    $brand = $_POST['brand'] ?? '';
    $category = $_POST['category'] ?? '';
    
    $sizes = isset($_POST['sizes']) ? $_POST['sizes'] : [];
    $colors = isset($_POST['colors']) ? $_POST['colors'] : [];
    if (!is_array($sizes)) $sizes = array_map('trim', explode(',', $sizes));
    if (!is_array($colors)) $colors = array_map('trim', explode(',', $colors));
    
    $buying_price = (float)($_POST['buying_price'] ?? 0);
    $selling_price = (float)($_POST['selling_price'] ?? 0);
    $barcode = $_POST['barcode'] ?? '';

    if (!$shoe_id || empty($shoe_name)) {
        sendJsonResponse('error', 'Invalid input data.');
    }

    $updates = [
        "shoe_name = ?", "brand = ?", "category = ?", 
        "sizes = ?", "colors = ?", "buying_price = ?", 
        "selling_price = ?", "barcode = ?"
    ];
    
    $params = [
        $shoe_name, $brand, $category, 
        json_encode(array_values(array_filter($sizes))), 
        json_encode(array_values(array_filter($colors))), 
        $buying_price, $selling_price, $barcode
    ];

    // --- MULTI-IMAGE UPLOAD LOGIC ---
    $imagePaths = [];
    if (!empty($_FILES['images']['name'][0])) {
        foreach ($_FILES['images']['tmp_name'] as $key => $tmp_name) {
            $fileName = $_FILES['images']['name'][$key];
            if ($fileName) {
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                // Generate a unique name for every single image
                $newName = uniqid('shoe_') . '_' . $key . '.' . $ext;
                $targetPath = '../assets/images/' . $newName;
                
                if (move_uploaded_file($tmp_name, $targetPath)) {
                    $imagePaths[] = 'assets/images/' . $newName;
                }
            }
        }
    }
    
    if (!empty($imagePaths)) {
        $updates[] = "images = ?";
        $params[] = json_encode($imagePaths);
    }
    
    $params[] = $shoe_id;

    $sql = "UPDATE shoes SET " . implode(', ', $updates) . " WHERE shoe_id = ?";
    $stmt = $pdo->prepare($sql);
    
    if ($stmt->execute($params)) {
        sendJsonResponse('success', 'Shoe updated successfully.');
    } else {
        sendJsonResponse('error', 'Database update failed.');
    }
}
elseif ($action === 'delete') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can delete shoes.');
    }

    $shoe_id = (int)($_POST['shoe_id'] ?? 0);
    if (!$shoe_id) sendJsonResponse('error', 'Invalid shoe ID.');

    $stmt = $pdo->prepare("UPDATE shoes SET status = 'Inactive' WHERE shoe_id = ?");
    if ($stmt->execute([$shoe_id])) {
        sendJsonResponse('success', 'Shoe deleted successfully.');
    } else {
        sendJsonResponse('error', 'Delete failed.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
