<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passenger_rides', function (Blueprint $table) {
            $table->unsignedInteger('id', true);
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('operation_id');
            $table->dateTime('boarded_at');
            $table->dateTime('departed_at')->nullable();
            $table->enum('status', ['active', 'completed'])->default('active');

            $table->index('user_id', 'idx_user');
            $table->index('operation_id', 'idx_operation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passenger_rides');
    }
};
