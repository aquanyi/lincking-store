<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'Admin') {
    sendJsonResponse('error', 'Unauthorized. Only admins can perform this action.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $stmt = $pdo->query("SELECT user_id, full_name, username, role, phone, status FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll();
    sendJsonResponse('success', 'Users fetched', $users);
}
elseif ($action === 'add') {
    $full_name = trim($_POST['full_name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $role = $_POST['role'] ?? 'Attendant';
    
    if (empty($full_name) || empty($username)) {
        sendJsonResponse('error', 'Full name and username are required.');
    }
    
    // Check if username exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        sendJsonResponse('error', 'Username already exists.');
    }
    
    // Default password logic
    $default_password = $_POST['default_password'] ?? '12345';
    $hashed = password_hash($default_password, PASSWORD_BCRYPT);
    
    $stmt = $pdo->prepare("INSERT INTO users (full_name, username, password, role, phone, must_change_password) VALUES (?, ?, ?, ?, ?, 1)");
    if ($stmt->execute([$full_name, $username, $hashed, $role, $phone])) {
        logActivity($pdo, $_SESSION['user_id'], "Added new user: $username");
        sendJsonResponse('success', 'User added successfully.');
    } else {
        sendJsonResponse('error', 'Failed to add user.');
    }
}
elseif ($action === 'reset_password') {
    $user_id = $_POST['user_id'] ?? 0;
    $new_default = $_POST['default_password'] ?? '12345';
    
    if ($user_id == $_SESSION['user_id']) {
        sendJsonResponse('error', 'You cannot reset your own password here. Use the profile section.');
    }
    
    $hashed = password_hash($new_default, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 1 WHERE user_id = ?");
    
    if ($stmt->execute([$hashed, $user_id])) {
        logActivity($pdo, $_SESSION['user_id'], "Reset password for user ID: $user_id");
        sendJsonResponse('success', "Password reset successfully. User will be prompted to change it.");
    } else {
        sendJsonResponse('error', 'Failed to reset password.');
    }
}
elseif ($action === 'toggle_status') {
    $user_id = $_POST['user_id'] ?? 0;
    
    if ($user_id == $_SESSION['user_id']) {
        sendJsonResponse('error', 'You cannot deactivate yourself.');
    }
    
    // Get current status
    $stmt = $pdo->prepare("SELECT status FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $current = $stmt->fetchColumn();
    
    if ($current) {
        $new_status = ($current === 'Active') ? 'Inactive' : 'Active';
        $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE user_id = ?");
        $stmt->execute([$new_status, $user_id]);
        
        logActivity($pdo, $_SESSION['user_id'], "Changed status of user ID $user_id to $new_status");
        sendJsonResponse('success', "User marked as $new_status.");
    } else {
        sendJsonResponse('error', 'User not found.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
