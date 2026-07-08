<?php
/**
 * System Settings Endpoint: Reading and updating platform feature toggles
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Seed default settings if they don't exist
try {
    $defaults = [
        ['loyalty_program_enabled', 'true', 'Loyalty Rewards Program', 'Enable points earning, dynamic rewards tier estimation, and custom checkouts.'],
        ['chat_enabled', 'true', 'Live Chat Support', 'Activate live-chat widget and support portal for quick queries.'],
        ['reviews_enabled', 'true', 'Product Reviews & Ratings', 'Allow public reviewers to leave feedback and ratings.'],
        ['referral_enabled', 'false', 'Referral System', 'Enable user-to-user referral programs and discounts.']
    ];
    
    foreach ($defaults as $d) {
        $stmt = $pdo->prepare("SELECT setting_key FROM system_settings WHERE setting_key = ? LIMIT 1");
        $stmt->execute([$d[0]]);
        if (!$stmt->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)");
            $stmt->execute([$d[0], $d[1], $d[3]]);
        }
    }
} catch (\PDOException $e) {
    error_log("Failed to seed default settings: " . $e->getMessage());
}

// Dynamically add label if not exists
try {
    $pdo->exec("ALTER TABLE `system_settings` ADD COLUMN `label` VARCHAR(100) NULL AFTER `setting_key`");
    // Update labels for existing keys
    $pdo->prepare("UPDATE system_settings SET label = 'Loyalty Rewards Program' WHERE setting_key = 'loyalty_program_enabled'")->execute();
    $pdo->prepare("UPDATE system_settings SET label = 'Live Chat Support' WHERE setting_key = 'chat_enabled'")->execute();
    $pdo->prepare("UPDATE system_settings SET label = 'Product Reviews & Ratings' WHERE setting_key = 'reviews_enabled'")->execute();
    $pdo->prepare("UPDATE system_settings SET label = 'Referral System' WHERE setting_key = 'referral_enabled'")->execute();
} catch (\PDOException $e) {}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method === 'GET') {
    // Both admin and public can read settings (e.g. to hide/show features in UI)
    $stmt = $pdo->query("SELECT setting_key as `key`, setting_value as `value`, label, description FROM system_settings ORDER BY setting_key");
    $settings = $stmt->fetchAll();
    
    // Convert string 'true'/'false' to boolean
    foreach ($settings as &$s) {
        $s['value'] = ($s['value'] === 'true' || $s['value'] === '1' || $s['value'] === true);
    }
    
    sendSuccess('Settings retrieved.', $settings);
}

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    // Requires admin auth
    $admin = requireAuth($pdo);
    
    $key = trim($input['key'] ?? $_GET['key'] ?? '');
    $value = $input['value'] ?? null;
    
    if (empty($key) || $value === null) {
        sendError('Setting key and value are required.');
    }
    
    $strValue = ($value === true || $value === 'true' || $value === '1' || $value === 1) ? 'true' : 'false';
    
    try {
        $stmt = $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?");
        $stmt->execute([$strValue, $key]);
        
        sendSuccess('Setting updated successfully.');
    } catch (\Exception $e) {
        sendError('Failed to update setting: ' . $e->getMessage());
    }
}

sendError('Method not allowed or action not specified.', 405);
