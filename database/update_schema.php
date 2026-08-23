<?php
require_once 'config.php';

try {
    // 1. Add clothes table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS clothes (
            cloth_id INT AUTO_INCREMENT PRIMARY KEY,
            cloth_name VARCHAR(100) NOT NULL,
            barcode VARCHAR(100),
            category VARCHAR(50),
            brand VARCHAR(50),
            buying_price DECIMAL(10, 2) NOT NULL,
            selling_price DECIMAL(10, 2) NOT NULL,
            quantity INT NOT NULL DEFAULT 0,
            size VARCHAR(20),
            color VARCHAR(30),
            image VARCHAR(255),
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // 2. Categories table
    try {
        $pdo->exec("ALTER TABLE categories ADD COLUMN parent_id INT NULL");
    } catch(PDOException $e) { /* Column might exist */ }

    // 3. sale_items table
    try {
        $pdo->exec("ALTER TABLE sale_items ADD COLUMN cloth_id INT NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE sale_items MODIFY COLUMN shoe_id INT NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE sale_items RENAME COLUMN price TO price_at_sale");
    } catch(PDOException $e) {}

    // 4. receipts table
    try {
        $pdo->exec("ALTER TABLE receipts ADD COLUMN receipt_data TEXT NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE receipts ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    } catch(PDOException $e) {}

    // 5. stock_history table
    try {
        $pdo->exec("ALTER TABLE stock_history ADD COLUMN cloth_id INT NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE stock_history MODIFY COLUMN shoe_id INT NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE stock_history RENAME COLUMN action TO change_type");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE stock_history RENAME COLUMN quantity TO quantity_changed");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE stock_history ADD COLUMN reason VARCHAR(255) NULL");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE stock_history RENAME COLUMN date TO date_changed");
    } catch(PDOException $e) {}

    // 6. sales table
    try {
        $pdo->exec("ALTER TABLE sales ADD COLUMN mpesa_code VARCHAR(50) NULL");
    } catch(PDOException $e) {}

    // 7. shoes table
    try {
        $pdo->exec("ALTER TABLE shoes RENAME COLUMN size TO sizes");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE shoes RENAME COLUMN color TO colors");
    } catch(PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE shoes RENAME COLUMN image TO images");
    } catch(PDOException $e) {}

    echo "Schema update completed successfully.";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
