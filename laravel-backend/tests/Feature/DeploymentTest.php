<?php

namespace Tests\Feature;

use App\Services\BusLocationStore;
use App\Services\FirebaseNotificationService;
use App\Services\SupabaseUploads;
use App\Support\SqlDialect;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DeploymentTest extends TestCase
{
    public function test_locations_are_shared_between_service_instances_and_survive_updates(): void
    {
        Schema::create('bus_live_locations', function (Blueprint $table) {
            $table->unsignedBigInteger('bus_id')->primary();
            $table->json('geojson');
            $table->timestamp('updated_at');
        });
        config(['deployment.bus_locations' => 'database']);
        $geo = ['type' => 'Feature', 'geometry' => ['type' => 'Point', 'coordinates' => [121.1, 14.1]], 'properties' => ['seats_available' => 12]];
        (new BusLocationStore)->put(19, $geo);
        $otherInstance = new BusLocationStore;
        $this->assertSame($geo, $otherInstance->get(19));
        $geo['properties']['seats_available'] = 10;
        $otherInstance->put(19, $geo);
        $this->assertSame(1, DB::table('bus_live_locations')->count());
        $this->assertSame(10, (new BusLocationStore)->get(19)['properties']['seats_available']);
        $otherInstance->forget(19);
        $this->assertNull((new BusLocationStore)->get(19));
    }

    public function test_test_deployment_never_dispatches_copied_device_tokens(): void
    {
        Http::preventStrayRequests();
        config(['deployment.external_notifications' => false]);
        $result = (new FirebaseNotificationService)->sendNotification(['production-device-token'], 'Test', 'Test');
        $this->assertSame(0, $result['sent_count']);
        Http::assertNothingSent();
    }

    public function test_private_upload_keeps_the_legacy_attachment_path_and_uses_server_credentials(): void
    {
        config(['deployment.supabase_url' => 'https://test.supabase.co', 'deployment.supabase_key' => 'server-secret',
            'deployment.supabase_bucket' => 'byahero-test-uploads']);
        Http::fake(['test.supabase.co/*' => Http::response(['Key' => 'saved'], 200)]);
        $file = UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
        $path = (new SupabaseUploads)->upload($file);
        $this->assertStringStartsWith('assets/images/uploads/lost_and_found/lf_', $path);
        Http::assertSent(fn ($r) => $r->hasHeader('apikey', 'server-secret') && str_contains($r->url(), '/storage/v1/object/byahero-test-uploads/lost_and_found/'));
    }

    public function test_attachment_route_redirects_to_a_short_lived_signed_url(): void
    {
        config(['deployment.uploads' => 'supabase', 'deployment.supabase_url' => 'https://test.supabase.co',
            'deployment.supabase_key' => 'server-secret', 'deployment.supabase_bucket' => 'byahero-test-uploads']);
        Http::fake(['test.supabase.co/*' => Http::response(['signedURL' => '/object/sign/byahero-test-uploads/lost_and_found/photo.png?token=test'], 200)]);
        $this->get('/assets/images/uploads/lost_and_found/photo.png')
            ->assertRedirect('https://test.supabase.co/storage/v1/object/sign/byahero-test-uploads/lost_and_found/photo.png?token=test');
        Http::assertSent(fn ($r) => $r['expiresIn'] === 300);
    }

    public function test_readiness_fails_when_required_tables_are_missing_without_exposing_details(): void
    {
        $this->getJson('/api/health')->assertStatus(503)->assertExactJson(['ready' => false]);
    }

    public function test_database_expressions_match_each_driver_without_connecting_to_production(): void
    {
        config(['database.default' => 'pgsql']);
        $this->assertSame('"b"."Bus_ID"', DB::connection()->getQueryGrammar()->wrap('b.Bus_ID'));
        $this->assertSame('EXTRACT(HOUR FROM recorded_at)', SqlDialect::hour('recorded_at'));
        $this->assertStringContainsString('EXTRACT(EPOCH', SqlDialect::minutes('started_at', 'ended_at'));
        $this->assertStringContainsString('STRING_AGG', SqlDialect::aggregate('route'));
        $this->assertStringContainsString('AS numeric', SqlDialect::rounded('AVG(speed)', 2));
        config(['database.default' => 'mysql']);
        $this->assertSame('HOUR(recorded_at)', SqlDialect::hour('recorded_at'));
        $this->assertSame('TIMESTAMPDIFF(MINUTE, started_at, ended_at)', SqlDialect::minutes('started_at', 'ended_at'));
        $this->assertStringContainsString('GROUP_CONCAT', SqlDialect::aggregate('route'));
    }
}
