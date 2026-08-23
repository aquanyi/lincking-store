<?php
// Load PHPMailer manually without Composer
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendStoreEmail($to, $subject, $message) {
    $mail = new PHPMailer(true);

    try {
        // SMTP Server settings from cPanel
        $mail->isSMTP();
        $mail->Host       = 'das114.truehost.cloud'; 
        $mail->SMTPAuth   = true;
        $mail->Username   = 'admin@linchkingstores.com';
        $mail->Password   = 'tT?gu_~$F4OvOun0'; // Password provided earlier
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // SSL
        $mail->Port       = 465;

        // Recipients
        $mail->setFrom('admin@linchkingstores.com', 'Linchking Stores');
        $mail->addAddress($to);
        $mail->addReplyTo('admin@linchkingstores.com', 'Linchking Support');

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $message;
        $mail->AltBody = strip_tags(str_replace('<br>', "\r\n", $message)); // Fallback for non-HTML clients

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}
?>
