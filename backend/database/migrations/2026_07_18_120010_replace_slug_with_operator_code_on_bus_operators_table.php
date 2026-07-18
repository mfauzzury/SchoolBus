<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            // SQLite (used in tests) can't drop a column that's still part of a
            // unique index — drop the index explicitly first.
            $table->dropUnique('bus_operators_slug_unique');
            $table->dropColumn('slug');
            $table->char('operator_code', 4)->nullable()->unique()->after('company_name');
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropUnique(['operator_code']);
            $table->dropColumn('operator_code');
            $table->string('slug')->nullable()->unique()->after('company_name');
        });
    }
};
