<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Support\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $payments = $this->filtered($request)
            ->with(['invoice.student', 'invoice.route', 'busOperator'])
            ->paginate(25);

        // Totals cover everything the filters match, not just this page.
        $totals = $this->filtered($request)->reorder();

        return [
            ...$payments->toArray(),
            'totals' => [
                'count' => (clone $totals)->count(),
                'amount' => round((float) (clone $totals)->sum('amount_paid'), 2),
            ],
        ];
    }

    public function export(Request $request)
    {
        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Payment Date', 'Operator', 'Operator Code', 'Student', 'Route', 'Method', 'Reference', 'Amount']);

        $this->filtered($request)
            ->with(['invoice.student', 'invoice.route', 'busOperator'])
            ->lazyById(500)
            ->each(function (Payment $payment) use ($csv) {
                fputcsv($csv, array_map($this->safeCell(...), [
                    $payment->payment_date?->toDateString(),
                    $payment->busOperator?->company_name,
                    $payment->busOperator?->operator_code,
                    $payment->invoice?->student?->full_name,
                    $payment->invoice?->route?->name,
                    $payment->method,
                    $payment->reference_number,
                    number_format((float) $payment->amount_paid, 2, '.', ''),
                ]));
            });

        rewind($csv);
        $body = stream_get_contents($csv);
        fclose($csv);

        ActivityLog::record('transactions_exported', $request->integer('operator_id') ?: null, array_filter([
            'method' => $request->input('method'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ]));

        return Response::make($body, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="transactions.csv"',
        ]);
    }

    private function filtered(Request $request): Builder
    {
        $request->validate([
            'operator_id' => 'nullable|integer',
            'method' => ['nullable', Rule::in(['cash', 'bank_transfer', 'fpx', 'online'])],
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = Payment::query()
            ->orderByDesc('payment_date')
            ->orderByDesc('id');

        if ($request->filled('operator_id')) {
            $query->where('tenant_id', $request->integer('operator_id'));
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

    /**
     * Operators type student and route names, and finance opens this file in a
     * spreadsheet: a cell starting with = + - @ would run as a formula there.
     */
    private function safeCell(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && str_contains("=+-@\t\r", $value[0])) {
            return "'".$value;
        }

        return $value;
    }
}
