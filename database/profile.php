<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// GET current user profile
if ($action === 'get') {
    $stmt = $pdo->prepare("SELECT user_id, full_name, username, phone, role, created_at FROM users WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user) {
        sendJsonResponse('success', 'Profile fetched', $user);
    } else {
        sendJsonResponse('error', 'User not found.');
    }
}
// UPDATE profile details
elseif ($action === 'update_profile') {
    $full_name = trim($_POST['full_name'] ?? '');
    $phone     = trim($_POST['phone'] ?? '');

    if (empty($full_name)) {
        sendJsonResponse('error', 'Full name is required.');
    }

    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?");
    if ($stmt->execute([$full_name, $phone, $_SESSION['user_id']])) {
        // Update session name
        $_SESSION['full_name'] = $full_name;
        logActivity($pdo, $_SESSION['user_id'], "Updated profile details.");
        sendJsonResponse('success', 'Profile updated successfully.');
    } else {
        sendJsonResponse('error', 'Failed to update profile.');
    }
}
// CHANGE PASSWORD
elseif ($action === 'change_password') {
    $current_password = $_POST['current_password'] ?? '';
    $new_password     = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    if (empty($current_password) || empty($new_password) || empty($confirm_password)) {
        sendJsonResponse('error', 'All password fields are required.');
    }
    if ($new_password !== $confirm_password) {
        sendJsonResponse('error', 'New passwords do not match.');
    }
    if (strlen($new_password) < 6) {
        sendJsonResponse('error', 'New password must be at least 6 characters.');
    }

    // Verify current password
    $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !password_verify($current_password, $row['password'])) {
        sendJsonResponse('error', 'Current password is incorrect.');
    }

    $hashed = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE user_id = ?");
    if ($stmt->execute([$hashed, $_SESSION['user_id']])) {
        logActivity($pdo, $_SESSION['user_id'], "Changed own password.");
        sendJsonResponse('success', 'Password changed successfully.');
    } else {
        sendJsonResponse('error', 'Failed to change password.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
