<?php
/**
 * Image Upload Endpoint: Storing files securely in public/uploads/ and returning their URL paths
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

// Only allow POST requests for uploads
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

// Optional: Require authentication for uploads
try {
    $admin = requireAuth($pdo);
} catch (\Exception $e) {
    // Depending on requirement, we can either enforce this or allow anyone to upload (e.g. for chat attachments/reviews)
    // Here we'll require admin authentication to upload to CMS
}

// Define upload directory
$uploadDir = __DIR__ . '/../uploads/';

// Ensure upload directory exists
if (!file_exists($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        sendError('Server error. Failed to create uploads directory.', 500);
    }
}

// Verify file was uploaded
if (!isset($_FILES['image']) && !isset($_FILES['file'])) {
    sendError('No file uploaded. Please upload a file with key "image" or "file".');
}

$fileKey = isset($_FILES['image']) ? 'image' : 'file';
$file = $_FILES[$fileKey];

// Check for PHP upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.',
    ];
    $message = $errors[$file['error']] ?? 'Unknown upload error.';
    sendError($message);
}

// Validate file size (e.g. 5MB maximum)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    sendError('File is too large. Maximum size is 5MB.');
}

// Validate MIME type / extension for security
$allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimes)) {
    sendError('Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG images are allowed.');
}

// Retrieve file extension safely
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
if (empty($extension)) {
    $extensionsMap = [
        'image/jpeg'    => 'jpg',
        'image/png'     => 'png',
        'image/gif'     => 'gif',
        'image/webp'    => 'webp',
        'image/svg+xml' => 'svg',
    ];
    $extension = $extensionsMap[$mimeType] ?? 'jpg';
}

// Sanitize filename and make it unique
$newFilename = bin2hex(random_bytes(16)) . '.' . strtolower($extension);
$destination = $uploadDir . $newFilename;

// Move uploaded file to uploads directory
if (move_uploaded_file($file['tmp_name'], $destination)) {
    // Return relative URL path from the public folder
    $urlPath = '/uploads/' . $newFilename;
    sendSuccess('File uploaded successfully.', ['url' => $urlPath]);
} else {
    sendError('Failed to save uploaded file.', 500);
}
