<?php
/**
 * Contact Messages Endpoint: CRUD operations for contact_messages
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Dynamically add columns if needed
try {
    $pdo->exec("ALTER TABLE `contact_messages` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'unread' AFTER `message`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `contact_messages` ADD COLUMN `inquiry_type` VARCHAR(100) NOT NULL DEFAULT 'General' AFTER `status`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `contact_messages` ADD COLUMN `internal_notes` TEXT NULL AFTER `inquiry_type`");
} catch (\PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method === 'GET') {
    // Requires admin auth
    $admin = requireAuth($pdo);
    
    $stmt = $pdo->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
    $messages = $stmt->fetchAll();
    
    sendSuccess('Contact messages retrieved.', $messages);
}

if ($method === 'POST') {
    // Public endpoint to submit a contact message
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? null);
    $inquiryType = trim($input['inquiry_type'] ?? 'General');
    $message = trim($input['message'] ?? '');
    
    if (empty($name) || empty($email) || empty($message)) {
        sendError('Name, email, and message are required.');
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO contact_messages (name, email, phone, inquiry_type, message, status) 
            VALUES (?, ?, ?, ?, ?, 'unread')
        ");
        $stmt->execute([$name, $email, $phone, $inquiryType, $message]);
        $messageId = $pdo->lastInsertId();
        
        sendSuccess('Message submitted successfully.', ['message_id' => $messageId], 201);
    } catch (\Exception $e) {
        sendError('Failed to submit message: ' . $e->getMessage());
    }
}

if ($method === 'PUT' || $method === 'PATCH') {
    // Requires admin auth
    $admin = requireAuth($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    
    if ($id <= 0) {
        sendError('Valid Message ID is required.');
    }
    
    try {
        $updates = [];
        $params = [];
        
        if (isset($input['status'])) {
            $updates[] = "`status` = ?";
            $params[] = $input['status'];
        }
        if (isset($input['internal_notes'])) {
            $updates[] = "`internal_notes` = ?";
            $params[] = $input['internal_notes'];
        }
        
        if (empty($updates)) {
            sendError('No fields specified for update.');
        }
        
        $params[] = $id;
        $sql = "UPDATE contact_messages SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendSuccess('Message updated successfully.');
    } catch (\Exception $e) {
        sendError('Failed to update message: ' . $e->getMessage());
    }
}

if ($method === 'DELETE') {
    // Requires admin auth
    $admin = requireAuth($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    
    if ($id <= 0) {
        sendError('Valid Message ID is required.');
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM contact_messages WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess('Message deleted successfully.');
    } catch (\Exception $e) {
        sendError('Failed to delete message: ' . $e->getMessage());
    }
}

sendError('Method not allowed or action not specified.', 405);
