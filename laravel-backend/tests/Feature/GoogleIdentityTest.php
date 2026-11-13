<?php

namespace Tests\Feature;

use App\Services\GoogleIdentity;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleIdentityTest extends TestCase
{
    private function keys(): array
    {
        $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
        $windowsConfig = dirname(PHP_BINARY).'/extras/ssl/openssl.cnf';
        if (is_file($windowsConfig)) $options['config'] = $windowsConfig;
        $key = openssl_pkey_new($options);
        $this->assertNotFalse($key);
        openssl_pkey_export($key, $private, null, $options);
        $details = openssl_pkey_get_details($key);
        $encode = fn ($value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        return [$private, ['keys' => [['kty' => 'RSA', 'kid' => 'test-key', 'alg' => 'RS256',
            'n' => $encode($details['rsa']['n']), 'e' => $encode($details['rsa']['e'])]]]];
    }

    private function claims(): array
    {
        return ['iss' => 'https://accounts.google.com', 'aud' => 'byahero-client', 'sub' => 'google-user',
            'email' => 'user@gmail.com', 'email_verified' => true, 'iat' => time() - 10, 'exp' => time() + 3600];
    }

    public function test_google_identity_requires_valid_signature_audience_issuer_expiry_and_verified_email(): void
    {
        [$private, $public] = $this->keys();
        config(['services.google.client_ids' => ['byahero-client']]);
        Cache::forget('google_identity_jwks');
        Http::fake(['www.googleapis.com/oauth2/v3/certs' => Http::response($public)]);
        $service = new GoogleIdentity;
        $token = JWT::encode($this->claims(), $private, 'RS256', 'test-key');
        $this->assertSame('google-user', $service->verify($token)['sub']);
        foreach ([['aud' => 'another-client'], ['iss' => 'https://attacker.example'],
            ['exp' => time() - 10], ['email_verified' => false], ['sub' => '']] as $change) {
            try {
                $service->verify(JWT::encode(array_replace($this->claims(), $change), $private, 'RS256', 'test-key'));
                $this->fail('Invalid identity was accepted');
            } catch (\UnexpectedValueException $e) {
                $this->assertNotSame('', $e->getMessage());
            }
        }
        [$attacker] = $this->keys();
        $this->postJson('/api/auth', ['action' => 'google_auth',
            'credential' => JWT::encode($this->claims(), $attacker, 'RS256', 'test-key')])
            ->assertStatus(401)->assertSessionMissing('user_id');
    }
}
