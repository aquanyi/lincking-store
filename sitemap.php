<?php
require_once 'database/config.php';
header('Content-Type: application/xml');
echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

$base_url = "https://linchkingstores.com/";

// Main pages
$pages = ['index.html', 'login.html'];
foreach($pages as $page) {
    echo "<url><loc>{$base_url}{$page}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>";
}

// Fetch all active shoes
try {
    $stmt = $pdo->query("SELECT shoe_id, shoe_name, created_at FROM shoes WHERE status='Active'");
    while($row = $stmt->fetch()) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $row['shoe_name'])));
        echo "<url>";
        echo "<loc>{$base_url}product.php?type=shoes&amp;id={$row['shoe_id']}&amp;name={$slug}</loc>";
        echo "<lastmod>" . date('Y-m-d', strtotime($row['created_at'])) . "</lastmod>";
        echo "<changefreq>daily</changefreq>";
        echo "<priority>0.8</priority>";
        echo "</url>";
    }
} catch (Exception $e) {}

// Fetch all active clothes
try {
    $stmt = $pdo->query("SELECT cloth_id, cloth_name, created_at FROM clothes WHERE status='Active'");
    while($row = $stmt->fetch()) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $row['cloth_name'])));
        echo "<url>";
        echo "<loc>{$base_url}product.php?type=clothes&amp;id={$row['cloth_id']}&amp;name={$slug}</loc>";
        echo "<lastmod>" . date('Y-m-d', strtotime($row['created_at'])) . "</lastmod>";
        echo "<changefreq>daily</changefreq>";
        echo "<priority>0.8</priority>";
        echo "</url>";
    }
} catch (Exception $e) {}

echo '</urlset>';
?>
