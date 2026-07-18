<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RegistrationController extends Controller
{
    public function show(string $operatorCode)
    {
        $tenant = BusOperator::where('operator_code', $operatorCode)->firstOrFail();

        return response()->json([
            'company_name' => $tenant->company_name,
            'logo_url' => $tenant->logo_url,
        ]);
    }

    public function store(Request $request, string $operatorCode)
    {
        $tenant = BusOperator::where('operator_code', $operatorCode)->firstOrFail();

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'ic_number' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'address' => 'nullable|string',
            'password' => 'required|string|min:8',
        ]);

        $user = DB::transaction(function () use ($tenant, $data) {
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['full_name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->assignRole('parent');

            ParentProfile::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'full_name' => $data['full_name'],
                'ic_number' => $data['ic_number'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'address' => $data['address'] ?? null,
            ]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Registered'], 201);
    }
}
