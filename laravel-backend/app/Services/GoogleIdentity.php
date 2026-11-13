<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use UnexpectedValueException;

class GoogleIdentity
{
    public function verify(string $credential): array
    {
        $clients = config('services.google.client_ids', []);
        if (!$clients || strlen($credential) > 12000) {
            throw new UnexpectedValueException('Google sign-in is not configured');
        }
        $jwks = Cache::remember('google_identity_jwks', 3600, function () {
            $response = Http::timeout(5)->get('https://www.googleapis.com/oauth2/v3/certs');
            $response->throw();
            return $response->json();
        });
        $payload = (array) JWT::decode($credential, JWK::parseKeySet($jwks, 'RS256'));
        if (!in_array($payload['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true)
            || !is_string($payload['aud'] ?? null) || !in_array($payload['aud'], $clients, true)
            || !is_string($payload['sub'] ?? null) || $payload['sub'] === ''
            || !is_int($payload['exp'] ?? null) || $payload['exp'] <= time()
            || ($payload['email_verified'] ?? false) !== true
            || !filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
            throw new UnexpectedValueException('Google identity is invalid');
        }
        return $payload;
    }
}
