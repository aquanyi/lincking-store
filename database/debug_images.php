<?php require "config.php"; $stmt = $pdo->query("SELECT shoe_name, images FROM shoes LIMIT 10"); echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC)); ?>
