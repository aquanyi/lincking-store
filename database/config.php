<?php
date_default_timezone_set('Africa/Nairobi');
if (session_status() === PHP_SESSION_NONE) { session_start(); }

// Auto-detect environment
if (in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1'])) {
    // Local XAMPP Settings
    $host = 'localhost';
    $dbname = 'linchking_store';
    $user = 'root';
    $pass = '';
} else {
    // Truehost Live Settings
    $host = 'localhost';
    $dbname = 'cbthjrsx_linckingstore_db';
    $user = 'cbthjrsx_linckingstore';
    $pass = 'Nyangori2021.'; 
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("SET time_zone = '+03:00'");
} catch(PDOException $e) {
    error_log("Database Connection Error: " . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed. Please try again later.']);
    exit;
}

function sendJsonResponse($status, $message, $data = null) {
    header('Content-Type: application/json');
    $response = ['status' => $status, 'message' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit;
}

// The email address where the Admin receives copies of receipts and reports
$admin_personal_email = 'Linchkingstores@gmail.com';
function logActivity($pdo, $user_id, $action) {
    try {
        $stmt = $pdo->prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)");
        $stmt->execute([$user_id, $action]);
    } catch(PDOException $e) {
        // Silently ignore log errors
    }
}



