<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('company_name');
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
