<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ConductorReceiptTest extends TestCase
{
    public function test_public_stateless_endpoints_do_not_overwrite_session_cookie(): void
    {
        $ping = $this->getJson('/api/ping')->assertOk();
        $this->assertEmpty($ping->headers->getCookies(), '/api/ping must not emit session Set-Cookie headers');
    }

    public function test_conductor_receipt_config_reflects_admin_settings_and_latest_ticket_number(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique();
            $table->text('setting_value')->nullable();
            $table->timestamps();
        });
        Schema::create('printed_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('operation_id');
            $table->string('ticket_number', 50);
            $table->decimal('fare', 10, 2)->default(0);
            $table->string('discount_type')->default('Regular');
            $table->integer('quantity')->default(1);
            $table->string('boarding_location')->nullable();
            $table->string('alighting_location')->nullable();
            $table->timestamp('printed_at')->nullable();
        });

        DB::table('system_settings')->insert([
            ['setting_key' => 'receipt_company_name', 'setting_value' => 'ByaHero TEST'],
            ['setting_key' => 'receipt_client_name', 'setting_value' => 'Magnificat Transport Cooperative'],
            ['setting_key' => 'receipt_header_message', 'setting_value' => 'Welcome aboard!'],
            ['setting_key' => 'receipt_footer_message', 'setting_value' => 'Thank you for your cooperation'],
        ]);

        DB::table('printed_tickets')->insert([
            ['operation_id' => 1, 'ticket_number' => '00337', 'fare' => 19.00, 'discount_type' => 'PWD', 'quantity' => 1],
            ['operation_id' => 2, 'ticket_number' => '00002', 'fare' => 15.00, 'discount_type' => 'Regular', 'quantity' => 1],
        ]);

        $this->withSession(['user_id' => 7, 'user_role' => 'conductor'])
            ->getJson('/api/conductor/receipt-config')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('config.company_name', 'ByaHero TEST')
            ->assertJsonPath('config.client_name', 'Magnificat Transport Cooperative')
            ->assertJsonPath('config.header_message', 'Welcome aboard!')
            ->assertJsonPath('config.footer_message', 'Thank you for your cooperation')
            ->assertJsonPath('latest_ticket_number', '00337')
            ->assertJsonPath('next_ticket_number', 338);
    }

    public function test_print_ticket_increments_from_highest_existing_ticket_and_resolves_ongoing_operation(): void
    {
        Schema::create('bus_operations', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('bus_id');
            $table->unsignedInteger('conductor_id');
            $table->string('route')->nullable();
            $table->string('status')->default('ongoing');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });
        Schema::create('printed_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('operation_id');
            $table->string('ticket_number', 50);
            $table->decimal('fare', 10, 2)->default(0);
            $table->string('discount_type')->default('Regular');
            $table->integer('quantity')->default(1);
            $table->string('boarding_location')->nullable();
            $table->string('alighting_location')->nullable();
            $table->timestamp('printed_at')->nullable();
        });

        $opId = DB::table('bus_operations')->insertGetId([
            'bus_id' => 1,
            'conductor_id' => 7,
            'route' => 'Laurel - Tanauan',
            'status' => 'ongoing',
        ]);

        DB::table('printed_tickets')->insert([
            ['operation_id' => $opId, 'ticket_number' => '00337', 'fare' => 19.00, 'discount_type' => 'PWD', 'quantity' => 1],
            ['operation_id' => $opId, 'ticket_number' => '00002', 'fare' => 15.00, 'discount_type' => 'Regular', 'quantity' => 1],
        ]);

        $this->withSession(['user_id' => 7, 'user_role' => 'conductor'])
            ->postJson('/api/conductor/print-ticket', [
                'operation_id' => 'offline_op_123456',
                'fare' => 15.00,
                'discount_type' => 'Regular',
                'quantity' => 1,
                'boarding_location' => 'Balas',
                'alighting_location' => 'Tumaway',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('ticket_number', '00338');
    }
}

