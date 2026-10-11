<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\ParentProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $profile = $request->user()->parentProfile;

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'relationship' => ['nullable', Rule::in(['father', 'mother', 'guardian'])],
            'gender' => ['nullable', Rule::in(['male', 'female'])],
            'ic_number' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('parents', 'email')->ignore($profile->id)],
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'postcode' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_relationship' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
        ]);

        $profile->update($data);

        return $profile->fresh()->forOwner();
    }

    /**
     * The optional "About you" questions. A separate, small form so a parent can
     * answer them without re-submitting their whole profile. Saving it (even with
     * every answer skipped) ends the "complete your profile" reminder: they have
     * been asked, and no more nagging is the respectful default.
     */
    public function updateAbout(Request $request)
    {
        $data = $request->validate([
            'income_range' => ['nullable', Rule::in(ParentProfile::INCOME_RANGES)],
            'occupation' => 'nullable|string|max:100',
            'working_field' => ['nullable', Rule::in(ParentProfile::WORKING_FIELDS)],
        ]);

        $profile = $request->user()->parentProfile;

        $profile->update([
            'income_range' => $data['income_range'] ?? null,
            'occupation' => filled($data['occupation'] ?? null) ? trim($data['occupation']) : null,
            'working_field' => $data['working_field'] ?? null,
            'about_saved_at' => now(),
        ]);

        return $profile->fresh()->forOwner();
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $user->update(['password' => $data['password']]);

        return response()->json(['message' => 'Password updated.']);
    }

    public function uploadAvatar(Request $request)
    {
        $profile = $request->user()->parentProfile;

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        if ($profile->avatar_path) {
            Storage::disk('public')->delete($profile->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars/parents', 'public');
        $profile->update(['avatar_path' => $path]);

        return $profile->fresh();
    }
}
