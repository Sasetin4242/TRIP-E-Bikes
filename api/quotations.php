<?php
/**
 * Quotations Endpoint: Reading, Creating, and Updating Quotation Statuses
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method === 'GET') {
    // Requires authentication to see list, or filters by customer email (could be a public customer portal check)
    $isAdmin = false;
    try {
        $user = requireAuth($pdo);
        $isAdmin = true;
    } catch (\Exception $e) {
        // Not admin
    }
    
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id > 0) {
        // Single quotation details
        $stmt = $pdo->prepare("SELECT q.*, p.name as product_name, p.slug as product_slug FROM quotations q LEFT JOIN products_cms p ON q.product_id = p.id WHERE q.id = ?");
        $stmt->execute([$id]);
        $quotation = $stmt->fetch();
        
        if (!$quotation) {
            sendError('Quotation not found.', 404);
        }
        
        // If not admin, verify it matches customer email
        if (!$isAdmin && $quotation['customer_email'] !== $email) {
            sendError('Unauthorized.', 403);
        }
        
        sendSuccess('Quotation details retrieved.', ['quotation' => $quotation]);
    }
    
    // Listing quotations
    if ($isAdmin) {
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $sql = "SELECT q.*, p.name as product_name FROM quotations q LEFT JOIN products_cms p ON q.product_id = p.id";
        $params = [];
        
        if (!empty($status)) {
            $sql .= " WHERE q.status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY q.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $quotations = $stmt->fetchAll();
        
        sendSuccess('Quotations retrieved.', ['quotations' => $quotations]);
    } elseif (!empty($email)) {
        // Customer view of their own quotes
        $stmt = $pdo->prepare("SELECT q.*, p.name as product_name FROM quotations q LEFT JOIN products_cms p ON q.product_id = p.id WHERE q.customer_email = ? ORDER BY q.id DESC");
        $stmt->execute([$email]);
        $quotations = $stmt->fetchAll();
        
        sendSuccess('Customer quotations retrieved.', ['quotations' => $quotations]);
    } else {
        sendError('Unauthorized access.', 401);
    }
}

if ($method === 'POST') {
    // Public route to submit a quotation request
    $name = trim($input['customer_name'] ?? '');
    $email = trim($input['customer_email'] ?? '');
    $phone = trim($input['customer_phone'] ?? '');
    $productId = isset($input['product_id']) ? (int)$input['product_id'] : null;
    $notes = trim($input['notes'] ?? '');
    $customSpecs = isset($input['custom_specs']) ? json_encode($input['custom_specs']) : null;
    $quotedPrice = isset($input['quoted_price']) && $input['quoted_price'] !== '' ? (float)$input['quoted_price'] : null;
    
    if (empty($name) || empty($email)) {
        sendError('Customer name and email are required.');
    }
    
    $pdo->beginTransaction();
    try {
        if ($productId !== null) {
            $checkStmt = $pdo->prepare("SELECT id FROM products_cms WHERE id = ?");
            $checkStmt->execute([$productId]);
            if (!$checkStmt->fetch()) {
                throw new \Exception('Product does not exist.');
            }
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO quotations (customer_name, customer_email, customer_phone, product_id, notes, custom_specs, quoted_price, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$name, $email, $phone, $productId, $notes, $customSpecs, $quotedPrice]);
        $quotationId = $pdo->lastInsertId();
        
        $pdo->commit();
        sendSuccess('Quotation request created successfully.', ['quotation_id' => $quotationId], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        sendError('Failed to create quotation: ' . $e->getMessage());
    }
}

try {
    $pdo->exec("ALTER TABLE `quotations` ADD COLUMN `valid_until` DATE NULL AFTER `status`");
} catch (\PDOException $e) {}

if ($method === 'PUT' || $method === 'PATCH') {
    // Requires admin authorization to update quotation statuses
    $admin = requireAuth($pdo);
    
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    
    if ($id <= 0) {
        sendError('Valid Quotation ID is required for updating.');
    }
    
    $pdo->beginTransaction();
    try {
        // Check quotation exists
        $checkStmt = $pdo->prepare("SELECT * FROM quotations WHERE id = ?");
        $checkStmt->execute([$id]);
        $quotation = $checkStmt->fetch();
        if (!$quotation) {
            throw new \Exception('Quotation not found.');
        }
        
        // Allowed update fields
        $fields = ['status', 'quoted_price', 'notes', 'custom_specs', 'valid_until'];
        $updates = [];
        $params = [];
        
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                $updates[] = "`$field` = ?";
                if ($field === 'custom_specs') {
                    $params[] = $input[$field] !== null ? json_encode($input[$field]) : null;
                } elseif ($field === 'quoted_price') {
                    $params[] = $input[$field] !== '' && $input[$field] !== null ? (float)$input[$field] : null;
                } else {
                    $params[] = $input[$field];
                }
            }
        }
        
        if (empty($updates)) {
            throw new \Exception('No fields provided to update.');
        }
        
        $params[] = $id;
        $sql = "UPDATE quotations SET " . implode(", ", $updates) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // If status changed to approved/completed, award loyalty points
        $newStatus = $input['status'] ?? $quotation['status'];
        $oldStatus = $quotation['status'];
        if (($newStatus === 'approved' || $newStatus === 'completed') && $oldStatus !== 'approved' && $oldStatus !== 'completed') {
            $customerEmail = $quotation['customer_email'];
            $quotedPriceVal = isset($input['quoted_price']) ? (float)$input['quoted_price'] : ($quotation['quoted_price'] !== null ? (float)$quotation['quoted_price'] : 0.0);
            $points = $quotedPriceVal > 0 ? (int)($quotedPriceVal / 100) : 500;
            
            // Earn points
            $pointsStmt = $pdo->prepare("INSERT INTO loyalty_points (customer_email, points, action_type, reason) VALUES (?, ?, 'earned', ?)");
            $pointsStmt->execute([$customerEmail, $points, "Completed purchase/quotation: #" . $id]);
        }
        
        $pdo->commit();
        sendSuccess('Quotation updated successfully.');
    } catch (\Exception $e) {
        $pdo->rollBack();
        sendError('Failed to update quotation: ' . $e->getMessage());
    }
}

sendError('Method not allowed.', 405);
