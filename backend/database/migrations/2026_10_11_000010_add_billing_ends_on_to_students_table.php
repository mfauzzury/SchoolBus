<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Last calendar month a student is billed for, stored as the first day of
     * that month (null = keep billing until they are suspended or withdrawn).
     * Mirrors billing_starts_on.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->date('billing_ends_on')->nullable()->after('billing_starts_on');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('billing_ends_on');
        });
    }
};
