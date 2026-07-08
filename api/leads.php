<?php
/**
 * Leads Endpoint: CRUD for leads
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$admin = requireAuth($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

// Make sure table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `leads` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `name` VARCHAR(100) NULL,
          `email` VARCHAR(255) NULL,
          `company` VARCHAR(255) NULL,
          `product_interest` VARCHAR(255) NULL,
          `quantity` INT NOT NULL DEFAULT 1,
          `score` INT NOT NULL DEFAULT 0,
          `status` VARCHAR(50) NOT NULL DEFAULT 'new',
          `source` VARCHAR(50) NOT NULL DEFAULT 'web',
          `notes` TEXT NULL,
          `budget` VARCHAR(100) NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (\PDOException $e) {
    error_log("Failed to initialize leads table: " . $e->getMessage());
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = $pdo->prepare("SELECT * FROM leads WHERE id = ?");
        $stmt->execute([$id]);
        $lead = $stmt->fetch();
        if (!$lead) {
            sendError('Lead not found.', 404);
        }
        sendSuccess('Lead details retrieved.', $lead);
    } else {
        $stmt = $pdo->query("SELECT * FROM leads ORDER BY created_at DESC");
        $leads = $stmt->fetchAll();
        sendSuccess('Leads retrieved.', $leads);
    }
}

if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    if ($id <= 0) {
        sendError('Valid Lead ID is required.');
    }
    
    $allowedFields = ['status', 'score', 'notes', 'company', 'name', 'email', 'product_interest', 'quantity', 'budget'];
    $updates = [];
    $params = [];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "`$field` = ?";
            $params[] = $input[$field];
        }
    }
    
    if (empty($updates)) {
        sendError('No fields specified for update.');
    }
    
    $params[] = $id;
    try {
        $stmt = $pdo->prepare("UPDATE leads SET " . implode(", ", $updates) . " WHERE id = ?");
        $stmt->execute($params);
        sendSuccess('Lead updated successfully.');
    } catch (\Exception $e) {
        sendError('Failed to update lead: ' . $e->getMessage());
    }
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    if ($id <= 0) {
        sendError('Valid Lead ID is required.');
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM leads WHERE id = ?");
        $stmt->execute([$id]);
        sendSuccess('Lead deleted successfully.');
    } catch (\Exception $e) {
        sendError('Failed to delete lead: ' . $e->getMessage());
    }
}

sendError('Method not allowed.', 405);
