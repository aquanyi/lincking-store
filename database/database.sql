-- Lincking Store Database Schema




-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Attendant') NOT NULL,
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    must_change_password TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin User (password is '12345' hashed with bcrypt)
INSERT INTO users (full_name, username, password, role, phone, must_change_password) 
VALUES ('System Admin', 'admin', '$2y$12$M1DW0V/OJFohn2BUANlFIe858oA0Q6UkqM.zbKLkiBLf0CC1B.kt6', 'Admin', '0700000000', 0)
ON DUPLICATE KEY UPDATE username='admin';

-- 2. Shoes Table
CREATE TABLE IF NOT EXISTS shoes (
    shoe_id INT AUTO_INCREMENT PRIMARY KEY,
    shoe_name VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    sizes VARCHAR(20) NOT NULL,
    colors VARCHAR(30) NOT NULL,
    buying_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    images VARCHAR(255),
    barcode VARCHAR(100),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    attendant_id INT NOT NULL,
    payment_method ENUM('Cash', 'Mobile Money') NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_received DECIMAL(10, 2) NOT NULL,
    change_returned DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mpesa_code VARCHAR(50) NULL,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attendant_id) REFERENCES users(user_id)
);

-- 4. Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    shoe_id INT NULL,
    cloth_id INT NULL,
    quantity INT NOT NULL,
    price_at_sale DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (shoe_id) REFERENCES shoes(shoe_id)
);

-- 5. Stock History Table
CREATE TABLE IF NOT EXISTS stock_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    shoe_id INT NULL,
    cloth_id INT NULL,
    change_type ENUM('Added', 'Updated', 'Sold') NOT NULL,
    quantity_changed INT NOT NULL,
    reason VARCHAR(255) NULL,
    user_id INT NOT NULL,
    date_changed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shoe_id) REFERENCES shoes(shoe_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 6. Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    receipt_number VARCHAR(50) NOT NULL,
    receipt_data TEXT NULL,
    printed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
);

-- 7. Shop Settings Table
CREATE TABLE IF NOT EXISTS shop_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    logo VARCHAR(255),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'KSh',
    receipt_footer TEXT
);

INSERT INTO shop_settings (shop_name, phone_number, address, receipt_footer)
SELECT 'LINCHKING STORES', '0700000000', 'Nairobi, Kenya', 'Thank You For Shopping With Us'
WHERE NOT EXISTS (SELECT 1 FROM shop_settings);

-- 8. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 9. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Clothes Table
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
);

-- 10. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

