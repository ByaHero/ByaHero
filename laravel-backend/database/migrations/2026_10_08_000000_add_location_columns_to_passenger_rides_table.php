<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('passenger_rides', function (Blueprint $table) {
            if (!Schema::hasColumn('passenger_rides', 'board_location')) {
                $table->string('board_location', 255)->nullable()->after('departed_at');
            }
            if (!Schema::hasColumn('passenger_rides', 'depart_location')) {
                $table->string('depart_location', 255)->nullable()->after('board_location');
            }
        });
    }

    public function down(): void
    {
        Schema::table('passenger_rides', function (Blueprint $table) {
            if (Schema::hasColumn('passenger_rides', 'board_location')) {
                $table->dropColumn('board_location');
            }
            if (Schema::hasColumn('passenger_rides', 'depart_location')) {
                $table->dropColumn('depart_location');
            }
        });
    }
};
