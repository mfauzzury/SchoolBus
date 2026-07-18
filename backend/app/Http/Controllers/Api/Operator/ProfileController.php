<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $tenant = $request->user()->busOperator;

        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('bus_operators', 'email')->ignore($tenant->id)],
            'bank_details' => 'nullable|array',
            'bank_details.bank_name' => 'nullable|string|max:255',
            'bank_details.account_number' => 'nullable|string|max:255',
            'bank_details.account_holder' => 'nullable|string|max:255',
        ]);

        $tenant->update($data);

        return $tenant->fresh();
    }

    public function updateLogo(Request $request)
    {
        $tenant = $request->user()->busOperator;

        $request->validate([
            'logo' => 'required|image|max:2048',
        ]);

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $tenant->update(['logo_path' => $path]);

        return $tenant->fresh();
    }
}
