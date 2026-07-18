<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->string('name');
            $table->string('zone')->nullable();
            $table->string('school_destination')->nullable();
            $table->foreignId('bus_id')->nullable()->constrained('buses')->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('conductor_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->decimal('base_monthly_fee', 10, 2)->nullable();
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
