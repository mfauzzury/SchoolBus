<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('route_id')->constrained('routes')->cascadeOnDelete();
            $table->string('name');
            $table->integer('sequence');
            $table->timestamps();

            $table->index('tenant_id');
            $table->unique(['route_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
