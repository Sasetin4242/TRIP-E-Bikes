<?php
/**
 * Contact Form Endpoint: Replacement for contact-form edge function
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method !== 'POST') {
    sendError('Method not allowed.', 405);
}

$name = trim($input['name'] ?? '');
$email = trim($input['email'] ?? '');
$phone = trim($input['phone'] ?? '');
$inquiryType = trim($input['inquiry_type'] ?? '');
$message = trim($input['message'] ?? '');

if (empty($name) || empty($email) || empty($inquiryType) || empty($message)) {
    sendError('Name, email, inquiry type, and message are required.');
}

// Create table if not exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `contact_messages` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `name` VARCHAR(100) NOT NULL,
          `email` VARCHAR(255) NOT NULL,
          `phone` VARCHAR(50) NULL,
          `inquiry_type` VARCHAR(50) NOT NULL,
          `message` TEXT NOT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (\PDOException $e) {
    error_log("Failed to initialize contact_messages table: " . $e->getMessage());
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO contact_messages (name, email, phone, inquiry_type, message) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $email, $phone, $inquiryType, $message]);
    $messageId = $pdo->lastInsertId();
    
    sendSuccess('Inquiry submitted successfully.', ['message_id' => $messageId], 201);
} catch (\Exception $e) {
    sendError('Failed to save contact form submission: ' . $e->getMessage());
}
