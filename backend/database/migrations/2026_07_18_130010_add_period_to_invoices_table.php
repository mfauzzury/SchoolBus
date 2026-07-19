<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('billing_period');
            $table->date('period_end')->nullable()->after('period_start');
            $table->index(['student_id', 'period_start']);
        });

        DB::table('invoices')->orderBy('id')->each(function ($invoice) {
            $start = $invoice->issued_at
                ? Carbon::parse($invoice->issued_at)->toDateString()
                : Carbon::parse($invoice->due_date ?? now())->subDays(7)->toDateString();

            DB::table('invoices')->where('id', $invoice->id)->update([
                'period_start' => $start,
                'period_end' => Carbon::parse($start)->addMonthNoOverflow()->toDateString(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'period_start']);
            $table->dropColumn(['period_start', 'period_end']);
        });
    }
};
