<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            // Both optional. Engine capacity is the engine size in cc (not seats: that is `capacity`).
            $table->string('model', 100)->nullable()->after('plate_number');
            $table->unsignedInteger('engine_capacity')->nullable()->after('capacity');
        });
    }

    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropColumn(['model', 'engine_capacity']);
        });
    }
};
