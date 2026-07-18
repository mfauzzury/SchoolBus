<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $studentIds = $request->user()->parentProfile->students()->pluck('id');

        return Invoice::with('student')
            ->whereIn('student_id', $studentIds)
            ->orderByDesc('created_at')
            ->get();
    }
}
