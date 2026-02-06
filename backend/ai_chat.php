<?php
header('Content-Type: application/json');

// Get user message
$input = json_decode(file_get_contents('php://input'), true);
$userMessage = $input['message'] ?? '';

if (empty($userMessage)) {
    echo json_encode(['response' => 'Please provide a message.']);
    exit;
}

// System prompt for ByaHero AI
$systemPrompt = "You are ByaHero AI Assistant, a helpful and friendly bus tracking assistant for ByaHero app. 
You help users with:
- Bus tracking and real-time location
- Smart notifications for bus arrivals
- Seat availability information
- Route information
- App features and settings
- Safety features and emergency help
- Accessibility settings

Keep responses concise, helpful, and friendly. If you don't know something specific about ByaHero, admit it honestly and offer to help with something else.";

// Prepare request for Ollama
$ollamaUrl = 'http://localhost:11434/api/generate';
$ollamaData = [
    'model' => 'llama3.2:1b',
    'prompt' => $systemPrompt . "\n\nUser: " . $userMessage . "\n\nAssistant:",
    'stream' => false,
    'options' => [
        'temperature' => 0.7,
        'num_predict' => 200
    ]
];

// Send request to Ollama
$ch = curl_init($ollamaUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($ollamaData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Handle response
if ($httpCode === 200 && $response) {
    $result = json_decode($response, true);
    $aiResponse = $result['response'] ?? 'Sorry, I could not generate a response.';
    
    // Clean up response
    $aiResponse = trim($aiResponse);
    
    echo json_encode(['response' => $aiResponse]);
} else {
    echo json_encode(['response' => 'Sorry, the AI service is currently unavailable. Please try again later.']);
}
?>