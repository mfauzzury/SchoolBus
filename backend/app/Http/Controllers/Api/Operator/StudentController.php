<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with([
            'parentProfile:id,full_name,phone,email',
            'route:id,name',
            'pickupStop:id,name',
            'invoices' => fn ($q) => $q->latest('issued_at')->limit(1),
        ]);

        if ($request->filled('route_id')) {
            $query->where('route_id', $request->integer('route_id'));
        }

        if ($request->filled('status')) {
            $query->where('enrollment_status', $request->string('status'));
        }

        return $query->orderBy('full_name')->get();
    }
}
