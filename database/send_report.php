<?php
require_once 'config.php';
require_once 'mailer.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    sendJsonResponse('error', 'Unauthorized');
}

$today = date('Y-m-d');
$stmt = $pdo->prepare("SELECT SUM(total_amount) as revenue, COUNT(sale_id) as orders FROM sales WHERE DATE(sale_date) = ?");
$stmt->execute([$today]);
$summary = $stmt->fetch();

$stmt2 = $pdo->prepare("
    SELECT 'Shoe' as type, s.shoe_name as name, si.quantity, si.price_at_sale, (si.quantity * si.price_at_sale) as subtotal
    FROM sale_items si JOIN shoes s ON si.shoe_id = s.shoe_id
    JOIN sales sa ON si.sale_id = sa.sale_id WHERE DATE(sa.sale_date) = ?
    UNION ALL
    SELECT 'Cloth' as type, c.cloth_name as name, si.quantity, si.price_at_sale, (si.quantity * si.price_at_sale) as subtotal
    FROM sale_items si JOIN clothes c ON si.cloth_id = c.cloth_id
    JOIN sales sa ON si.sale_id = sa.sale_id WHERE DATE(sa.sale_date) = ?
");
$stmt2->execute([$today, $today]);
$items = $stmt2->fetchAll();

$revenue_formatted = number_format($summary['revenue'] ?? 0, 2);
$orders_formatted = $summary['orders'] ?? 0;
$date_formatted = date('l, F j, Y');

$html = "
<div style=\"font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);\">
    
    <div style=\"background: linear-gradient(135deg, #e6fffc 0%, #b3fcf5 100%); padding: 30px 20px; text-align: center; border-bottom: 3px solid #03a89e;\">
        <img src=\"https://linchkingstores.com/assets/images/logo.png\" alt=\"Linchking Stores\" style=\"max-height: 80px; margin-bottom: 10px;\">
        <h1 style=\"color: #027a73; margin: 0; font-size: 24px; letter-spacing: 1px;\">Daily Sales Report</h1>
        <p style=\"color: #03a89e; margin: 5px 0 0 0; font-weight: bold;\">$date_formatted</p>
    </div>
    
    <div style=\"padding: 30px;\">
        <div style=\"display: flex; justify-content: space-between; background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #03a89e;\">
            <div>
                <p style=\"margin: 0; color: #777; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;\">Total Revenue</p>
                <h2 style=\"margin: 5px 0 0 0; color: #03a89e; font-size: 28px;\">KSh $revenue_formatted</h2>
            </div>
            <div style=\"text-align: right;\">
                <p style=\"margin: 0; color: #777; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;\">Total Orders</p>
                <h2 style=\"margin: 5px 0 0 0; color: #333; font-size: 28px;\">$orders_formatted</h2>
            </div>
        </div>

        <h3 style=\"color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;\">Item Breakdown</h3>
        <table style=\"width: 100%; border-collapse: collapse;\">
            <thead>
                <tr style=\"background-color: #f8f9fa;\">
                    <th style=\"padding: 12px; text-align: left; border-bottom: 2px solid #03a89e; color: #333;\">Item</th>
                    <th style=\"padding: 12px; text-align: center; border-bottom: 2px solid #03a89e; color: #333;\">Qty</th>
                    <th style=\"padding: 12px; text-align: right; border-bottom: 2px solid #03a89e; color: #333;\">Subtotal</th>
                </tr>
            </thead>
            <tbody>";

if (count($items) > 0) {
    foreach($items as $item) {
        $subtotal = number_format($item['subtotal'], 2);
        $html .= "
                <tr>
                    <td style=\"padding: 12px; border-bottom: 1px dashed #eee; color: #555;\">{$item['name']} <small style=\"color:#999;\">({$item['type']})</small></td>
                    <td style=\"padding: 12px; border-bottom: 1px dashed #eee; text-align: center; color: #555;\">{$item['quantity']}</td>
                    <td style=\"padding: 12px; border-bottom: 1px dashed #eee; text-align: right; color: #555;\">KSh $subtotal</td>
                </tr>";
    }
} else {
    $html .= "<tr><td colspan='3' style=\"padding: 20px; text-align: center; color: #999; font-style: italic;\">No sales recorded today.</td></tr>";
}

$html .= "
            </tbody>
        </table>
    </div>
    
    <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;\">
        <p style=\"margin: 0;\">Generated automatically by Linchking Stores POS System</p>
    </div>
</div>";

$admin_email = isset($admin_personal_email) && !empty($admin_personal_email) ? $admin_personal_email : "admin@linchkingstores.com";

if(sendStoreEmail($admin_email, "Daily Sales Report - $today", $html)) {
    sendJsonResponse('success', 'Daily report generated and emailed to Admin successfully!');
} else {
    sendJsonResponse('error', 'Failed to send report. Please check server email settings.');
}
?>
