<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const MONTHS = ['monthly' => 1, 'quarterly' => 3, 'half_year' => 6, 'yearly' => 12];

    /**
     * First calendar month a student is billed for (null = no limit).
     *
     * Bills used to run from each student's join date (17th to 17th) and could
     * charge several months at once. Moving to calendar months, an already-billed
     * student must not be charged twice for the same days, so their calendar
     * billing starts at the first month their existing bills don't touch at all.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->date('billing_starts_on')->nullable()->after('fee_override');
        });

        $coveredUntil = [];

        DB::table('invoices')
            ->whereNotNull('period_start')
            ->orderBy('id')
            ->each(function ($invoice) use (&$coveredUntil) {
                $months = self::MONTHS[$invoice->billing_period] ?? 1;
                $end = Carbon::parse($invoice->period_start)->addMonthsNoOverflow($months);

                if (! isset($coveredUntil[$invoice->student_id]) || $end->gt($coveredUntil[$invoice->student_id])) {
                    $coveredUntil[$invoice->student_id] = $end;
                }
            });

        foreach ($coveredUntil as $studentId => $end) {
            // $end is exclusive: a bill ending on the 1st covers up to the last day
            // of the previous month, so that month is the next one to bill.
            $startsOn = $end->day === 1 ? $end : $end->copy()->startOfMonth()->addMonth();

            DB::table('students')->where('id', $studentId)->update([
                'billing_starts_on' => $startsOn->toDateString(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('billing_starts_on');
        });
    }
};
