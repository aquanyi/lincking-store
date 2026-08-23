<?php
require_once 'database/config.php';
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        client_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        balance DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id INT NULL");
    $pdo->exec("ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status ENUM('Paid', 'Credit') DEFAULT 'Paid'");
    try { $pdo->exec("ALTER TABLE sales ADD CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE SET NULL"); } catch (Exception $e) {}
    echo "Contacts schema updated successfully!";
} catch (PDOException $e) { echo "Error: " . $e->getMessage(); }
?>
