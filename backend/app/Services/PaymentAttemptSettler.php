<?php

namespace App\Services;

use App\Enums\PaymentAttemptStatus;
use App\Models\PaymentAttempt;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Turns a confirmed-paid Billplz bill into Payment rows and paid invoices.
 *
 * Billplz delivers the callback (up to 5 times) and the browser redirect in no
 * guaranteed order, so settling must be idempotent: the first caller wins under
 * a row lock and every later one is a no-op.
 */
class PaymentAttemptSettler
{
    /**
     * @return bool true if this call settled the attempt, false if it already was.
     */
    public function settle(PaymentAttempt $attempt, ?CarbonInterface $paidAt = null): bool
    {
        $payments = [];

        $settled = DB::transaction(function () use ($attempt, $paidAt, &$payments) {
            // The webhook has no tenant context, so bypass TenantScope explicitly.
            $locked = PaymentAttempt::withoutGlobalScopes()
                ->whereKey($attempt->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status === PaymentAttemptStatus::Paid) {
                return false;
            }

            $paidAt ??= now();

            // The date on the receipt is the operator's local date, not UTC —
            // otherwise a payment at 1am Malaysia time is dated the day before.
            $paymentDate = Carbon::instance($paidAt)->setTimezone(config('app.billing_timezone'))->toDateString();

            foreach ($locked->invoices()->withoutGlobalScopes()->get() as $invoice) {
                $payments[] = $invoice->recordPayment([
                    'method' => 'online',
                    'reference_number' => $locked->billplz_bill_id,
                    'payment_date' => $paymentDate,
                    'amount_paid' => $invoice->pivot->amount,
                ]);
            }

            $locked->update(['status' => PaymentAttemptStatus::Paid, 'paid_at' => $paidAt]);

            return true;
        });

        // Only the call that really settled it announces it; Billplz retries land here as no-ops.
        if ($settled) {
            app(Notifier::class)->paymentReceived($payments);
        }

        return $settled;
    }
}
