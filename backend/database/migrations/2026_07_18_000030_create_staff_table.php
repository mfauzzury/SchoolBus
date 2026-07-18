<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('ic_number');
            $table->string('phone');
            $table->string('role');
            $table->date('license_expiry_date')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
