<?php
/**
 * Notifications Endpoint: CRUD operations for customer_notifications
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Dynamically create table if not exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `customer_notifications` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `customer_email` VARCHAR(255) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `message` TEXT NOT NULL,
          `is_read` TINYINT(1) NOT NULL DEFAULT 0,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX `idx_notifications_email` (`customer_email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (\PDOException $e) {
    error_log("Failed to initialize notifications table: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method === 'GET') {
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    if (empty($email)) {
        sendError('Customer email is required.');
    }
    
    $stmt = $pdo->prepare("SELECT id, customer_email, title, message, is_read as `read`, created_at FROM customer_notifications WHERE customer_email = ? ORDER BY created_at DESC");
    $stmt->execute([$email]);
    $notifications = $stmt->fetchAll();
    
    foreach ($notifications as &$n) {
        $n['id'] = (string)$n['id'];
        $n['read'] = ($n['read'] === 1 || $n['read'] === '1' || $n['read'] === true);
    }
    
    sendSuccess('Notifications retrieved.', $notifications);
}

if ($method === 'POST') {
    // Action to mark all as read or create a notification
    $action = $_GET['action'] ?? $input['action'] ?? '';
    
    if ($action === 'mark_all_read') {
        $email = trim($input['email'] ?? '');
        if (empty($email)) {
            sendError('Customer email is required.');
        }
        $stmt = $pdo->prepare("UPDATE customer_notifications SET is_read = 1 WHERE customer_email = ?");
        $stmt->execute([$email]);
        sendSuccess('All notifications marked as read.');
    }
    
    // Default POST: Insert new notification
    $email = trim($input['email'] ?? '');
    $title = trim($input['title'] ?? '');
    $message = trim($input['message'] ?? '');
    
    if (empty($email) || empty($title) || empty($message)) {
        sendError('Email, title, and message are required.');
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO customer_notifications (customer_email, title, message) VALUES (?, ?, ?)");
        $stmt->execute([$email, $title, $message]);
        $notificationId = $pdo->lastInsertId();
        sendSuccess('Notification created successfully.', ['notification_id' => $notificationId], 201);
    } catch (\Exception $e) {
        sendError('Failed to create notification: ' . $e->getMessage());
    }
}

if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    if ($id <= 0) {
        sendError('Valid Notification ID is required.');
    }
    
    $read = $input['read'] ?? null;
    if ($read === null) {
        sendError('Read status is required.');
    }
    
    $isReadVal = ($read === true || $read === 'true' || $read === 1 || $read === '1') ? 1 : 0;
    
    try {
        $stmt = $pdo->prepare("UPDATE customer_notifications SET is_read = ? WHERE id = ?");
        $stmt->execute([$isReadVal, $id]);
        sendSuccess('Notification updated successfully.');
    } catch (\Exception $e) {
        sendError('Failed to update notification: ' . $e->getMessage());
    }
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    if ($id <= 0) {
        sendError('Valid Notification ID is required.');
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM customer_notifications WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess('Notification deleted successfully.');
    } catch (\Exception $e) {
        sendError('Failed to delete notification: ' . $e->getMessage());
    }
}

sendError('Method not allowed or action not specified.', 405);
