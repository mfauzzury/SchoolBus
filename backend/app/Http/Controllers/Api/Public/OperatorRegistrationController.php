<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\User;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class OperatorRegistrationController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|unique:bus_operators,email',
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ]);

        $user = DB::transaction(function () use ($data) {
            $tenant = BusOperator::create([
                'company_name' => $data['company_name'],
                'contact_person' => $data['contact_person'],
                'contact_phone' => $data['contact_phone'],
                'email' => $data['email'],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['contact_person'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->assignRole('operator_admin');

            return $user;
        });

        // They are logged in right now, so count it as a login (the dashboard's
        // "no login in 30 days" would otherwise flag every brand-new operator).
        $user->forceFill(['last_login_at' => now()])->save();

        app(Notifier::class)->operatorSignedUp($user->busOperator);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Registered'], 201);
    }
}
