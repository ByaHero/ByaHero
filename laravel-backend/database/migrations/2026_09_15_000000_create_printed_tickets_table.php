<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('printed_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('operation_id');
            $table->string('ticket_number', 50);
            $table->decimal('fare', 8, 2)->default(0);
            $table->string('discount_type', 50)->default('Regular');
            $table->integer('quantity')->default(1);
            $table->string('boarding_location', 255)->nullable();
            $table->string('alighting_location', 255)->nullable();
            $table->dateTime('printed_at');
            $table->timestamp('created_at')->useCurrent();
            
            $table->index('operation_id', 'idx_op_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('printed_tickets');
    }
};
