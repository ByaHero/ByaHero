<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('waiting_passengers', function (Blueprint $table) {
            if (!Schema::hasColumn('waiting_passengers', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('status');
            }
        });

        // Backfill existing 'waiting' records: expires 1 hour from when they were created
        DB::table('waiting_passengers')
            ->where('status', 'waiting')
            ->whereNull('expires_at')
            ->update([
                'expires_at' => DB::raw('DATE_ADD(created_at, INTERVAL 1 HOUR)')
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('waiting_passengers', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
    }
};
