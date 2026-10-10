<?php

namespace App\Services;

use App\Models\Payment;

/**
 * Works out what one payment's receipt shows. Kept apart from the PDF step so
 * the figures — what was paid before, and what is still owed — can be tested
 * without decoding a PDF.
 */
class ReceiptBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function viewData(Payment $payment): array
    {
        $payment->loadMissing([
            'invoice.student.parentProfile',
            'invoice.route',
            'invoice.items',
            'invoice.payments',
            'busOperator',
        ]);

        $invoice = $payment->invoice;

        // The bill's payments in the order they happened, id breaking ties,
        // so a payment is judged against only what came before it.
        $ordered = $invoice->payments
            ->sortBy([['payment_date', 'asc'], ['id', 'asc']])
            ->values();
        $position = $ordered->search(fn ($other) => $other->id === $payment->id);

        $paidBefore = round((float) $ordered->slice(0, $position)->sum('amount_paid'), 2);
        $paidAfter = round($paidBefore + (float) $payment->amount_paid, 2);

        return [
            'payment' => $payment,
            'invoice' => $invoice,
            'tenant' => $payment->busOperator,
            'student' => $invoice->student,
            'parentProfile' => $invoice->student->parentProfile,
            'paidBefore' => $paidBefore,
            // Never negative: an adjustment made after the payment can only ever settle the bill.
            'balanceAfter' => max(0.0, round((float) $invoice->final_amount - $paidAfter, 2)),
        ];
    }
}
