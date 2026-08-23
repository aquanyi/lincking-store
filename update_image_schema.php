<?php
require_once 'database/config.php';
try {
    // Expand the column sizes to LONGTEXT so they can hold unlimited image URLs
    try { $pdo->exec("ALTER TABLE inventory MODIFY COLUMN image LONGTEXT"); } catch(Exception $e) {}
    try { $pdo->exec("ALTER TABLE shoes MODIFY COLUMN images LONGTEXT"); } catch(Exception $e) {}
    try { $pdo->exec("ALTER TABLE clothes MODIFY COLUMN image LONGTEXT"); } catch(Exception $e) {}
    
    echo "Success! Database is now ready for multiple images.";
} catch (PDOException $e) { 
    echo "Error: " . $e->getMessage(); 
}
?>
