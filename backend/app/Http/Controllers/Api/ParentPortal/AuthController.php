<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Mobile login for the native parent app: same email + password as the
     * web portal, but returns a Sanctum bearer token instead of starting a
     * cookie session. Only parent accounts may use it — operator staff and
     * drivers get the same generic error rather than a token for the wrong app.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string|max:255',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password) || ! $user->hasRole('parent')) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        if ($user->busOperator?->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'This service is not available right now.',
            ]);
        }

        $token = $user->createToken($data['device_name'] ?? 'parent-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->makeHidden('roles'),
            'parentProfile' => $user->parentProfile,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
