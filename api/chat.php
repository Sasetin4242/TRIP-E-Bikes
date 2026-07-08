<?php
/**
 * Chat Endpoint: Polling-based Chat Room Retrieval and Message Insertion
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

try {
    $pdo->exec("ALTER TABLE `chat_messages` ADD COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0 AFTER `message`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `chat_sessions` ADD COLUMN `last_message_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `status`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `chat_sessions` ADD COLUMN `assigned_agent` VARCHAR(100) NULL AFTER `status`");
} catch (\PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();
$action = $_GET['action'] ?? $input['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'list_sessions') {
        // Admin Chat panel needs to list all active sessions
        $admin = requireAuth($pdo);
        
        $stmt = $pdo->query("
            SELECT s.*, 
                   s.user_name as customer_name,
                   s.user_email as customer_email,
                   (SELECT message FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                   (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id AND is_read = 0 AND sender = 'user') as unread_count
            FROM chat_sessions s
            ORDER BY last_message_time DESC, s.created_at DESC
        ");
        $sessions = $stmt->fetchAll();
        
        sendSuccess('Chat sessions retrieved.', ['sessions' => $sessions]);
    }
    
    // Retrieve messages for a single session
    $sessionId = isset($_GET['session_id']) ? trim($_GET['session_id']) : '';
    if (empty($sessionId)) {
        sendError('Session ID is required.');
    }
    
    // Check if session exists, create if not (for user convenience)
    $stmt = $pdo->prepare("SELECT * FROM chat_sessions WHERE id = ? LIMIT 1");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    
    if (!$session) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt = $pdo->prepare("INSERT INTO chat_sessions (id, ip_address, status) VALUES (?, ?, 'active')");
        $stmt->execute([$sessionId, $ip]);
    }
    
    // Fetch messages
    $stmt = $pdo->prepare("SELECT id, session_id, sender as sender_type, message, is_read as `read`, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC");
    $stmt->execute([$sessionId]);
    $messages = $stmt->fetchAll();
    
    sendSuccess('Messages retrieved.', [
        'session_id' => $sessionId,
        'messages' => $messages
    ]);
}

if ($method === 'POST') {
    if ($action === 'create_session') {
        $sessionId = trim($input['session_id'] ?? bin2hex(random_bytes(16)));
        $name = trim($input['user_name'] ?? '');
        $email = trim($input['user_email'] ?? '');
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO chat_sessions (id, user_name, user_email, ip_address, status) VALUES (?, ?, ?, ?, 'active')");
            $stmt->execute([$sessionId, $name, $email, $ip]);
            
            $pdo->commit();
            sendSuccess('Chat session created.', ['session_id' => $sessionId], 201);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to create session: ' . $e->getMessage());
        }
    }
    
    if ($action === 'read') {
        $sessionId = trim($input['session_id'] ?? '');
        if (empty($sessionId)) {
            sendError('Session ID is required.');
        }
        $stmt = $pdo->prepare("UPDATE chat_messages SET is_read = 1 WHERE session_id = ?");
        $stmt->execute([$sessionId]);
        sendSuccess('Messages marked as read.');
    }
    
    // Insert new message
    $sessionId = trim($input['session_id'] ?? '');
    $sender = trim($input['sender'] ?? ''); // 'user', 'agent', 'bot'
    $message = trim($input['message'] ?? '');
    
    if (empty($sessionId) || empty($sender) || empty($message)) {
        sendError('Session ID, sender, and message are required.');
    }
    
    if (!in_array($sender, ['user', 'agent', 'bot'])) {
        sendError('Invalid sender. Must be user, agent, or bot.');
    }
    
    // If agent is sending, require admin auth
    if ($sender === 'agent') {
        try {
            $admin = requireAuth($pdo);
        } catch (\Exception $e) {
            sendError('Unauthorized. Only admins can reply as agent.', 401);
        }
    }
    
    $pdo->beginTransaction();
    try {
        // Ensure session exists
        $stmt = $pdo->prepare("SELECT * FROM chat_sessions WHERE id = ? LIMIT 1");
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch();
        
        if (!$session) {
            // Auto create session if doesn't exist
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $stmt = $pdo->prepare("INSERT INTO chat_sessions (id, ip_address, status) VALUES (?, ?, 'active')");
            $stmt->execute([$sessionId, $ip]);
        }
        
        // Insert message
        $stmt = $pdo->prepare("INSERT INTO chat_messages (session_id, sender, message) VALUES (?, ?, ?)");
        $stmt->execute([$sessionId, $sender, $message]);
        $messageId = $pdo->lastInsertId();
        
        $pdo->commit();
        sendSuccess('Message sent successfully.', ['message_id' => $messageId], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        sendError('Failed to insert message: ' . $e->getMessage());
    }
}

if ($method === 'PUT' || $method === 'PATCH') {
    $admin = requireAuth($pdo);
    $sessionId = isset($_GET['id']) ? trim($_GET['id']) : (isset($input['id']) ? trim($input['id']) : '');
    if (empty($sessionId)) {
        sendError('Session ID is required.');
    }
    
    $allowedFields = ['status', 'assigned_agent'];
    $updates = [];
    $params = [];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "`$field` = ?";
            $params[] = $input[$field];
        }
    }
    
    if (empty($updates)) {
        sendError('No update fields provided.');
    }
    
    $params[] = $sessionId;
    try {
        $stmt = $pdo->prepare("UPDATE chat_sessions SET " . implode(", ", $updates) . " WHERE id = ?");
        $stmt->execute($params);
        sendSuccess('Chat session updated.');
    } catch (\Exception $e) {
        sendError('Failed to update session: ' . $e->getMessage());
    }
}

sendError('Method not allowed.', 405);
