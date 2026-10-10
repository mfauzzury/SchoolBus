<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->parentProfile
            ->students()
            ->with([
                'route.bus:id,plate_number,capacity,avatar_path',
                'route.driver:id,full_name,phone,avatar_path',
                'route.conductor:id,full_name,phone,avatar_path',
                'route.stops',
                'pickupStop',
                // Cancelled bills were raised by mistake — parents never see them.
                'invoices' => fn ($query) => $query->where('status', '!=', InvoiceStatus::Void),
            ])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Parents may correct who their child is and add their teacher, class and
     * school phone. School, route, package and billing stay with the operator.
     */
    public function update(Request $request, int $student)
    {
        $student = $this->ownStudent($request, $student);

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date|before:today',
            'gender' => ['nullable', Rule::in(['male', 'female'])],
            'teacher_name' => 'nullable|string|max:255',
            'class_name' => 'nullable|string|max:255',
            'school_phone' => 'nullable|string|max:255',
        ]);

        $student->update($data);

        return $student->fresh();
    }

    public function uploadAvatar(Request $request, int $student)
    {
        $student = $this->ownStudent($request, $student);

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        if ($student->avatar_path) {
            Storage::disk('public')->delete($student->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars/students', 'public');
        $student->update(['avatar_path' => $path]);

        return $student->fresh();
    }

    /** A parent can only reach their own children — anyone else's is a 404. */
    private function ownStudent(Request $request, int $id): Student
    {
        return $request->user()->parentProfile->students()->findOrFail($id);
    }
}
