<?php
declare(strict_types=1);

/**
 * Mail Configuration & Helper for ByaHero
 * Using Brevo (formerly Sendinblue) API for free transactional emails.
 * 
 * To get your API key:
 * 1. Sign up at https://www.brevo.com/
 * 2. Go to SMTP & API -> API Keys
 */

require_once __DIR__ . '/bootstrap.php';

define('BREVO_API_KEY', get_env_config('BREVO_API_KEY', 'YOUR_BREVO_API_KEY_HERE'));
define('SENDER_EMAIL', get_env_config('SENDER_EMAIL', 'no-reply@byahero.com'));
define('SENDER_NAME', get_env_config('SENDER_NAME', 'ByaHero Support'));

/**
 * Sends an OTP email to the user.
 * 
 * @param string $to Recipient email address
 * @param string $otp 6-digit code
 * @param string $type 'recovery' or 'signup'
 * @return array ['success' => bool, 'message' => string]
 */
function sendOTPEmail(string $to, string $otp, string $type = 'recovery'): array {
    if (BREVO_API_KEY === 'YOUR_BREVO_API_KEY_HERE') {
        return [
            'success' => false, 
            'message' => 'Brevo API Key not configured. Please update your .env file.'
        ];
    }

    if (strpos(BREVO_API_KEY, 'xsmtpsib-') === 0) {
        return [
            'success' => false,
            'message' => 'You are using an SMTP Key (xsmtpsib-...). Please use a v3 API Key (starts with xkeysib-) instead.'
        ];
    }

    $url = 'https://api.brevo.com/v3/smtp/email';
    
    $subject = ($type === 'signup') ? 'Verify Your ByaHero Account' : 'Your ByaHero Recovery Code';
    $title   = ($type === 'signup') ? 'ByaHero Registration' : 'ByaHero Password Recovery';
    $intro   = ($type === 'signup') 
        ? 'Welcome to ByaHero! Please use the following 6-digit code to verify your email and complete your registration:' 
        : 'You requested a password reset for your ByaHero account. Please use the following 6-digit code to proceed:';

    $data = [
        'sender' => [
            'name' => SENDER_NAME,
            'email' => SENDER_EMAIL
        ],
        'to' => [
            ['email' => $to]
        ],
        'subject' => $subject,
        'htmlContent' => "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;'>
                <h2 style='color: #2563eb; text-align: center;'>$title</h2>
                <p>Hello,</p>
                <p>$intro</p>
                <div style='background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                    <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;'>$otp</span>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this, please ignore this email or contact support if you have concerns.</p>
                <hr style='border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;'>
                <p style='font-size: 12px; color: #6b7280; text-align: center;'>&copy; " . date('Y') . " ByaHero Team. All rights reserved.</p>
            </div>
        "
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'api-key: ' . BREVO_API_KEY,
        'x-sib-api-key: ' . BREVO_API_KEY,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true, 'message' => 'Email sent successfully'];
    } else {
        $errorMsg = 'Failed to send email. API Error: ' . ($response ?: 'Unknown error');
        error_log($errorMsg);
        return ['success' => false, 'message' => $errorMsg];
    }
}
