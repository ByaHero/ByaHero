<?php

namespace Tests\Feature;

use Tests\TestCase;

class GoogleCallbackTest extends TestCase
{
    public function test_callback_is_public_and_does_not_cache_or_render_query_credentials(): void
    {
        $this->get('/auth/google/callback?id_token=never-render-this&state=https://untrusted.invalid')
            ->assertOk()
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertSee('/js/google-callback.js', false)
            ->assertDontSee('never-render-this')
            ->assertDontSee('untrusted.invalid');
        $response = $this->get('/auth/google/callback');
        $this->assertEmpty($response->headers->getCookies());
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
    }
}
