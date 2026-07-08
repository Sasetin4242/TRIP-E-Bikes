<?php
/**
 * Loyalty Endpoint: Handles loyalty points, rewards, redemptions, and referral codes
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Dynamically create tables if they don't exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `loyalty_points` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `customer_email` VARCHAR(255) NOT NULL,
          `points` INT NOT NULL DEFAULT 0,
          `action_type` VARCHAR(50) NOT NULL,
          `reason` VARCHAR(255) NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `loyalty_rewards` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `name` VARCHAR(100) NOT NULL,
          `description` VARCHAR(255) NULL,
          `points_cost` INT NOT NULL,
          `reward_type` VARCHAR(50) NOT NULL,
          `available` TINYINT(1) NOT NULL DEFAULT 1,
          `sort_order` INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `reward_redemptions` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `customer_email` VARCHAR(255) NOT NULL,
          `reward_id` INT UNSIGNED NOT NULL,
          `points_used` INT NOT NULL,
          `code` VARCHAR(100) NOT NULL,
          `status` VARCHAR(50) NOT NULL DEFAULT 'active',
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT `fk_redemptions_reward` FOREIGN KEY (`reward_id`) REFERENCES `loyalty_rewards` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `referral_codes` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `customer_email` VARCHAR(255) NOT NULL UNIQUE,
          `code` VARCHAR(50) NOT NULL UNIQUE,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Seed default rewards if empty
    $stmt = $pdo->query("SELECT id FROM loyalty_rewards LIMIT 1");
    if (!$stmt->fetch()) {
        $pdo->exec("
            INSERT INTO loyalty_rewards (name, description, points_cost, reward_type, available, sort_order) VALUES
            ('₱500 Off Accessories', 'Get ₱500 discount on helmets, locks, or bags.', 500, 'discount', 1, 1),
            ('Free Premium Tune-up', 'Get a complete professional tune-up at our service center.', 1000, 'service', 1, 2),
            ('₱2,000 Bike Discount', '₱2,000 discount on your next e-bike purchase.', 2000, 'discount', 1, 3),
            ('Free Battery Health Check', 'Full diagnostics test and capacity evaluation.', 300, 'service', 1, 0)
        ");
    }
} catch (\PDOException $e) {
    error_log("Failed to initialize loyalty tables: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();
$action = $_GET['action'] ?? $input['action'] ?? '';

if ($method === 'GET') {
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    if (empty($email)) {
        sendError('Customer email is required.');
    }
    
    // Get total points balance
    $pointsStmt = $pdo->prepare("SELECT SUM(points) as total FROM loyalty_points WHERE customer_email = ?");
    $pointsStmt->execute([$email]);
    $pointsRow = $pointsStmt->fetch();
    $pointsBalance = (int)($pointsRow['total'] ?? 0);
    
    // Get points history
    $historyStmt = $pdo->prepare("SELECT * FROM loyalty_points WHERE customer_email = ? ORDER BY created_at DESC");
    $historyStmt->execute([$email]);
    $pointsHistory = $historyStmt->fetchAll();
    
    // Get available rewards
    $rewardsStmt = $pdo->query("SELECT * FROM loyalty_rewards WHERE available = 1 ORDER BY sort_order");
    $rewards = $rewardsStmt->fetchAll();
    
    // Get customer redemptions
    $redemptionsStmt = $pdo->prepare("
        SELECT r.*, w.name as reward_name, w.reward_type 
        FROM reward_redemptions r
        JOIN loyalty_rewards w ON r.reward_id = w.id
        WHERE r.customer_email = ?
        ORDER BY r.created_at DESC
    ");
    $redemptionsStmt->execute([$email]);
    $redemptions = $redemptionsStmt->fetchAll();
    
    // Get referral code
    $referralStmt = $pdo->prepare("SELECT code FROM referral_codes WHERE customer_email = ? LIMIT 1");
    $referralStmt->execute([$email]);
    $referralRow = $referralStmt->fetch();
    $referralCode = $referralRow['code'] ?? null;
    
    sendSuccess('Loyalty data retrieved.', [
        'points_balance' => $pointsBalance,
        'points_history' => $pointsHistory,
        'rewards' => $rewards,
        'redemptions' => $redemptions,
        'referral_code' => $referralCode
    ]);
}

if ($method === 'POST') {
    if ($action === 'create_referral') {
        $email = trim($input['email'] ?? '');
        $code = trim($input['code'] ?? '');
        if (empty($email) || empty($code)) {
            sendError('Email and referral code are required.');
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO referral_codes (customer_email, code) VALUES (?, ?)");
            $stmt->execute([$email, $code]);
            sendSuccess('Referral code created.');
        } catch (\Exception $e) {
            sendError('Failed to save referral code: ' . $e->getMessage());
        }
    }
    
    if ($action === 'redeem_reward') {
        $email = trim($input['email'] ?? '');
        $rewardId = isset($input['reward_id']) ? (int)$input['reward_id'] : 0;
        $code = trim($input['code'] ?? '');
        
        if (empty($email) || $rewardId <= 0 || empty($code)) {
            sendError('Email, reward ID, and redemption code are required.');
        }
        
        // Find reward
        $rewardStmt = $pdo->prepare("SELECT * FROM loyalty_rewards WHERE id = ? LIMIT 1");
        $rewardStmt->execute([$rewardId]);
        $reward = $rewardStmt->fetch();
        if (!$reward) {
            sendError('Reward not found.');
        }
        
        // Verify points balance
        $pointsStmt = $pdo->prepare("SELECT SUM(points) as total FROM loyalty_points WHERE customer_email = ?");
        $pointsStmt->execute([$email]);
        $pointsRow = $pointsStmt->fetch();
        $pointsBalance = (int)($pointsRow['total'] ?? 0);
        
        $cost = (int)$reward['points_cost'];
        if ($pointsBalance < $cost) {
            sendError('Insufficient loyalty points.');
        }
        
        $pdo->beginTransaction();
        try {
            // Deduct points (insert negative points transaction)
            $deductStmt = $pdo->prepare("INSERT INTO loyalty_points (customer_email, points, action_type, reason) VALUES (?, ?, 'redeemed', ?)");
            $deductStmt->execute([$email, -$cost, "Redeemed: " . $reward['name']]);
            
            // Insert redemption
            $redeemStmt = $pdo->prepare("INSERT INTO reward_redemptions (customer_email, reward_id, points_used, code) VALUES (?, ?, ?, ?)");
            $redeemStmt->execute([$email, $rewardId, $cost, $code]);
            
            $pdo->commit();
            sendSuccess('Reward redeemed successfully.', ['code' => $code]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Redemption failed: ' . $e->getMessage());
        }
    }
}

sendError('Method not allowed or action not specified.', 405);
