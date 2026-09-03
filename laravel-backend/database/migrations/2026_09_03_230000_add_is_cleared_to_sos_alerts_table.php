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
        if (!Schema::hasColumn('sos_alerts', 'is_cleared')) {
            Schema::table('sos_alerts', function (Blueprint $table) {
                $table->boolean('is_cleared')->default(false);
            });
        }

        try {
            DB::statement("ALTER TABLE sos_alerts MODIFY COLUMN status ENUM('active','resolved','seen','cleared') DEFAULT 'active'");
        } catch (\Throwable $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('sos_alerts', 'is_cleared')) {
            Schema::table('sos_alerts', function (Blueprint $table) {
                $table->dropColumn('is_cleared');
            });
        }
    }
};
