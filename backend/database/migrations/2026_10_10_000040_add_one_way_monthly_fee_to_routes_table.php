<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * base_monthly_fee is the return-trip price; this is the one-way price.
     * Null means "same as return", so existing routes keep billing as before.
     */
    public function up(): void
    {
        Schema::table('routes', function (Blueprint $table) {
            $table->decimal('one_way_monthly_fee', 10, 2)->nullable()->after('base_monthly_fee');
        });
    }

    public function down(): void
    {
        Schema::table('routes', function (Blueprint $table) {
            $table->dropColumn('one_way_monthly_fee');
        });
    }
};
