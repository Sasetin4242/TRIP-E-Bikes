<?php
/**
 * Submit Quote Endpoint: Handles lead scoring and quotation creation (replacing submit-quote edge function)
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
$mobile = trim($input['mobile'] ?? '');
$company = trim($input['company'] ?? '');
$useType = trim($input['use_type'] ?? '');
$productInterest = trim($input['product_interest'] ?? '');
$quantity = isset($input['quantity']) ? (int)$input['quantity'] : 1;
$budget = trim($input['budget'] ?? '');
$contactMethod = trim($input['contact_method'] ?? '');
$notes = trim($input['notes'] ?? '');

if (empty($name) || empty($email) || empty($mobile) || empty($productInterest)) {
    sendError('Name, email, mobile phone, and product of interest are required.');
}

// Lead Scoring Logic
$score = 30; // base score
if ($quantity >= 10) {
    $score += 40;
} elseif ($quantity >= 5) {
    $score += 25;
} elseif ($quantity >= 2) {
    $score += 15;
}

if (!empty($company)) {
    $score += 15;
}

if (strpos(strtolower($budget), 'flexible') !== false || strpos(strtolower($budget), 'above') !== false) {
    $score += 15;
}

$score = min(100, $score);
$leadId = (int)date('Ymd') . rand(1000, 9999);

// Resolve product_id
$productId = null;
try {
    $prodStmt = $pdo->prepare("SELECT id FROM products_cms WHERE name LIKE ? LIMIT 1");
    $prodStmt->execute(["%$productInterest%"]);
    $prod = $prodStmt->fetch();
    if ($prod) {
        $productId = (int)$prod['id'];
    }
} catch (\Exception $e) {
    // Ignore and leave product_id null
}

// Insert into quotations table
$pdo->beginTransaction();
try {
    // Dynamically create leads table if not exists
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

    // Insert lead
    $leadStmt = $pdo->prepare("
        INSERT INTO leads (name, email, company, product_interest, quantity, score, status, source, notes, budget) 
        VALUES (?, ?, ?, ?, ?, ?, 'new', 'quote', ?, ?)
    ");
    $leadStmt->execute([$name, $email, $company, $productInterest, $quantity, $score, $notes, $budget]);
    $leadId = $pdo->lastInsertId();

    $customSpecs = [
        'company' => $company,
        'use_type' => $useType,
        'budget' => $budget,
        'contact_method' => $contactMethod,
        'quantity' => $quantity,
        'lead_score' => $score
    ];
    
    $stmt = $pdo->prepare("
        INSERT INTO quotations (customer_name, customer_email, customer_phone, product_id, notes, custom_specs, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([
        $name,
        $email,
        $mobile,
        $productId,
        $notes,
        json_encode($customSpecs)
    ]);
    $quotationId = $pdo->lastInsertId();
    $pdo->commit();
    
    sendSuccess('Quote submitted successfully.', [
        'lead_id' => $leadId,
        'score' => $score,
        'quotation_id' => $quotationId
    ], 201);
} catch (\Exception $e) {
    $pdo->rollBack();
    sendError('Failed to save quotation details: ' . $e->getMessage());
}
