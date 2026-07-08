<?php
/**
 * Products Endpoint: CRUD for Products CMS, Product Reviews, Admin Moderation Replies
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Dynamically add admin_reply column to product_reviews if not exists
try {
    $pdo->exec("ALTER TABLE `product_reviews` ADD COLUMN `admin_reply` TEXT NULL AFTER `review_text`");
} catch (\PDOException $e) {
    // Column already exists, ignore
}
try {
    $pdo->exec("ALTER TABLE `product_reviews` ADD COLUMN `helpful_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `review_text`");
} catch (\PDOException $e) {
    // Column already exists, ignore
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();
$action = $_GET['action'] ?? $input['action'] ?? '';

// --- REVIEWS & MODERATION SUB-API ---
if ($action === 'reviews') {
    if ($method === 'GET') {
        $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
        if ($productId <= 0) {
            sendError('Valid Product ID is required.');
        }
        
        // Public reviews only show 'approved' reviews. Admin can see all.
        $isAdmin = false;
        try {
            $user = requireAuth($pdo);
            $isAdmin = true;
        } catch (\Exception $e) {
            // Not admin
        }
        
        $sql = "SELECT * FROM product_reviews WHERE product_id = ?";
        if (!$isAdmin) {
            $sql .= " AND status = 'approved'";
        }
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$productId]);
        $reviews = $stmt->fetchAll();
        
        sendSuccess('Reviews retrieved.', ['reviews' => $reviews]);
    }
    
    if ($method === 'POST') {
        $productId = isset($input['product_id']) ? (int)$input['product_id'] : 0;
        $name = trim($input['reviewer_name'] ?? '');
        $email = trim($input['reviewer_email'] ?? '');
        $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
        $text = trim($input['review_text'] ?? '');
        
        if ($productId <= 0 || empty($name) || empty($email) || $rating < 1 || $rating > 5 || empty($text)) {
            sendError('Invalid review data. Product ID, reviewer name, email, rating (1-5), and review text are required.');
        }
        
        $pdo->beginTransaction();
        try {
            // Verify product exists
            $checkStmt = $pdo->prepare("SELECT id FROM products_cms WHERE id = ?");
            $checkStmt->execute([$productId]);
            if (!$checkStmt->fetch()) {
                throw new \Exception('Product does not exist.');
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO product_reviews (product_id, reviewer_name, reviewer_email, rating, review_text, status) 
                VALUES (?, ?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([$productId, $name, $email, $rating, $text]);
            $reviewId = $pdo->lastInsertId();
            
            $pdo->commit();
            sendSuccess('Review submitted successfully and is pending approval.', ['review_id' => $reviewId], 201);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to submit review: ' . $e->getMessage());
        }
    }
    
    if ($method === 'PUT' || $method === 'PATCH') {
        $reviewId = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        if ($reviewId <= 0) {
            sendError('Valid Review ID is required.');
        }
        
        try {
            $updates = [];
            $params = [];
            
            if (isset($input['rating'])) {
                $updates[] = "`rating` = ?";
                $params[] = (int)$input['rating'];
            }
            if (isset($input['review_text'])) {
                $updates[] = "`review_text` = ?";
                $params[] = trim($input['review_text']);
            }
            if (isset($input['helpful_count'])) {
                $updates[] = "`helpful_count` = ?";
                $params[] = (int)$input['helpful_count'];
            }
            
            if (empty($updates)) {
                sendError('No fields specified for update.');
            }
            
            $params[] = $reviewId;
            $sql = "UPDATE product_reviews SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            sendSuccess('Review updated successfully.');
        } catch (\Exception $e) {
            sendError('Failed to update review: ' . $e->getMessage());
        }
    }
}

if ($action === 'review_moderation') {
    // Requires Admin authentication
    $admin = requireAuth($pdo);
    
    if ($method === 'GET') {
        $stmt = $pdo->query("
            SELECT r.*, r.status as moderation_status, r.reviewer_name as username, p.name as product_name 
            FROM product_reviews r 
            LEFT JOIN products_cms p ON r.product_id = p.id 
            ORDER BY r.created_at DESC
        ");
        $reviews = $stmt->fetchAll();
        sendSuccess('Reviews list retrieved.', ['reviews' => $reviews]);
    }
    
    if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
        $reviewId = isset($input['review_id']) ? (int)$input['review_id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
        $status = trim($input['status'] ?? $input['moderation_status'] ?? '');
        $adminReply = isset($input['admin_reply']) ? trim($input['admin_reply']) : null;
        
        if ($reviewId <= 0) {
            sendError('Valid Review ID is required.');
        }
        
        $pdo->beginTransaction();
        try {
            // Check review exists
            $checkStmt = $pdo->prepare("SELECT id FROM product_reviews WHERE id = ?");
            $checkStmt->execute([$reviewId]);
            if (!$checkStmt->fetch()) {
                throw new \Exception('Review does not exist.');
            }
            
            // Build dynamic update
            $updates = [];
            $params = [];
            
            if (in_array($status, ['approved', 'rejected', 'pending'])) {
                $updates[] = "`status` = ?";
                $params[] = $status;
            }
            
            if ($adminReply !== null) {
                $updates[] = "`admin_reply` = ?";
                $params[] = $adminReply;
            }
            
            if (empty($updates)) {
                throw new \Exception('No moderation action specified (status or admin_reply).');
            }
            
            $params[] = $reviewId;
            $sql = "UPDATE product_reviews SET " . implode(", ", $updates) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $pdo->commit();
            sendSuccess('Review moderated successfully.');
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to moderate review: ' . $e->getMessage());
        }
    }
    
    if ($method === 'DELETE') {
        $reviewId = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        if ($reviewId <= 0) {
            sendError('Valid Review ID is required for deletion.');
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM product_reviews WHERE id = ?");
            $stmt->execute([$reviewId]);
            sendSuccess('Review deleted successfully.');
        } catch (\Exception $e) {
            sendError('Failed to delete review: ' . $e->getMessage());
        }
    }
}

// --- PRODUCTS CRUD SUB-API ---
if (empty($action)) {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
        
        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT * FROM products_cms WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            
            if (!$product) {
                sendError('Product not found.', 404);
            }
            
            sendSuccess('Product retrieved.', ['product' => $product]);
        }
        
        if (!empty($slug)) {
            $stmt = $pdo->prepare("SELECT * FROM products_cms WHERE slug = ?");
            $stmt->execute([$slug]);
            $product = $stmt->fetch();
            
            if (!$product) {
                sendError('Product not found.', 404);
            }
            
            sendSuccess('Product retrieved.', ['product' => $product]);
        }
        
        // List products
        $isAdmin = false;
        try {
            $user = requireAuth($pdo);
            $isAdmin = true;
        } catch (\Exception $e) {
            // Public user
        }
        
        $sql = "SELECT * FROM products_cms";
        if (!$isAdmin) {
            $sql .= " WHERE status = 'published'";
        }
        $sql .= " ORDER BY id DESC";
        
        $stmt = $pdo->query($sql);
        $products = $stmt->fetchAll();
        
        sendSuccess('Products list retrieved.', ['products' => $products]);
    }
    
    if ($method === 'POST') {
        $admin = requireAuth($pdo);
        
        $name = trim($input['name'] ?? '');
        $slug = trim($input['slug'] ?? '');
        $description = trim($input['description'] ?? '');
        $price = isset($input['price']) ? (float)$input['price'] : 0.0;
        $salePrice = isset($input['sale_price']) && $input['sale_price'] !== '' ? (float)$input['sale_price'] : null;
        $imageUrl = trim($input['image_url'] ?? '');
        $category = trim($input['category'] ?? 'E-Bike');
        $stock = isset($input['stock']) ? (int)$input['stock'] : 0;
        $specs = isset($input['specs']) ? json_encode($input['specs']) : null;
        $status = trim($input['status'] ?? 'draft');
        
        if (empty($name) || empty($slug) || $price <= 0) {
            sendError('Product name, unique slug, and price are required.');
        }
        
        $pdo->beginTransaction();
        try {
            // Check slug unique
            $slugCheck = $pdo->prepare("SELECT id FROM products_cms WHERE slug = ?");
            $slugCheck->execute([$slug]);
            if ($slugCheck->fetch()) {
                throw new \Exception('Product slug must be unique.');
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO products_cms (name, slug, description, price, sale_price, image_url, category, stock, specs, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $slug, $description, $price, $salePrice, $imageUrl, $category, $stock, $specs, $status]);
            $productId = $pdo->lastInsertId();
            
            $pdo->commit();
            sendSuccess('Product created successfully.', ['product_id' => $productId], 201);
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to create product: ' . $e->getMessage());
        }
    }
    
    if ($method === 'PUT' || $method === 'PATCH') {
        $admin = requireAuth($pdo);
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        
        if ($id <= 0) {
            sendError('Valid Product ID is required for updating.');
        }
        
        $pdo->beginTransaction();
        try {
            // Verify product exists
            $checkStmt = $pdo->prepare("SELECT * FROM products_cms WHERE id = ?");
            $checkStmt->execute([$id]);
            $product = $checkStmt->fetch();
            if (!$product) {
                throw new \Exception('Product not found.');
            }
            
            // Build dynamic update
            $fields = [
                'name', 'slug', 'description', 'price', 'sale_price', 
                'image_url', 'category', 'stock', 'specs', 'status'
            ];
            
            $updates = [];
            $params = [];
            
            foreach ($fields as $field) {
                if (array_key_exists($field, $input)) {
                    if ($field === 'specs') {
                        $updates[] = "`$field` = ?";
                        $params[] = $input[$field] !== null ? json_encode($input[$field]) : null;
                    } elseif ($field === 'price' || $field === 'sale_price' || $field === 'stock') {
                        $updates[] = "`$field` = ?";
                        $params[] = $input[$field] !== '' && $input[$field] !== null ? $input[$field] : null;
                    } else {
                        $updates[] = "`$field` = ?";
                        $params[] = $input[$field];
                    }
                }
            }
            
            if (empty($updates)) {
                throw new \Exception('No fields provided to update.');
            }
            
            // If slug is changed, check uniqueness
            if (isset($input['slug']) && $input['slug'] !== $product['slug']) {
                $slugCheck = $pdo->prepare("SELECT id FROM products_cms WHERE slug = ? AND id != ?");
                $slugCheck->execute([$input['slug'], $id]);
                if ($slugCheck->fetch()) {
                    throw new \Exception('Product slug must be unique.');
                }
            }
            
            $params[] = $id;
            $sql = "UPDATE products_cms SET " . implode(", ", $updates) . " WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $pdo->commit();
            sendSuccess('Product updated successfully.');
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to update product: ' . $e->getMessage());
        }
    }
    
    if ($method === 'DELETE') {
        $admin = requireAuth($pdo);
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        
        if ($id <= 0) {
            sendError('Valid Product ID is required for deletion.');
        }
        
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("DELETE FROM products_cms WHERE id = ?");
            $stmt->execute([$id]);
            
            $pdo->commit();
            sendSuccess('Product deleted successfully.');
        } catch (\Exception $e) {
            $pdo->rollBack();
            sendError('Failed to delete product: ' . $e->getMessage());
        }
    }
}

sendError('Method not allowed or action not specified.', 405);
