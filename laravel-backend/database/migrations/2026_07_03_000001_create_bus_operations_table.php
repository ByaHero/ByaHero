<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bus_operations', function (Blueprint $table) {
            $table->unsignedInteger('id', true);
            $table->unsignedInteger('bus_id');
            $table->unsignedInteger('conductor_id');
            $table->string('route', 100);
            $table->unsignedInteger('pre_departure_count')->default(0);
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->string('start_location', 100)->nullable();
            $table->string('end_location', 100)->nullable();
            $table->unsignedInteger('total_boarded')->default(0);
            $table->unsignedInteger('total_departed')->default(0);
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['bus_id', 'started_at'], 'idx_bus_date');
            $table->index('conductor_id', 'idx_conductor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_operations');
    }
};
