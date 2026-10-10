<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\PackageType;
use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Services\FeeCalculator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class QuoteController extends Controller
{
    public function __construct(private readonly FeeCalculator $feeCalculator)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            // Tenant-scoped (see ParentPortal\StudentController for why the
            // plain 'exists:routes,id' string is unsafe here).
            'route_id' => ['required', Rule::exists('routes', 'id')->where('tenant_id', $request->user()->tenant_id)],
            'package_type' => ['required', Rule::in(['one_way', 'return'])],
        ]);

        $monthlyFee = Route::findOrFail($data['route_id'])->feeFor(PackageType::from($data['package_type']));

        if ($monthlyFee === null) {
            return response()->json(['message' => 'This route has no rate card configured yet.'], 422);
        }

        $parent = $request->user()->parentProfile;
        $childPosition = $parent ? $parent->students()->count() + 1 : 1;

        return $this->feeCalculator->calculate(
            tenant: $request->user()->busOperator,
            monthlyFee: $monthlyFee,
            childPosition: $childPosition,
        );
    }
}
