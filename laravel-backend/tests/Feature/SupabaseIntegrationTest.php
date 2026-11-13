<?php

namespace Tests\Feature;

use App\Services\BusLocationStore;
use Dotenv\Dotenv;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Opt-in integration tests: existing copied records are restored by transaction rollback. */
class SupabaseIntegrationTest extends TestCase
{
    private bool $connected = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (getenv('BYAHERO_TEST_PG') !== '1') $this->markTestSkipped('Set BYAHERO_TEST_PG=1 to test the isolated Supabase copy.');
        $env = Dotenv::parse(file_get_contents(base_path('.env.supabase')));
        $this->assertSame('byahero_test', $env['DB_SCHEMA']);
        $this->assertSame('postgres.dvkpbydrrpurlbjsjlux', $env['DB_USERNAME']);
        $connection = array_replace(config('database.connections.pgsql'), [
            'url' => null, 'host' => $env['DB_HOST'], 'port' => '5432', 'database' => 'postgres',
            'username' => $env['DB_USERNAME'], 'password' => $env['DB_PASSWORD'],
            'search_path' => 'byahero_test', 'sslmode' => 'require', 'timezone' => 'Asia/Manila',
        ]);
        config(['database.connections.migration_test' => $connection, 'database.default' => 'migration_test',
            'deployment.bus_locations' => 'database', 'deployment.external_notifications' => false, 'deployment.ml_enabled' => false]);
        $this->assertSame('byahero_test', DB::selectOne('SELECT current_schema() AS name')->name);
        DB::beginTransaction();
        $this->connected = true;
    }

    protected function tearDown(): void
    {
        if ($this->connected) {
            $db = DB::connection('migration_test');
            while ($db->transactionLevel() > 0) $db->rollBack();
            DB::purge('migration_test');
        }
        parent::tearDown();
    }

    public function test_health_analytics_and_fare_updates_on_the_real_postgres_copy(): void
    {
        $this->getJson('/api/health')->assertOk()->assertExactJson(['ready' => true]);
        $adminId = (int) DB::table('admins')->value('id');
        $this->withSession(['user_id' => $adminId, 'user_role' => 'admin']);
        foreach (['/api/admin/analytics?period=all', '/api/admin/analytics?period=week', '/api/admin/ai/stats', '/api/admin/active-buses'] as $path) {
            $response = $this->getJson($path);
            $this->assertSame(200, $response->status(), 'PostgreSQL endpoint failed: '.$path);
            $this->assertTrue((bool) $response->json('success'), 'PostgreSQL query failed: '.$path);
        }
        $response = $this->postJson('/api/admin/fares', ['action' => 'generate_matrix', 'base_km' => 4.5,
            'reg_base' => 15, 'disc_base' => 12, 'reg_rate' => 2.2, 'disc_rate' => 1.76]);
        $this->assertTrue((bool) $response->json('success'), 'Fractional fare generation failed on PostgreSQL.');
    }

    public function test_trip_location_passenger_event_and_stop_share_persistent_state(): void
    {
        $busId = (int) DB::table('busses')->value('Bus_ID');
        $conductorId = (int) DB::table('conductors')->value('id');
        DB::table('busses')->where('Bus_ID', $busId)->update(['current_conductor_id' => $conductorId]);
        $this->withSession(['user_id' => $conductorId, 'user_role' => 'conductor']);
        $start = $this->postJson('/api/conductor/start', ['bus_id' => $busId, 'route' => 'LT', 'pre_departure_count' => 2]);
        $this->assertTrue((bool) $start->json('success'), 'Trip start failed.');
        $operation = $start->json('operation_id');
        $location = $this->postJson('/api/conductor/update-location', ['bus_id' => $busId, 'lat' => 14.1, 'lng' => 121.1,
            'route' => 'LT', 'speed' => 5, 'seats_available' => 20]);
        $this->assertTrue((bool) $location->json('success'), 'Location update failed.');
        $this->assertSame([121.1, 14.1], (new BusLocationStore)->get($busId)['geometry']['coordinates']);
        $event = $this->postJson('/api/conductor/log-passenger-event', ['operation_id' => $operation,
            'event_type' => 'board', 'count' => 1, 'location_name' => 'Migration test']);
        $this->assertTrue((bool) $event->json('success'), 'Passenger event failed.');
        $this->assertSame(3, (int) DB::table('bus_operations')->where('id', $operation)->value('total_boarded'));
        $stop = $this->postJson('/api/conductor/stop', ['bus_id' => $busId, 'end_location' => 'Migration test']);
        $this->assertTrue((bool) $stop->json('success'), 'Trip stop failed.');
        $this->assertNull((new BusLocationStore)->get($busId));
    }

    public function test_device_registration_uses_postgres_upsert_without_duplicates(): void
    {
        $userId = (int) DB::table('users')->value('id');
        $this->withSession(['user_id' => $userId, 'user_role' => 'passenger']);
        $token = 'migration-test-token';
        for ($i = 0; $i < 2; $i++) {
            $response = $this->postJson('/api/fcm/register', ['fcm_token' => $token]);
            $this->assertTrue((bool) $response->json('success'), 'Device token upsert failed.');
        }
        $this->assertSame(1, DB::table('user_fcm_tokens')->where('fcm_token', $token)->count());
    }

    public function test_admin_login_session_and_logout_on_the_test_database(): void
    {
        $email = 'admin-connection-check@byahero.test';
        DB::table('admins')->insert([
            'email' => $email, 'name' => 'Temporary connection check',
            'password' => \Illuminate\Support\Facades\Hash::make('temporary-test-password'),
        ]);
        $response = $this->post('/api/auth', [
            'action' => 'login', 'email' => $email, 'password' => 'temporary-test-password',
        ], ['Accept' => 'application/json']);
        $this->assertTrue((bool) $response->json('success'), 'Admin login failed on the Supabase copy.');
        $response->assertSessionHas('user_role', 'admin')->assertSessionHas('user_email', $email);
        $dashboard = $this->getJson('/api/admin/dashboard-stats');
        $this->assertSame(200, $dashboard->status());
        $this->assertTrue((bool) $dashboard->json('success'), 'Authenticated admin request failed.');
        $logout = $this->postJson('/api/logout');
        $this->assertTrue((bool) $logout->json('success'), 'Admin logout failed.');
        $logout->assertSessionMissing('user_role')->assertSessionMissing('user_email');
    }
}
