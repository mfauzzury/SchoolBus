<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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

        return $profile->fresh();
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
