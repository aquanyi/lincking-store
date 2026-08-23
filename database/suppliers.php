<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    sendJsonResponse('error', 'Unauthorized. Please login first.');
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    $stmt = $pdo->query("SELECT * FROM suppliers WHERE status = 'Active' ORDER BY supplier_name ASC");
    $suppliers = $stmt->fetchAll();
    sendJsonResponse('success', 'Suppliers fetched', $suppliers);
}
elseif ($action === 'add') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can add suppliers.');
    }
    $supplier_name  = trim($_POST['supplier_name'] ?? '');
    $contact_person = trim($_POST['contact_person'] ?? '');
    $phone          = trim($_POST['phone'] ?? '');
    $email          = trim($_POST['email'] ?? '');
    $address        = trim($_POST['address'] ?? '');

    if (empty($supplier_name)) {
        sendJsonResponse('error', 'Supplier name is required.');
    }

    $stmt = $pdo->prepare("INSERT INTO suppliers (supplier_name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$supplier_name, $contact_person, $phone, $email, $address])) {
        logActivity($pdo, $_SESSION['user_id'], "Added supplier: $supplier_name");
        sendJsonResponse('success', 'Supplier added successfully.');
    } else {
        sendJsonResponse('error', 'Failed to add supplier.');
    }
}
elseif ($action === 'delete') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can delete suppliers.');
    }
    $supplier_id = intval($_POST['supplier_id'] ?? 0);
    $stmt = $pdo->prepare("UPDATE suppliers SET status = 'Inactive' WHERE supplier_id = ?");
    if ($stmt->execute([$supplier_id])) {
        sendJsonResponse('success', 'Supplier removed successfully.');
    } else {
        sendJsonResponse('error', 'Failed to remove supplier.');
    }
}
elseif ($action === 'edit') {
    if ($_SESSION['role'] !== 'Admin') {
        sendJsonResponse('error', 'Only admins can edit suppliers.');
    }
    
    $supplier_id    = intval($_POST['supplier_id'] ?? 0);
    $supplier_name  = trim($_POST['supplier_name'] ?? '');
    $contact_person = trim($_POST['contact_person'] ?? '');
    $phone          = trim($_POST['phone'] ?? '');
    $email          = trim($_POST['email'] ?? '');
    $address        = trim($_POST['address'] ?? '');

    if (empty($supplier_id) || empty($supplier_name)) {
        sendJsonResponse('error', 'Supplier ID and name are required.');
    }

    $stmt = $pdo->prepare("UPDATE suppliers SET supplier_name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE supplier_id = ?");
    if ($stmt->execute([$supplier_name, $contact_person, $phone, $email, $address, $supplier_id])) {
        logActivity($pdo, $_SESSION['user_id'], "Edited supplier ID: $supplier_id");
        sendJsonResponse('success', 'Supplier updated successfully.');
    } else {
        sendJsonResponse('error', 'Failed to update supplier.');
    }
}
else {
    sendJsonResponse('error', 'Invalid action.');
}
?>
