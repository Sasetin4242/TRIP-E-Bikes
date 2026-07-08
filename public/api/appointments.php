<?php
/**
 * Appointments Endpoint: Reading, Creating, and Updating Appointment Statuses
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method === 'GET') {
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
        $stmt = $pdo->prepare("SELECT * FROM service_appointments WHERE id = ?");
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        
        if (!$appointment) {
            sendError('Appointment not found.', 404);
        }
        
        // Non-admin can only see their own appointments matching email
        if (!$isAdmin && $appointment['customer_email'] !== $email) {
            sendError('Unauthorized.', 403);
        }
        
        sendSuccess('Appointment details retrieved.', ['appointment' => $appointment]);
    }
    
    if ($isAdmin) {
        $date = isset($_GET['date']) ? trim($_GET['date']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        
        $sql = "SELECT * FROM service_appointments WHERE 1=1";
        $params = [];
        
        if (!empty($date)) {
            $sql .= " AND preferred_date = ?";
            $params[] = $date;
        }
        
        if (!empty($status)) {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY preferred_date ASC, preferred_time ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll();
        
        foreach ($appointments as &$a) {
            if (isset($a['parts_used']) && $a['parts_used'] !== null) {
                $a['parts_used'] = json_decode($a['parts_used'], true);
            }
        }
        
        sendSuccess('Appointments retrieved.', $appointments);
    } elseif (!empty($email)) {
        // Customer looking up their own service history
        $stmt = $pdo->prepare("SELECT * FROM service_appointments WHERE customer_email = ? ORDER BY preferred_date DESC, preferred_time DESC");
        $stmt->execute([$email]);
        $appointments = $stmt->fetchAll();
        
        foreach ($appointments as &$a) {
            if (isset($a['parts_used']) && $a['parts_used'] !== null) {
                $a['parts_used'] = json_decode($a['parts_used'], true);
            }
        }
        
        sendSuccess('Customer appointments retrieved.', $appointments);
    } else {
        sendError('Unauthorized access.', 401);
    }
}

try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `service_center` VARCHAR(150) NULL AFTER `service_type`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `bike_model` VARCHAR(150) NULL AFTER `service_center`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `issue_description` TEXT NULL AFTER `notes`");
} catch (\PDOException $e) {}

if ($method === 'POST') {
    // Public endpoint for submitting a service booking request
    $name = trim($input['customer_name'] ?? '');
    $email = trim($input['customer_email'] ?? '');
    $phone = trim($input['customer_phone'] ?? '');
    $serviceType = trim($input['service_type'] ?? '');
    $serviceCenter = trim($input['service_center'] ?? '');
    $date = trim($input['appointment_date'] ?? '');
    $time = trim($input['appointment_time'] ?? '');
    $notes = trim($input['notes'] ?? '');
    $bikeModel = trim($input['bike_model'] ?? '');
    $issueDescription = trim($input['issue_description'] ?? '');
    
    if (empty($name) || empty($email) || empty($phone) || empty($serviceType) || empty($date) || empty($time)) {
        sendError('Name, email, phone, service type, appointment date, and time are required.');
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        sendError('Invalid date format. Expected YYYY-MM-DD.');
    }
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO service_appointments (customer_name, customer_email, customer_phone, service_type, service_center, preferred_date, preferred_time, notes, bike_model, issue_description, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$name, $email, $phone, $serviceType, $serviceCenter, $date, $time, $notes, $bikeModel, $issueDescription]);
        $appointmentId = $pdo->lastInsertId();
        
        $pdo->commit();
        sendSuccess('Appointment request booked successfully.', ['appointment_id' => $appointmentId], 201);
    } catch (\Exception $e) {
        $pdo->rollBack();
        sendError('Failed to book appointment: ' . $e->getMessage());
    }
}

try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `confirmation_sent` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `technician` VARCHAR(100) NULL AFTER `status`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `estimated_cost` DECIMAL(10,2) NULL AFTER `technician`");
} catch (\PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE `service_appointments` ADD COLUMN `parts_used` JSON NULL AFTER `estimated_cost`");
} catch (\PDOException $e) {}

if ($method === 'PUT' || $method === 'PATCH') {
    // Requires admin authentication to modify appointments
    $admin = requireAuth($pdo);
    
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
    
    if ($id <= 0) {
        sendError('Valid Appointment ID is required for updates.');
    }
    
    $pdo->beginTransaction();
    try {
        $checkStmt = $pdo->prepare("SELECT id FROM service_appointments WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            throw new \Exception('Appointment not found.');
        }
        
        // Allowed update fields
        $fields = ['status', 'appointment_date', 'appointment_time', 'notes', 'service_type', 'customer_phone', 'confirmation_sent', 'technician', 'estimated_cost', 'parts_used'];
        $updates = [];
        $params = [];
        
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                $updates[] = "`$field` = ?";
                if ($field === 'parts_used') {
                    $params[] = $input[$field] !== null ? json_encode($input[$field]) : null;
                } else {
                    $params[] = $input[$field];
                }
            }
        }
        
        if (empty($updates)) {
            throw new \Exception('No fields provided to update.');
        }
        
        $params[] = $id;
        $sql = "UPDATE service_appointments SET " . implode(", ", $updates) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $pdo->commit();
        sendSuccess('Appointment updated successfully.');
    } catch (\Exception $e) {
        $pdo->rollBack();
        sendError('Failed to update appointment: ' . $e->getMessage());
    }
}

sendError('Method not allowed.', 405);
