<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('busses', function (Blueprint $table) {
            $table->boolean('is_in_traffic')->default(0)->after('status');
            $table->integer('traffic_extra_delay_minutes')->default(0)->after('is_in_traffic');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('busses', function (Blueprint $table) {
            $table->dropColumn(['is_in_traffic', 'traffic_extra_delay_minutes']);
        });
    }
};
