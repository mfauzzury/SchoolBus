<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Billing is monthly-only for now. The column stays so paying ahead can
     * come back later; past invoices keep the period they were issued with.
     */
    public function up(): void
    {
        DB::table('students')->where('billing_period', '!=', 'monthly')->update(['billing_period' => 'monthly']);
        DB::table('student_applications')->where('billing_period', '!=', 'monthly')->update(['billing_period' => 'monthly']);
    }

    public function down(): void
    {
        // The previous periods aren't recorded, so there is nothing to restore.
    }
};
