<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('parent_id')->constrained('parents')->cascadeOnDelete();
            $table->foreignId('route_id')->nullable()->constrained('routes')->nullOnDelete();
            $table->foreignId('pickup_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->string('full_name');
            $table->date('date_of_birth');
            $table->string('school_name');
            $table->string('package_type');
            $table->string('billing_period');
            $table->string('enrollment_status')->default('active');
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
