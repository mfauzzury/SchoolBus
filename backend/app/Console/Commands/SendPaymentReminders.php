<?php

namespace App\Console\Commands;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Notifications\PaymentReminder;
use App\Services\InvoiceGenerator;
use App\Services\Notifier;
use Illuminate\Console\Command;

/**
 * Two reminders per bill, no more: three days before the due date, and the
 * day after it passes. Runs each morning; re-running the same day sends nothing
 * twice (the notifier remembers), and suspended operators' parents are left alone.
 */
class SendPaymentReminders extends Command
{
    protected $signature = 'notifications:send-reminders';

    protected $description = 'Email parents a reminder for bills due in 3 days and bills that became overdue yesterday.';

    public function handle(Notifier $notifier): int
    {
        $today = InvoiceGenerator::today();

        $due = [
            PaymentReminder::DUE_SOON => $today->copy()->addDays(3),
            PaymentReminder::OVERDUE => $today->copy()->subDay(),
        ];

        foreach ($due as $kind => $date) {
            $invoices = Invoice::withoutGlobalScopes()
                ->where('status', InvoiceStatus::Issued)
                ->whereDate('due_date', $date->toDateString())
                ->with(['student.parentProfile.user', 'busOperator'])
                ->get()
                ->filter(fn (Invoice $invoice) => $invoice->balance() > 0 && ! $invoice->busOperator?->isSuspended());

            $notifier->reminders($kind, $invoices);

            $this->info("{$kind}: {$invoices->count()} bill(s) checked.");
        }

        return self::SUCCESS;
    }
}
