<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passenger_events', function (Blueprint $table) {
            $table->unsignedInteger('id', true);
            $table->unsignedInteger('operation_id');
            $table->enum('event_type', ['board', 'depart']);
            $table->unsignedInteger('count')->default(1);
            $table->string('location_name', 100)->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->dateTime('recorded_at');

            $table->index('operation_id', 'idx_operation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passenger_events');
    }
};
