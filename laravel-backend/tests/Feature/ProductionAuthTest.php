<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProductionAuthTest extends TestCase
{
    public function test_email_headers_and_parameters_cannot_create_an_admin_session(): void
    {
        $this->withHeaders(['X-Admin-Email' => 'admin@example.test', 'X-User-Email' => 'admin@example.test'])
            ->getJson('/api/admin/dashboard-stats?email=admin@example.test')
            ->assertStatus(401)->assertSessionMissing('user_id');
    }

    public function test_anonymous_identity_fallbacks_cannot_modify_or_read_private_data(): void
    {
        foreach (['/api/fcm/register', '/api/location/update', '/api/passenger/profile/delete-account',
            '/api/waiting/cancel', '/api/conductor/claim'] as $path) {
            $this->postJson($path, ['email' => 'someone@example.test', 'fcm_token' => 'forged-token'])
                ->assertStatus(401)->assertSessionMissing('user_id');
        }
        $this->postJson('/api/auth', ['action' => 'restore_session', 'email' => 'admin@example.test'])
            ->assertStatus(401)->assertSessionMissing('user_id');
    }

    public function test_passenger_session_cannot_enter_admin_or_conductor_routes(): void
    {
        $this->withSession(['user_id' => 1, 'user_role' => 'passenger'])
            ->getJson('/api/admin/staff')->assertStatus(403);
        $this->postJson('/api/conductor/start', ['email' => 'conductor@example.test'])->assertStatus(403);
    }

    public function test_request_email_cannot_cancel_another_passengers_waiting_status(): void
    {
        Schema::create('waiting_passengers', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('status');
            $table->timestamp('updated_at')->nullable();
        });
        DB::table('waiting_passengers')->insert([
            ['user_id' => 1, 'status' => 'waiting'], ['user_id' => 2, 'status' => 'waiting'],
        ]);
        $this->withSession(['user_id' => 1, 'user_role' => 'passenger'])
            ->postJson('/api/waiting/cancel', ['email' => 'other@example.test'])->assertOk();
        $this->assertSame('cancelled', DB::table('waiting_passengers')->where('user_id', 1)->value('status'));
        $this->assertSame('waiting', DB::table('waiting_passengers')->where('user_id', 2)->value('status'));
    }

    public function test_cross_site_posts_are_rejected_even_with_an_authenticated_session(): void
    {
        $this->withSession(['user_id' => 1, 'user_role' => 'passenger'])
            ->withHeader('Origin', 'https://attacker.example')
            ->postJson('/api/waiting/cancel')->assertStatus(403);
    }

    public function test_authenticated_session_restore_cannot_switch_to_an_existing_admin_email(): void
    {
        foreach (['users','admins'] as $table) {
            Schema::create($table, function (Blueprint $blueprint) {
                $blueprint->id();
                $blueprint->string('email');
                $blueprint->string('name')->nullable();
                $blueprint->string('contacts')->nullable();
                $blueprint->string('profile_picture')->nullable();
            });
        }
        DB::table('users')->insert(['id'=>1,'email'=>'passenger@example.test','name'=>'Passenger']);
        DB::table('admins')->insert(['id'=>1,'email'=>'admin@example.test','name'=>'Admin']);
        $this->withSession(['user_id'=>1,'user_role'=>'passenger','user_email'=>'passenger@example.test'])
            ->postJson('/api/auth',['action'=>'restore_session','email'=>'admin@example.test'])
            ->assertOk()->assertJsonPath('user.role','passenger')->assertJsonPath('user.email','passenger@example.test')
            ->assertSessionHas('user_role','passenger');
    }

    public function test_production_attachments_require_authentication_and_ownership(): void
    {
        config(['deployment.role'=>'production']);
        $this->getJson('/assets/images/uploads/lost_and_found/photo.png')->assertUnauthorized();
        Schema::create('lost_and_found',function(Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('image1_path')->nullable();
            $table->string('image2_path')->nullable();
        });
        DB::table('lost_and_found')->insert(['user_id'=>2,'image1_path'=>'assets/images/uploads/lost_and_found/photo.png']);
        $this->withSession(['user_id'=>1,'user_role'=>'passenger'])
            ->getJson('/assets/images/uploads/lost_and_found/photo.png')->assertNotFound();
    }

    public function test_notification_poll_returns_exact_unread_count_and_preserves_active_sos(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_cleared')->default(false);
        });
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
        });
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
        });
        Schema::create('sos_alerts', function (Blueprint $table) {
            $table->id();
            $table->integer('sender_user_id');
            $table->integer('recipient_user_id');
            $table->string('location_text');
            $table->string('status');
            $table->boolean('is_cleared')->default(false);
            $table->timestamps();
        });

        DB::table('notifications')->insert(array_fill(0, 51, ['user_id' => 1]));
        DB::table('notifications')->insert(['user_id' => 1, 'read_at' => now()]);
        DB::table('notifications')->insert(['user_id' => 1, 'is_cleared' => true]);
        DB::table('notifications')->insert(['user_id' => 2]);
        DB::table('users')->insert(['id' => 2, 'name' => 'Sender', 'email' => 'sender@example.test']);
        $alertId = DB::table('sos_alerts')->insertGetId([
            'sender_user_id' => 2,
            'recipient_user_id' => 1,
            'location_text' => 'Test terminal',
            'status' => 'active',
            'created_at' => now(),
        ]);

        $this->getJson('/api/notifications?include_unread_count=1')->assertUnauthorized();
        $this->withSession(['user_id' => 1, 'user_role' => 'passenger'])
            ->getJson('/api/notifications?include_unread_count=1')
            ->assertOk()
            ->assertJsonPath('unread', 51)
            ->assertJsonCount(50, 'notifications')
            ->assertJsonPath('sos_alerts.0.id', $alertId)
            ->assertJsonPath('sos_alerts.0.status', 'active');

        $this->getJson('/api/notifications/unread-count')->assertOk()->assertJsonPath('unread', 51);
        $this->getJson('/api/notifications')->assertOk()->assertJsonMissingPath('unread');
        $this->assertDatabaseHas('sos_alerts', ['id' => $alertId, 'status' => 'active']);
    }

    private function createSosTables(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::create('circles', function (Blueprint $table) {
            $table->id();
            $table->integer('owner_user_id');
        });
        Schema::create('circle_members', function (Blueprint $table) {
            $table->id();
            $table->integer('circle_id');
            $table->integer('user_id');
        });
        Schema::create('sos_alerts', function (Blueprint $table) {
            $table->id();
            $table->integer('sender_user_id');
            $table->integer('recipient_user_id');
            $table->string('location_text');
            $table->string('status');
            $table->timestamps();
        });
        Schema::create('user_fcm_tokens', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('fcm_token');
        });
        DB::table('users')->insert([
            ['id' => 1, 'name' => 'Sender'],
            ['id' => 2, 'name' => 'Passenger'],
            ['id' => 3, 'name' => 'Other passenger'],
        ]);
    }

    public function test_sos_requires_circle_members_even_with_client_supplied_recipients(): void
    {
        $this->createSosTables();
        $this->mock(\App\Services\FirebaseNotificationService::class, function ($mock) {
            $mock->shouldNotReceive('sendNotification');
        });
        $this->withSession(['user_id' => 1, 'user_role' => 'passenger']);

        $this->postJson('/api/sos/send', ['location_text' => 'Test location'])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Your circle is empty. Add someone to your circle before sending an SOS.');

        DB::table('circles')->insert(['owner_user_id' => 1]);
        $this->postJson('/api/sos/send', ['recipients' => [2, 3], 'location_text' => 'Test location'])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);
        $this->assertDatabaseCount('sos_alerts', 0);
    }

    public function test_sos_sends_only_to_circle_members_without_returning_credentials_or_device_tokens(): void
    {
        $this->createSosTables();
        $circleId = DB::table('circles')->insertGetId(['owner_user_id' => 1]);
        DB::table('circle_members')->insert(['circle_id' => $circleId, 'user_id' => 2]);
        DB::table('user_fcm_tokens')->insert([
            ['user_id' => 2, 'fcm_token' => 'private-recipient-token'],
            ['user_id' => 3, 'fcm_token' => 'unrelated-device-token'],
        ]);
        $this->mock(\App\Services\FirebaseNotificationService::class, function ($mock) {
            $mock->shouldReceive('sendNotification')->once()
                ->withArgs(fn (array $tokens) => $tokens === ['private-recipient-token'])
                ->andReturn(['sent_count' => 1]);
            $mock->shouldNotReceive('generateSignedJwt');
        });
        $response = $this->withSession(['user_id' => 1, 'user_role' => 'passenger', 'user_name' => 'Test user'])
            ->postJson('/api/sos/send', ['recipients' => [1, 3], 'location_text' => 'Test location']);
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('sent_to', [2])
            ->assertJsonPath('push_sent_count', 1)
            ->assertJsonMissingPath('jwt')
            ->assertJsonMissingPath('fcm_tokens')
            ->assertJsonMissingPath('project_id');
        $this->assertDatabaseCount('sos_alerts', 1);
        $this->assertDatabaseHas('sos_alerts', ['sender_user_id' => 1, 'recipient_user_id' => 2, 'status' => 'active']);
    }
}
