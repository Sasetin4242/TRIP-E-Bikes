<?php
/**
 * Shared API Helper Functions and CORS Configuration
 */

declare(strict_types=1);

// Handle CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Ensure required auth tables exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `email` VARCHAR(255) NOT NULL UNIQUE,
          `password_hash` VARCHAR(255) NULL,
          `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
          `username` VARCHAR(100) NULL,
          `avatar` VARCHAR(255) NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `otp_verifications` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `email` VARCHAR(255) NOT NULL,
          `otp_code` VARCHAR(10) NOT NULL,
          `expires_at` TIMESTAMP NOT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_sessions` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `user_id` INT UNSIGNED NOT NULL,
          `token` VARCHAR(255) NOT NULL UNIQUE,
          `expires_at` TIMESTAMP NOT NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (\PDOException $e) {
    error_log("Failed to initialize auth tables: " . $e->getMessage());
}

/**
 * Send JSON response
 */
function sendJSON(array $data, int $statusCode = 200): void {
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/**
 * Send standard error response
 */
function sendError(string $message, int $statusCode = 400, array $extra = []): void {
    sendJSON(array_merge([
        'status' => 'error',
        'message' => $message
    ], $extra), $statusCode);
}

/**
 * Send standard success response
 */
function sendSuccess(string $message, array $data = [], int $statusCode = 200): void {
    sendJSON(array_merge([
        'status' => 'success',
        'message' => $message
    ], $data), $statusCode);
}

/**
 * Parse and return the JSON request body
 */
function getJSONInput(): array {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        return [];
    }
    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Require Admin authentication and return the authenticated user record
 */
function requireAuth(PDO $pdo): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader)) {
        $authHeader = $_GET['token'] ?? '';
    }
    
    if (empty($authHeader)) {
        sendError('Unauthorized. Authorization header is missing.', 401);
    }
    
    $token = $authHeader;
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    }
    
    $stmt = $pdo->prepare("
        SELECT u.*, s.token, s.expires_at 
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP()
        LIMIT 1
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendError('Unauthorized or session expired.', 401);
    }
    
    return $user;
}
