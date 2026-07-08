<?php
/**
 * Secure PDO MySQL Database Connection Wrapper
 * TRIP E-Bikes App
 */

declare(strict_types=1);

// Set security headers (optional but recommended for API files)
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
}

// Retrieve DB configuration from environment variables or fallback to a configuration file
$host     = getenv('DB_HOST') ?: '127.0.0.1';
$dbname   = getenv('DB_NAME') ?: 'trip_ebikes_db';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';
$charset  = 'utf8mb4';

// Check for config file path if local configuration is used instead of system environments
$configPath = __DIR__ . '/../../config.php';
if (file_exists($configPath)) {
    $config = require $configPath;
    if (is_array($config)) {
        $host     = $config['DB_HOST'] ?? $host;
        $dbname   = $config['DB_NAME'] ?? $dbname;
        $username = $config['DB_USER'] ?? $username;
        $password = $config['DB_PASS'] ?? $password;
    }
}

// Connection DSN (Data Source Name)
$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

// Strict configuration options for secure and reliable production PDO instance
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // True prepared statements for security against SQL Injection
];

try {
    // Instantiate PDO
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // The connection is successfully established. $pdo can be imported inside API endpoints.
} catch (\PDOException $e) {
    // Write error to server logs securely. Do NOT expose detailed connection error info to client.
    error_log("Database Connection Failure: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed. Please check configuration.'
    ]);
    exit;
}
