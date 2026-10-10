<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Services\BillplzService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Platform-admin-only: operators never see or edit their own gateway credentials.
 */
class BillplzSettingsController extends Controller
{
    public function update(Request $request, BusOperator $operator)
    {
        $data = $request->validate([
            // Required the first time; afterwards omitted/blank keeps the stored key,
            // since the keys are never sent back to the browser to be re-submitted.
            'secret_key' => [Rule::requiredIf(blank($operator->billplz_secret_key)), 'nullable', 'string', 'max:255'],
            'x_signature_key' => [Rule::requiredIf(blank($operator->billplz_x_signature_key)), 'nullable', 'string', 'max:255'],
            'collection_id' => 'required|string|max:255',
            'sandbox' => 'required|boolean',
        ]);

        $operator->billplz_collection_id = $data['collection_id'];
        $operator->billplz_sandbox = $data['sandbox'];

        if (filled($data['secret_key'] ?? null)) {
            $operator->billplz_secret_key = $data['secret_key'];
        }

        if (filled($data['x_signature_key'] ?? null)) {
            $operator->billplz_x_signature_key = $data['x_signature_key'];
        }

        $operator->save();

        return $operator->billplzSummary();
    }

    /**
     * "Is this actually connected?" — always 200 with a result the UI can show,
     * since a bad key is an expected outcome, not a server error.
     */
    public function test(BusOperator $operator)
    {
        abort_unless($operator->hasBillplz(), 422, 'Save the Billplz credentials first.');

        return (new BillplzService($operator))->checkConnection();
    }

    public function destroy(BusOperator $operator)
    {
        $operator->forceFill([
            'billplz_secret_key' => null,
            'billplz_x_signature_key' => null,
            'billplz_collection_id' => null,
            'billplz_sandbox' => false,
        ])->save();

        return $operator->billplzSummary();
    }
}
