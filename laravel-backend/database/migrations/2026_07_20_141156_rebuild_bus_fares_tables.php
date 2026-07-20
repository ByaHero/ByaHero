<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First drop existing tables to rebuild them cleanly
        Schema::dropIfExists('bus_fare_snapshot_rows');
        Schema::dropIfExists('bus_fare_snapshots');
        Schema::dropIfExists('bus_fares');

        // 1. Create the new compact bus_fare_rules table (reusing the name bus_fares for compatibility with other queries)
        Schema::create('bus_fares', function (Blueprint $table) {
            $table->id('fare_id'); // Keeps old primary key name
            $table->string('direction', 2)->comment('LT for Laurel->Tanauan, TL for Tanauan->Laurel');
            $table->integer('distance_km');
            $table->unsignedBigInteger('stop_id'); // Reference to the stop at this distance
            $table->decimal('regular_fare', 8, 2);
            $table->decimal('discounted_fare', 8, 2);
            $table->decimal('base_regular_fare', 8, 2)->nullable();
            $table->decimal('base_discounted_fare', 8, 2)->nullable();
            $table->timestamps();
        });

        // 2. Recreate snapshots
        Schema::create('bus_fare_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('label')->nullable();
            $table->timestamps();
        });

        Schema::create('bus_fare_snapshot_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_id')->constrained('bus_fare_snapshots')->onDelete('cascade');
            $table->unsignedBigInteger('fare_id');
            $table->string('direction', 2);
            $table->integer('distance_km');
            $table->unsignedBigInteger('stop_id');
            $table->decimal('regular_fare', 8, 2);
            $table->decimal('discounted_fare', 8, 2);
            $table->decimal('base_regular_fare', 8, 2)->nullable();
            $table->decimal('base_discounted_fare', 8, 2)->nullable();
            $table->timestamps();
        });

        // 3. SEED THE TABLE WITH THE 62 ROWS based on existing bus_stops!
        // This ensures the application works immediately after migration.
        $this->seedFaresTable();
    }

    private function seedFaresTable()
    {
        $stops = DB::table('bus_stops')->where('is_active', 1)->orderBy('km_marker', 'asc')->get();
        if ($stops->isEmpty()) return;

        $maxKm = $stops->max('km_marker');
        
        $insertData = [];
        // Direction LT (Laurel -> Tanauan)
        // Laurel is at KM 0, Tanauan is at maxKm (usually 30)
        foreach ($stops as $stop) {
            $distance = $stop->km_marker;
            $insertData[] = [
                'direction' => 'LT',
                'distance_km' => $distance,
                'stop_id' => $stop->stop_id,
                'regular_fare' => $this->calcFare($distance, 14.00, 2.20),
                'discounted_fare' => $this->calcFare($distance, 11.25, 1.76),
                'base_regular_fare' => 14.00,
                'base_discounted_fare' => 11.25,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Direction TL (Tanauan -> Laurel)
        // Tanauan is at KM 0 from its perspective.
        // Laurel is at maxKm. 
        // Stop's distance from Tanauan = maxKm - stop->km_marker.
        // Sort descending so Tanauan is first.
        $stopsTL = $stops->sortByDesc('km_marker');
        foreach ($stopsTL as $stop) {
            $distance = $maxKm - $stop->km_marker;
            $insertData[] = [
                'direction' => 'TL',
                'distance_km' => $distance,
                'stop_id' => $stop->stop_id,
                'regular_fare' => $this->calcFare($distance, 14.00, 2.20),
                'discounted_fare' => $this->calcFare($distance, 11.25, 1.76),
                'base_regular_fare' => 14.00,
                'base_discounted_fare' => 11.25,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('bus_fares')->insert($insertData);
    }

    private function calcFare($distance, $base, $rate)
    {
        // ROUND((base + GREATEST(0, distance - 4) * rate) * 4) / 4
        $val = $base + max(0, $distance - 4) * $rate;
        return round($val * 4) / 4;
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_fare_snapshot_rows');
        Schema::dropIfExists('bus_fare_snapshots');
        Schema::dropIfExists('bus_fares');
        
        // Revert to old table (abbreviated, won't restore data automatically)
        Schema::create('bus_fares', function (Blueprint $table) {
            $table->id('fare_id');
            $table->unsignedBigInteger('origin_stop_id');
            $table->unsignedBigInteger('destination_stop_id');
            $table->decimal('regular_fare', 8, 2);
            $table->decimal('discounted_fare', 8, 2);
            $table->integer('distance_km')->nullable();
            $table->decimal('base_regular_fare', 8, 2)->nullable();
            $table->decimal('base_discounted_fare', 8, 2)->nullable();
            $table->timestamps();
        });
    }
};
