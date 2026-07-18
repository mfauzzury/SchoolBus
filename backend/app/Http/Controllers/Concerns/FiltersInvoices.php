<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Shared invoice filter set (spec §4.3: by route, by month, by payment status, by date range),
 * used by both the ledger listing/export and the dashboard summary so they always agree.
 */
trait FiltersInvoices
{
    private function filteredInvoices(Request $request): Builder
    {
        $query = Invoice::query();

        if ($request->filled('route_id')) {
            $query->where('route_id', $request->integer('route_id'));
        }

        if ($request->filled('status')) {
            // 'overdue' is never stored — it's an issued invoice past its due date,
            // computed at query time rather than flipped by a scheduled job.
            // Note: $request->string() returns a Stringable, not a plain string —
            // comparing it with === against a string literal is always false.
            if ($request->input('status') === 'overdue') {
                $query->where('status', InvoiceStatus::Issued)->whereDate('due_date', '<', now());
            } else {
                $query->where('status', $request->input('status'));
            }
        }

        if ($request->filled('month')) {
            [$year, $month] = explode('-', $request->string('month'));
            $query->whereYear('issued_at', $year)->whereMonth('issued_at', $month);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issued_at', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issued_at', '<=', $request->date('date_to'));
        }

        return $query;
    }
}
