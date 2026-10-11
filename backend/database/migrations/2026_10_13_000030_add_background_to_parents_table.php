<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            // All optional, all answered by the parent themselves ("About you").
            $table->string('income_range')->nullable();
            $table->string('occupation')->nullable();
            $table->string('working_field')->nullable();
            // Set when they save the About form once: stops the "complete your profile" nudge.
            $table->timestamp('about_saved_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->dropColumn(['income_range', 'occupation', 'working_field', 'about_saved_at']);
        });
    }
};
