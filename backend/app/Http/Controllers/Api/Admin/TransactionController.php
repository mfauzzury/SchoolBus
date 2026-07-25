<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::query()
            ->with(['invoice.student', 'invoice.route', 'busOperator'])
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

        return $query->get();
    }
}
