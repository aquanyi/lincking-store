<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $type = $_GET['type'] ?? $_POST['type'] ?? '';

    $sql = "SELECT c.*, 
            (SELECT p.name FROM categories p WHERE p.category_id = c.parent_id) as parent_name,
            (SELECT COUNT(*) FROM shoes s WHERE s.category = c.name AND s.status = 'Active') as total_shoes,
            (SELECT COUNT(*) FROM clothes cl WHERE cl.category = c.name AND cl.status = 'Active') as total_clothes
            FROM categories c";
    $params = [];
    
    if ($type === 'shoe' || $type === 'cloth') {
        $sql .= " WHERE c.type = ?";
        $params[] = $type;
    }
    $sql .= " ORDER BY c.name ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Categories fetched', $categories);
}
elseif ($action === 'add') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can add categories.');
    }
    $name = trim($_POST['name'] ?? '');
    $parent_id = !empty($_POST['parent_id']) ? intval($_POST['parent_id']) : null;
    $type = $_POST['type'] ?? 'shoe';

    if (empty($name)) {
        sendJsonResponse('error', 'Category name is required.');
    }
    $check = $pdo->prepare("SELECT category_id FROM categories WHERE name = ?");
    $check->execute([$name]);
    if ($check->fetch()) {
        sendJsonResponse('error', 'Category already exists.');
    }
    $stmt = $pdo->prepare("INSERT INTO categories (name, parent_id, type) VALUES (?, ?, ?)");
    if ($stmt->execute([$name, $parent_id, $type])) {
        logActivity($pdo, $_SESSION['user_id'], "Added category: $name ($type)");
        sendJsonResponse('success', 'Category added successfully.');
    } else {
        sendJsonResponse('error', 'Failed to add category.');
    }
}
elseif ($action === 'delete') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can delete categories.');
    }
    $category_id = intval($_POST['category_id'] ?? 0);
    $stmt = $pdo->prepare("DELETE FROM categories WHERE category_id = ?");
    if ($stmt->execute([$category_id])) {
        sendJsonResponse('success', 'Category deleted.');
    } else {
        sendJsonResponse('error', 'Failed to delete category.');
    }
}
elseif ($action === 'edit') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can edit categories.');
    }
    $category_id = intval($_POST['category_id'] ?? 0);
    $new_name = trim($_POST['name'] ?? '');
    $parent_id = !empty($_POST['parent_id']) ? intval($_POST['parent_id']) : null;
    $type = $_POST['type'] ?? 'shoe';
    
    if (empty($new_name) || $category_id <= 0) {
        sendJsonResponse('error', 'Valid category ID and new name are required.');
    }
    
    $stmt = $pdo->prepare("SELECT name FROM categories WHERE category_id = ?");
    $stmt->execute([$category_id]);
    $old_cat = $stmt->fetch();
    
    if (!$old_cat) {
        sendJsonResponse('error', 'Category not found.');
    }
    
    $old_name = $old_cat['name'];
    
    $check = $pdo->prepare("SELECT category_id FROM categories WHERE name = ? AND category_id != ?");
    $check->execute([$new_name, $category_id]);
    if ($check->fetch()) {
        sendJsonResponse('error', 'Another category with this name already exists.');
    }
    
    $stmt = $pdo->prepare("UPDATE categories SET name = ?, parent_id = ?, type = ? WHERE category_id = ?");
    if ($stmt->execute([$new_name, $parent_id, $type, $category_id])) {
        $stmt_shoes = $pdo->prepare("UPDATE shoes SET category = ? WHERE category = ?");
        $stmt_shoes->execute([$new_name, $old_name]);
        
        $stmt_clothes = $pdo->prepare("UPDATE clothes SET category = ? WHERE category = ?");
        $stmt_clothes->execute([$new_name, $old_name]);
        
        logActivity($pdo, $_SESSION['user_id'], "Edited category: $old_name to $new_name");
        sendJsonResponse('success', 'Category updated successfully.');
    } else {
        sendJsonResponse('error', 'Failed to update category.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
