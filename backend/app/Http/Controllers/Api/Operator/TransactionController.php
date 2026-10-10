<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Concerns\GeneratesReceipts;
use App\Http\Controllers\Concerns\SearchesStudents;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

/**
 * The operator's money-in list: every payment received, however it was paid.
 * The invoice ledger answers "what is owed"; this answers "what came in, when".
 */
class TransactionController extends Controller
{
    use GeneratesReceipts, SearchesStudents;

    public function index(Request $request)
    {
        return $this->filteredPayments($request)->get();
    }

    /** The receipt for one payment, for staff and admins of the operator that took it. */
    public function receipt(Payment $payment)
    {
        return $this->receiptResponse($payment);
    }

    public function export(Request $request)
    {
        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Payment Date', 'Student', 'Route', 'Bill Period', 'Method', 'Reference', 'Amount']);

        foreach ($this->filteredPayments($request)->get() as $payment) {
            fputcsv($csv, [
                $payment->payment_date?->toDateString(),
                $payment->invoice?->student?->full_name,
                $payment->invoice?->route?->name,
                $payment->invoice?->period_start?->format('Y-m'),
                $payment->method,
                $payment->reference_number,
                $payment->amount_paid,
            ]);
        }

        rewind($csv);
        $body = stream_get_contents($csv);
        fclose($csv);

        return Response::make($body, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="transactions.csv"',
        ]);
    }

    private function filteredPayments(Request $request): Builder
    {
        $query = Payment::query()
            ->with(['invoice.student', 'invoice.route'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id');

        if ($request->filled('route_id')) {
            $query->whereHas('invoice', fn (Builder $invoice) => $invoice->where('route_id', $request->integer('route_id')));
        }

        if ($request->filled('search')) {
            $query->whereHas('invoice.student', fn (Builder $student) => $this->matchStudentSearch($student, $request));
        }

        if ($request->filled('method')) {
            $query->where('method', $request->input('method'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', $request->date('date_to'));
        }

        return $query;
    }
}
