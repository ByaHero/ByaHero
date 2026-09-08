<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Applies standard LTFRB fare matrix:
     * - Base KM: 4.0
     * - Regular Base Fare: 15.00
     * - Discounted Base Fare: 12.00
     * - Regular Rate: 2.20 / km
     * - Discounted Rate: 1.76 / km
     * - Tanauan - Talisay (16 km) discounted fare: 33.25
     */
    public function up(): void
    {
        if (!Schema::hasTable('bus_fares')) {
            return;
        }

        // Apply standard LTFRB formula to all rows based on distance_km
        DB::statement("
            UPDATE bus_fares 
            SET 
                regular_fare = ROUND((15.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 2.20) * 4) / 4,
                discounted_fare = ROUND((12.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 1.76) * 4) / 4,
                base_regular_fare = ROUND((15.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 2.20) * 4) / 4,
                base_discounted_fare = ROUND((12.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 1.76) * 4) / 4,
                updated_at = NOW()
        ");

        // Tanauan - Talisay is 16 km (must be 33.25 pesos when discounted)
        DB::table('bus_fares')
            ->where('distance_km', 16)
            ->update([
                'discounted_fare' => 33.25,
                'base_discounted_fare' => 33.25,
            ]);

        // Ensure discounted <= regular
        DB::table('bus_fares')
            ->whereRaw('discounted_fare > regular_fare')
            ->update([
                'discounted_fare' => DB::raw('regular_fare'),
                'base_discounted_fare' => DB::raw('regular_fare'),
            ]);
    }

    /**
     * Reverse the migrations.
     * Reverts to previous base fare configuration (14.00 regular base / 11.25 discounted base).
     */
    public function down(): void
    {
        if (!Schema::hasTable('bus_fares')) {
            return;
        }

        DB::statement("
            UPDATE bus_fares 
            SET 
                regular_fare = ROUND((14.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 2.20) * 4) / 4,
                discounted_fare = ROUND((11.25 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 1.76) * 4) / 4,
                base_regular_fare = ROUND((14.00 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 2.20) * 4) / 4,
                base_discounted_fare = ROUND((11.25 + GREATEST(0, COALESCE(distance_km, 0) - 4.0) * 1.76) * 4) / 4,
                updated_at = NOW()
        ");
    }
};
