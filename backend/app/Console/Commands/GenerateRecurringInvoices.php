<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Services\InvoiceGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Phone-bill-style recurring billing: once an active student's current
 * invoice period ends, issue their next month's invoice — regardless of
 * whether the previous one was paid, same as a postpaid phone line.
 * Suspending/withdrawing a student (enrollment_status) stops future bills.
 */
class GenerateRecurringInvoices extends Command
{
    protected $signature = 'invoices:generate-recurring';

    protected $description = "Issue each active student's next monthly invoice once their current billing period has ended.";

    public function handle(InvoiceGenerator $generator): int
    {
        $count = 0;

        Student::query()
            ->where('enrollment_status', 'active')
            ->has('invoices')
            ->chunk(100, function ($students) use ($generator, &$count) {
                foreach ($students as $student) {
                    $latest = $student->invoices()->latest('period_end')->first();

                    if (! $latest?->period_end) {
                        continue;
                    }

                    $nextPeriodStart = Carbon::parse($latest->period_end);

                    if ($nextPeriodStart->isFuture()) {
                        continue;
                    }

                    $alreadyBilled = $student->invoices()
                        ->whereDate('period_start', $nextPeriodStart)
                        ->exists();

                    if ($alreadyBilled) {
                        continue;
                    }

                    $generator->generateForPeriod($student, $nextPeriodStart);
                    $count++;
                }
            });

        $this->info("Generated {$count} recurring invoice(s).");

        return self::SUCCESS;
    }
}
