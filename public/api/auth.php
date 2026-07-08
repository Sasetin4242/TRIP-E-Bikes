<?php
/**
 * Authentication Endpoints: Login, OTP Confirmation, Token Creation, Session Validation, Sign Out
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Seed default demo admin if it doesn't exist
try {
    $demoEmail = 'demo.admin@tripmobility.ph';
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$demoEmail]);
    if (!$stmt->fetch()) {
        $passHash = password_hash('AdminTrip2026!', PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, role, username, avatar) VALUES (?, ?, 'super_admin', 'Demo Admin', 'https://api.dicebear.com/7.x/bottts/svg?seed=DemoAdmin')");
        $stmt->execute([$demoEmail, $passHash]);
    }
} catch (\PDOException $e) {
    error_log("Failed to seed demo admin: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();
$action = $_GET['action'] ?? $input['action'] ?? '';

// Handle actions
if ($method === 'POST') {
    if ($action === 'send_otp') {
        $email = trim($input['email'] ?? '');
        if (empty($email)) {
            sendError('Email address is required.');
        }

        // Generate 6-digit code
        $otp = sprintf("%06d", mt_rand(0, 999999));
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes from now

        $stmt = $pdo->prepare("INSERT INTO otp_verifications (email, otp_code, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $otp, $expiresAt]);

        // In a real app we'd email this. For development/testing, we return the OTP code in the response
        // and also log it.
        error_log("OTP for $email: $otp");
        sendSuccess('Verification code sent successfully.', ['otp_debug' => $otp]);
    }

    if ($action === 'verify_otp') {
        $email = trim($input['email'] ?? '');
        $code = trim($input['otp'] ?? $input['code'] ?? '');
        $setupPassword = trim($input['password'] ?? '');

        if (empty($email) || empty($code)) {
            sendError('Email and verification code are required.');
        }

        // Verify OTP
        $stmt = $pdo->prepare("
            SELECT id FROM otp_verifications 
            WHERE email = ? AND otp_code = ? AND expires_at > CURRENT_TIMESTAMP()
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$email, $code]);
        $otpRecord = $stmt->fetch();

        if (!$otpRecord) {
            sendError('Invalid or expired verification code.');
        }

        // Cleanup used OTP
        $pdo->prepare("DELETE FROM otp_verifications WHERE email = ?")->execute([$email]);

        // Find or create user
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            $role = isset($input['role']) ? trim($input['role']) : 'customer';
            if (!in_array($role, ['admin', 'customer', 'super_admin'])) {
                $role = 'customer';
            }
            $username = trim($input['username'] ?? explode('@', $email)[0]);
            $stmt = $pdo->prepare("INSERT INTO users (email, role, username) VALUES (?, ?, ?)");
            $stmt->execute([$email, $role, $username]);
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
        } else {
            // If user already exists, update username/role if provided in registration mode
            $updates = [];
            $params = [];
            if (isset($input['role'])) {
                $updates[] = "role = ?";
                $params[] = $input['role'];
            }
            if (isset($input['username'])) {
                $updates[] = "username = ?";
                $params[] = $input['username'];
            }
            if (!empty($updates)) {
                $params[] = $user['id'];
                $pdo->prepare("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?")->execute($params);
                
                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $user = $stmt->fetch();
            }
        }

        // If user wants to set a password during setup
        if (!empty($setupPassword)) {
            if (strlen($setupPassword) < 6) {
                sendError('Password must be at least 6 characters.');
            }
            $passHash = password_hash($setupPassword, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$passHash, $user['id']]);
        }

        // Create Session Token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7); // 7 days

        $stmt = $pdo->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $token, $expiresAt]);

        sendSuccess('Authentication successful.', [
            'token' => $token,
            'user' => [
                'id' => (string)$user['id'],
                'email' => $user['email'],
                'username' => $user['username'] ?: explode('@', $user['email'])[0],
                'avatar' => $user['avatar'],
                'role' => $user['role']
            ]
        ]);
    }

    if ($action === 'login') {
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        if (empty($email) || empty($password)) {
            sendError('Email and password are required.');
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
            sendError('Invalid email or password.');
        }

        // Create Session Token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 86400 * 7); // 7 days

        $stmt = $pdo->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $token, $expiresAt]);

        sendSuccess('Login successful.', [
            'token' => $token,
            'user' => [
                'id' => (string)$user['id'],
                'email' => $user['email'],
                'username' => $user['username'] ?: explode('@', $user['email'])[0],
                'avatar' => $user['avatar'],
                'role' => $user['role']
            ]
        ]);
    }

    if ($action === 'logout') {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = $authHeader;
        if (strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
        }

        if (!empty($token)) {
            $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE token = ?");
            $stmt->execute([$token]);
        }

        sendSuccess('Successfully signed out.');
    }
} elseif ($method === 'GET') {
    // Session validation
    $user = requireAuth($pdo);
    sendSuccess('Session is valid.', [
        'user' => [
            'id' => (string)$user['id'],
            'email' => $user['email'],
            'username' => $user['username'] ?: explode('@', $user['email'])[0],
            'avatar' => $user['avatar'],
            'role' => $user['role']
        ]
    ]);
}

sendError('Method not allowed or action not specified.', 405);
