<?php
/**
 * Blog Endpoint: Handles retrieval and listing of blog posts
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Dynamically create blog_posts table if it doesn't exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `blog_posts` (
          `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          `title` VARCHAR(255) NOT NULL,
          `slug` VARCHAR(255) NOT NULL UNIQUE,
          `excerpt` VARCHAR(500) NULL,
          `content` TEXT NOT NULL,
          `cover_image` VARCHAR(255) NULL,
          `author_name` VARCHAR(100) NOT NULL DEFAULT 'TRIP Team',
          `author_avatar` VARCHAR(255) NULL,
          `read_time` INT NOT NULL DEFAULT 5,
          `published` TINYINT(1) NOT NULL DEFAULT 0,
          `published_at` TIMESTAMP NULL,
          `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Seed default blog posts if empty
    $stmt = $pdo->query("SELECT id FROM blog_posts LIMIT 1");
    if (!$stmt->fetch()) {
        $pdo->exec("
            INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author_name, read_time, published, published_at) VALUES
            (
              'The Future of Urban Delivery: Electric Cargo Bikes',
              'future-urban-delivery-electric-cargo-bikes',
              'How last-mile logistics are being transformed by high-capacity, low-emission e-bikes in dense metropolitan areas.',
              'Urban congestion and carbon emissions regulations are forcing logistics companies to rethink last-mile delivery. Enter the electric cargo bike: a high-efficiency alternative to delivery vans. With cargo spaces capable of holding up to 150kg and powerful electric motor assist, cargo e-bikes bypass traffic, park on sidewalks, and cut delivery times in half while reducing operational costs by over 60%.',
              'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800',
              'Marcus Santos',
              5,
              1,
              CURRENT_TIMESTAMP
            ),
            (
              'A Complete Guide to E-Bike Battery Maintenance',
              'guide-ebike-battery-maintenance',
              'Essential tips and best practices to extend the life, range, and health of your e-bike lithium-ion battery.',
              'Your e-bike battery is the heart of your machine. To maximize its lifespan and ensure top performance: 1. Keep it at room temperature (avoid leaving it under direct sunlight or freezing cold). 2. Never let it sit empty for long periods. 3. Charge it to around 80% if storing it for several weeks. 4. Use only the manufacturer-approved charger to avoid overcurrent and thermal runaway.',
              'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800',
              'Sofia Lim',
              6,
              1,
              CURRENT_TIMESTAMP
            ),
            (
              'Commuting in Manila: Why E-Bikes are the Ultimate Hack',
              'commuting-manila-ebikes-ultimate-hack',
              'Ditch the traffic jams and crowded trains. Discover how commuter e-bikes are giving Manila professionals their time back.',
              'With hours wasted daily in gridlock, Manila commuters are turning to active mobility. Electric commuter bikes bridge the gap between cycling and ease, letting riders cruise at 25km/h without arriving at the office drenched in sweat. With dedicated bike lanes expanding and the cost of gasoline skyrocketing, e-bikes offer an average payback period of less than 6 months compared to public transport or driving.',
              'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?auto=format&fit=crop&q=80&w=800',
              'David Reyes',
              4,
              1,
              CURRENT_TIMESTAMP
            )
        ");
    }
} catch (\PDOException $e) {
    error_log("Failed to initialize blog table: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method !== 'GET') {
    sendError('Method not allowed.', 405);
}

$slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
$action = $_GET['action'] ?? '';

if (!empty($slug)) {
    // Get single post
    $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE slug = ? AND published = 1 LIMIT 1");
    $stmt->execute([$slug]);
    $post = $stmt->fetch();
    
    if (!$post) {
        sendError('Blog post not found.', 404);
    }
    
    $post['published'] = ($post['published'] === 1 || $post['published'] === '1' || $post['published'] === true);
    sendSuccess('Blog post retrieved.', $post);
}

if ($action === 'related') {
    $excludeSlug = isset($_GET['exclude']) ? trim($_GET['exclude']) : '';
    $stmt = $pdo->prepare("SELECT id, title, slug, excerpt, cover_image, read_time, published_at FROM blog_posts WHERE published = 1 AND slug != ? ORDER BY published_at DESC LIMIT 3");
    $stmt->execute([$excludeSlug]);
    $related = $stmt->fetchAll();
    
    sendSuccess('Related posts retrieved.', $related);
}

// Default action: list all published posts
$stmt = $pdo->query("SELECT id, title, slug, excerpt, cover_image, author_name, read_time, published_at FROM blog_posts WHERE published = 1 ORDER BY published_at DESC");
$posts = $stmt->fetchAll();

sendSuccess('Blog posts list retrieved.', $posts);
