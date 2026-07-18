<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bus_operators', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('contact_person');
            $table->string('contact_phone');
            $table->string('email')->unique();
            $table->jsonb('bank_details')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('subscription_plan')->default('free');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_operators');
    }
};
