<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'boolean',
        ]);

        $credentials = ['email' => $data['email'], 'password' => $data['password']];

        // "Remember me" issues Laravel's long-lived remember cookie (via the
        // users.remember_token column) so the session survives the browser closing,
        // not just a longer session lifetime.
        if (! Auth::attempt($credentials, $data['remember'] ?? false)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json(['message' => 'Logged in']);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $roles = $user->getRoleNames();

        return response()->json([
            'user' => $user->makeHidden('roles'),
            'tenant' => $user->busOperator,
            'parentProfile' => $user->parentProfile,
            'roles' => $roles,
        ]);
    }
}
