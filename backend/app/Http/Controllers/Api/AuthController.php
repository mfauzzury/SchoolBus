<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PlatformAccess;
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

        // A removed platform-team member (deactivated_at set) gets the same
        // generic error as a wrong password — no hint that the account exists.
        $credentials = [
            'email' => $data['email'],
            'password' => $data['password'],
            'deactivated_at' => null,
        ];

        // "Remember me" issues Laravel's long-lived remember cookie (via the
        // users.remember_token column) so the session survives the browser closing,
        // not just a longer session lifetime.
        if (! Auth::attempt($credentials, $data['remember'] ?? false)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        $request->session()->regenerate();

        Auth::user()->forceFill(['last_login_at' => now()])->saveQuietly();

        return response()->json(['message' => 'Logged in']);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    private function impersonation(Request $request): ?array
    {
        if (! $request->hasSession() || ! $request->session()->has('impersonator_id')) {
            return null;
        }

        $admin = User::find($request->session()->get('impersonator_id'));

        return $admin ? ['admin_name' => $admin->name] : null;
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
            // Set while a platform-team member is "logged in as" this operator.
            'impersonating' => $this->impersonation($request),
            // Platform team only: what this level may do, so the UI can hide the rest.
            'permissions' => $user->hasRole(PlatformAccess::OWNER)
                ? PlatformAccess::PERMISSIONS
                : $user->getAllPermissions()->pluck('name')->values(),
        ]);
    }
}
