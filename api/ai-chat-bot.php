<?php
/**
 * AI Chat Bot Endpoint: Replacement for Supabase Edge Function
 */

declare(strict_types=1);

require_once __DIR__ . '/helper.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJSONInput();

if ($method !== 'POST') {
    sendError('Method not allowed.', 405);
}

$message = trim($input['message'] ?? '');
$history = $input['conversation_history'] ?? [];

if (empty($message)) {
    sendError('Message is required.');
}

// Simple rule-based chatbot for TRIP Mobility e-bikes with custom responses
$messageLower = strtolower($message);
$reply = "I've received your query about TRIP e-bikes. Let me connect you with a specialist who can provide more detailed information.";

if (strpos($messageLower, 'model') !== false || strpos($messageLower, 'offer') !== false || strpos($messageLower, 'price') !== false || strpos($messageLower, 'how much') !== false) {
    $reply = "We offer premium e-bike models designed for cargo, commuting, and fleet logistics:\n\n" .
             "1. **TRIP Cargo Pro** — Heavy-duty utility e-bike. Price starts at ₱55,000.\n" .
             "2. **TRIP Urban** — Sleek city commuter with long range. Price starts at ₱42,000.\n" .
             "3. **TRIP Fleet L1** — Enterprise model optimized for delivery platforms.\n\n" .
             "Would you like to request a custom quote for any of these?";
} elseif (strpos($messageLower, 'quote') !== false || strpos($messageLower, 'quotation') !== false) {
    $reply = "You can easily request a quotation directly on our website! Click the **Request a Quote** button on the top navigation bar, choose your specifications, and our team will prepare a formal proposal for you.";
} elseif (strpos($messageLower, 'service') !== false || strpos($messageLower, 'repair') !== false || strpos($messageLower, 'warranty') !== false) {
    $reply = "TRIP Mobility e-bikes come with a comprehensive warranty: 3 years for the frame, 1 year for the motor, and 1 year for the battery. Our main service center is in Mandaluyong City, Metro Manila. You can book an appointment via our **Service Booking** page.";
} elseif (strpos($messageLower, 'fleet') !== false || strpos($messageLower, 'bulk') !== false || strpos($messageLower, 'business') !== false) {
    $reply = "For corporate and delivery fleets, we offer customizable branding, fleet tracking telemetry, and bulk pricing. Please fill out our Fleet Contact form or email us at **fleet@tripmobility.ph**.";
} elseif (strpos($messageLower, 'hello') !== false || strpos($messageLower, 'hi') !== false || strpos($messageLower, 'hey') !== false) {
    $reply = "Hello! I'm your TRIP AI assistant. How can I help you today? You can ask me about our e-bike models, service bookings, or how to get a quote.";
}

sendSuccess('AI response generated.', ['reply' => $reply]);
