<?php

namespace App\Services;

use App\Models\UserFcmToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

class FirebaseNotificationService
{
    protected ?string $projectId;
    protected ?string $clientEmail;
    protected ?string $privateKey;

    public function __construct()
    {
        $this->projectId = config('services.firebase.project_id');
        $this->clientEmail = config('services.firebase.client_email');
        $rawKey = config('services.firebase.private_key', '');
        $this->privateKey = !empty($rawKey) ? str_replace('\n', "\n", $rawKey) : null;
    }

    /**
     * Check if Firebase credentials are fully configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->projectId) && !empty($this->clientEmail) && !empty($this->privateKey);
    }

    /**
     * Generate RS256 self-signed JWT for Google OAuth2 token exchange.
     */
    public function generateSignedJwt(): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
            $now = time();
            $payload = json_encode([
                'iss' => $this->clientEmail,
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $now + 3600,
                'iat' => $now
            ]);

            $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
            $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
            $signatureInput = $b64Header . "." . $b64Payload;

            $signature = '';
            $success = @openssl_sign($signatureInput, $signature, $this->privateKey, "sha256WithRSAEncryption");
            if (!$success) {
                Log::error('FirebaseNotificationService: Failed to sign JWT with RSA private key.');
                return null;
            }

            $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
            return $signatureInput . "." . $b64Signature;
        } catch (Exception $e) {
            Log::error('FirebaseNotificationService: Exception creating signed JWT: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get Google OAuth2 access token for FCM API v1.
     * Caches token for 50 minutes.
     */
    public function getAccessToken(): ?string
    {
        $cachedToken = Cache::get('fcm_google_access_token');
        if (!empty($cachedToken)) {
            return $cachedToken;
        }

        $jwt = $this->generateSignedJwt();
        if (empty($jwt)) {
            return null;
        }

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post('https://oauth2.googleapis.com/token', [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $accessToken = $data['access_token'] ?? null;
                if (!empty($accessToken)) {
                    $expiresIn = (int)($data['expires_in'] ?? 3600);
                    // Cache with 5 minutes safety margin
                    Cache::put('fcm_google_access_token', $accessToken, now()->addSeconds(max(60, $expiresIn - 300)));
                    return $accessToken;
                }
            }

            Log::error('FirebaseNotificationService: Failed fetching access token from Google OAuth2: ' . $response->body());
            return null;
        } catch (Exception $e) {
            Log::error('FirebaseNotificationService: Connection error getting access token: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification to multiple FCM tokens.
     *
     * @param array $tokens Array of FCM device tokens.
     * @param string $title Notification title.
     * @param string $body Notification body text.
     * @param array $data Custom data payload key-value pairs (strings).
     * @param string $channelId Android notification channel ID.
     * @return array Summary of dispatch results.
     */
    public function sendNotification(
        array $tokens,
        string $title,
        string $body,
        array $data = [],
        string $channelId = 'schedule_updates'
    ): array {
        $uniqueTokens = array_values(array_unique(array_filter(array_map('trim', $tokens))));
        if (empty($uniqueTokens)) {
            return ['success' => true, 'sent_count' => 0, 'failed_count' => 0, 'message' => 'No tokens provided.'];
        }

        $accessToken = $this->getAccessToken();
        if (empty($accessToken)) {
            Log::warning('FirebaseNotificationService: Skipping push dispatch - unable to obtain Google access token.');
            return ['success' => false, 'sent_count' => 0, 'failed_count' => count($uniqueTokens), 'message' => 'Unable to obtain Google OAuth access token.'];
        }

        $fcmUrl = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";
        $sentCount = 0;
        $failedCount = 0;
        $invalidTokens = [];

        // Ensure all data values are stringified for FCM
        $stringifiedData = [];
        foreach ($data as $k => $v) {
            $stringifiedData[(string)$k] = is_string($v) ? $v : (is_scalar($v) ? (string)$v : json_encode($v));
        }

        foreach ($uniqueTokens as $token) {
            try {
                $payload = [
                    'message' => [
                        'token' => $token,
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'data' => array_merge([
                            'title' => $title,
                            'body' => $body,
                            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                        ], $stringifiedData),
                        'android' => [
                            'priority' => 'HIGH',
                            'notification' => [
                                'channel_id' => $channelId,
                                'sound' => 'default',
                                'notification_priority' => 'PRIORITY_HIGH',
                                'visibility' => 'PUBLIC',
                            ],
                        ],
                        'apns' => [
                            'payload' => [
                                'aps' => [
                                    'alert' => [
                                        'title' => $title,
                                        'body' => $body,
                                    ],
                                    'sound' => 'default',
                                    'badge' => 1,
                                ],
                            ],
                        ],
                    ],
                ];

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$accessToken}",
                    'Content-Type' => 'application/json',
                ])->timeout(5)->post($fcmUrl, $payload);

                if ($response->successful()) {
                    $sentCount++;
                } else {
                    $failedCount++;
                    $resBody = $response->body();
                    Log::warning("FirebaseNotificationService: FCM push failed for token (HTTP {$response->status()}): {$resBody}");

                    // If token is invalid or unregistered, schedule for removal
                    if (str_contains($resBody, 'UNREGISTERED') || str_contains($resBody, 'NOT_FOUND') || str_contains($resBody, 'INVALID_ARGUMENT')) {
                        $invalidTokens[] = $token;
                    }
                }
            } catch (Exception $e) {
                $failedCount++;
                Log::error("FirebaseNotificationService: Exception sending push to token: " . $e->getMessage());
            }
        }

        // Clean up stale or unregistered tokens
        if (!empty($invalidTokens)) {
            try {
                UserFcmToken::whereIn('fcm_token', $invalidTokens)->delete();
                Log::info('FirebaseNotificationService: Removed ' . count($invalidTokens) . ' stale FCM token(s).');
            } catch (Exception $e) {
                Log::warning('FirebaseNotificationService: Failed deleting stale tokens: ' . $e->getMessage());
            }
        }

        return [
            'success' => $sentCount > 0 || $failedCount === 0,
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'total' => count($uniqueTokens)
        ];
    }
}
