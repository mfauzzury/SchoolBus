<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Models\SystemStatus;
use App\Services\InvoiceGenerator;
use App\Services\Notifier;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

/**
 * Phone-bill-style recurring billing: every active student gets a bill for
 * the current calendar month — regardless of whether the previous one was
 * paid, same as a postpaid phone line. Months the operator doesn't bill
 * (school holidays) are skipped, and suspending/withdrawing a student
 * (enrollment_status) stops future bills.
 *
 * Runs daily rather than only on the 1st, so a missed run or a student
 * reactivated mid-month is picked up the next day; a month is never billed twice.
 */
class GenerateRecurringInvoices extends Command
{
    protected $signature = 'invoices:generate-recurring';

    protected $description = "Issue each active student's bill for the current month if they don't have one yet.";

    public function handle(InvoiceGenerator $generator, Notifier $notifier): int
    {
        try {
            return $this->generate($generator, $notifier);
        } catch (Throwable $e) {
            // The System page shows this, so a silently broken schedule is noticed.
            SystemStatus::record('invoices_generate_recurring', [
                'ok' => false,
                'message' => class_basename($e).': '.$e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function generate(InvoiceGenerator $generator, Notifier $notifier): int
    {
        $month = InvoiceGenerator::currentMonth();
        $count = 0;
        $skipped = 0;
        $issued = [];

        Student::query()
            ->where('enrollment_status', 'active')
            ->with(['busOperator', 'route'])
            ->chunkById(100, function ($students) use ($generator, $month, &$count, &$skipped, &$issued) {
                foreach ($students as $student) {
                    if (! $generator->isBillable($student, $month) || $generator->invoiceForMonth($student, $month)) {
                        continue;
                    }

                    try {
                        $issued[] = $generator->generateForMonth($student, $month);
                        $count++;
                    } catch (RuntimeException $e) {
                        // One student without a route or price must not stop everyone else's bills.
                        $skipped++;
                        $this->warn("Skipped student #{$student->id}: {$e->getMessage()}");
                    }
                }
            });

        // After the whole run, so a parent with three children gets one email, not three.
        $notifier->billsIssued($issued);

        SystemStatus::record('invoices_generate_recurring', [
            'ok' => true,
            'generated' => $count,
            'skipped' => $skipped,
        ]);

        $this->info("Generated {$count} recurring invoice(s).".($skipped ? " Skipped {$skipped}." : ''));

        return self::SUCCESS;
    }
}
