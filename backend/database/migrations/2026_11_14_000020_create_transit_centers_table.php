<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A transit center (tuition / daycare) where children stay between school
     * and home. Each one belongs to one operator, who adds it and gives it a
     * login (user_id) to ask for buses for its children.
     */
    public function up(): void
    {
        Schema::create('transit_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('phone');
            $table->string('email');
            $table->string('address')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transit_centers');
    }
};
