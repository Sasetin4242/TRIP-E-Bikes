<?php
/**
 * Analytics Endpoint: Fetches statistical overview of leads, quotations, service appointments, product reviews, and loyalty points.
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$admin = requireAuth($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    // 1. Fetch leads
    // Ensure table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `leads` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `product_interest` VARCHAR(255) NULL,
          `score` INT NOT NULL DEFAULT 0,
          `status` VARCHAR(50) NOT NULL DEFAULT 'new',
          `source` VARCHAR(50) NOT NULL DEFAULT 'web',
          `notes` TEXT NULL,
          `company` VARCHAR(255) NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $leadsStmt = $pdo->query("SELECT id, product_interest, score, status, source, notes, company, created_at FROM leads ORDER BY created_at DESC");
    $leads = $leadsStmt->fetchAll();
    
    // 2. Fetch quotations
    $quotStmt = $pdo->query("
        SELECT q.status, q.quoted_price as estimated_price, q.created_at, p.name as product_name 
        FROM quotations q 
        LEFT JOIN products_cms p ON q.product_id = p.id 
        ORDER BY q.created_at ASC
    ");
    $quotations = $quotStmt->fetchAll();
    
    // 3. Fetch service appointments
    $serviceStmt = $pdo->query("SELECT service_center, status, created_at FROM service_appointments");
    $appointments = $serviceStmt->fetchAll();
    
    // 4. Fetch product reviews
    $reviewStmt = $pdo->query("SELECT rating, product_id, created_at FROM product_reviews");
    $reviews = $reviewStmt->fetchAll();
    
    // 5. Fetch loyalty points
    // Ensure table exists
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
    $loyaltyStmt = $pdo->query("SELECT points, action_type, customer_email as customer_id FROM loyalty_points");
    $loyaltyPoints = $loyaltyStmt->fetchAll();
    
    sendSuccess('Analytics data retrieved.', [
        'leads' => $leads,
        'quotations' => $quotations,
        'service_appointments' => $appointments,
        'product_reviews' => $reviews,
        'loyalty_points' => $loyaltyPoints
    ]);
} catch (\Exception $e) {
    sendError('Failed to fetch analytics: ' . $e->getMessage());
}
