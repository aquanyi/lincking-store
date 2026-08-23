<?php
require_once 'config.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? '';

if ($action === 'login') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendJsonResponse('error', 'Username and password are required.');
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $expected_role = $_POST['expected_role'] ?? '';
        
        if (!empty($expected_role) && strcasecmp($user['role'], $expected_role) !== 0) {
            sendJsonResponse('error', "Access denied. You are registered as a {$user['role']}, please use the correct login portal.");
        }
        
        if ($user['status'] !== 'Active') {
            sendJsonResponse('error', 'Your account is inactive. Please contact the administrator.');
        }
        
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['full_name'] = $user['full_name'];
        
        // Log login activity
        logActivity($pdo, $user['user_id'], "Logged in");
        
        sendJsonResponse('success', 'Login successful.', [
            'role' => strtolower($user['role']),
            'must_change_password' => (int)$user['must_change_password']
        ]);
    } else {
        sendJsonResponse('error', 'Invalid username or password.');
    }
}
elseif ($action === 'change_password') {
    if (!isset($_SESSION['user_id'])) {
        sendJsonResponse('error', 'Unauthorized. Please login first.');
    }
    
    $new_password = $_POST['new_password'] ?? '';
    if (empty($new_password) || strlen($new_password) < 6) {
        sendJsonResponse('error', 'Password must be at least 6 characters.');
    }
    
    $hashed = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE user_id = ?");
    $stmt->execute([$hashed, $_SESSION['user_id']]);
    
    logActivity($pdo, $_SESSION['user_id'], "Changed password");
    
    sendJsonResponse('success', 'Password updated successfully.');
}
elseif ($action === 'logout') {
    if (isset($_SESSION['user_id'])) {
        logActivity($pdo, $_SESSION['user_id'], "Logged out");
    }
    session_destroy();
    sendJsonResponse('success', 'Logged out.');
}
elseif ($action === 'me') {
    if (isset($_SESSION['user_id'])) {
        sendJsonResponse('success', 'Session active', [
            'user_id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'full_name' => $_SESSION['full_name'],
            'role' => $_SESSION['role']
        ]);
    } else {
        sendJsonResponse('error', 'Not logged in');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>

