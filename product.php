<?php
require_once 'database/config.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$type = isset($_GET['type']) ? $_GET['type'] : 'shoes';

if ($type === 'shoes') {
    $stmt = $pdo->prepare("SELECT * FROM shoes WHERE shoe_id = ? AND status='Active'");
} else {
    $stmt = $pdo->prepare("SELECT * FROM clothes WHERE cloth_id = ? AND status='Active'");
}
$stmt->execute([$id]);
$product = $stmt->fetch();

if (!$product) {
    header("Location: index.html");
    exit;
}

$name = htmlspecialchars($type === 'shoes' ? $product['shoe_name'] : $product['cloth_name']);
$desc = htmlspecialchars('Premium quality ' . $name . ' from Linchking Stores.');
$price = number_format($product['selling_price'], 2);
$brand = htmlspecialchars($product['brand'] ?? 'Linchking');

// Check for images
$images = [];
if ($type === 'shoes' && !empty($product['images'])) {
    $images = json_decode($product['images'], true);
} elseif ($type === 'clothes' && !empty($product['image'])) {
    // clothes table might have 'image' (single string) or 'images' (JSON array) depending on the migration state
    $img_val = isset($product['images']) ? $product['images'] : $product['image'];
    $images = json_decode($img_val, true) ?? [$img_val];
}
$main_img = !empty($images) && isset($images[0]) && $images[0] != '' ? "https://linchkingstores.com/" . $images[0] : "https://linchkingstores.com/assets/images/hero-shoe.png";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $name ?> - Buy Online | Linchking Stores</title>
    
    <!-- SEO Meta Tags for Google -->
    <meta name="description" content="Buy <?= $name ?> for KSh <?= $price ?> at Linchking Stores. <?= $desc ?>">
    <meta name="keywords" content="<?= $name ?>, <?= $brand ?>, shoes, clothes, Nairobi, Linchking Stores, buy online">
    
    <!-- Open Graph for Facebook/WhatsApp -->
    <meta property="og:title" content="<?= $name ?> - KSh <?= $price ?>">
    <meta property="og:description" content="<?= $desc ?>">
    <meta property="og:image" content="<?= $main_img ?>">
    <meta property="og:url" content="https://linchkingstores.com/product.php?type=<?= $type ?>&amp;id=<?= $id ?>">
    <meta property="og:type" content="product">
    
    <!-- Schema.org Data (This is what tells Google to show price and stock in search results!) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "<?= $name ?>",
      "image": [ "<?= $main_img ?>" ],
      "description": "<?= $desc ?>",
      "sku": "<?= $product['barcode'] ?? $id ?>",
      "brand": {
        "@type": "Brand",
        "name": "<?= $brand ?>"
      },
      "offers": {
        "@type": "Offer",
        "url": "https://linchkingstores.com/product.php?type=<?= $type ?>&amp;id=<?= $id ?>",
        "priceCurrency": "KES",
        "price": "<?= $product['selling_price'] ?>",
        "availability": "https://schema.org/InStock"
      }
    }
    </script>
    
    <!-- Redirect standard users to the actual store page -->
    <script>
        // Once the user (not Googlebot) lands here, take them to the beautiful store UI
        window.location.replace("https://linchkingstores.com/index.html");
    </script>
</head>
<body style="font-family: sans-serif; padding: 40px; text-align: center;">
    <!-- Fallback HTML for Search Engines -->
    <h1><?= $name ?></h1>
    <img src="<?= $main_img ?>" alt="<?= $name ?>" style="max-width: 300px;">
    <h2>KSh <?= $price ?></h2>
    <p>Brand: <?= $brand ?></p>
    <p><?= $desc ?></p>
    <p><a href="https://linchkingstores.com/index.html">Click here to return to Linchking Stores</a></p>
</body>
</html>

