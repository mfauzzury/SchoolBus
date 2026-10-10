<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\Plan;
use App\Support\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index()
    {
        return Plan::query()
            ->withCount('operators')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $plan = DB::transaction(function () use ($data) {
            $plan = Plan::create($data);
            $this->keepSingleDefault($plan);

            return $plan;
        });

        ActivityLog::record('plan_created', properties: ['plan' => $plan->name]);

        return response()->json($plan->loadCount('operators'), 201);
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $this->validated($request, $plan);

        DB::transaction(function () use ($plan, $data) {
            $plan->update($data);
            $this->keepSingleDefault($plan);
        });

        ActivityLog::record('plan_updated', properties: ['plan' => $plan->name]);

        return $plan->fresh()->loadCount('operators');
    }

    public function destroy(Plan $plan)
    {
        abort_if($plan->is_default, 422, 'The default plan cannot be deleted. Make another plan the default first.');
        abort_if($plan->operators()->exists(), 422, 'Some operators are on this plan. Move them to another plan first.');

        $plan->delete();

        ActivityLog::record('plan_deleted', properties: ['plan' => $plan->name]);

        return response()->noContent();
    }

    /** Put one operator on a plan. */
    public function assign(Request $request, BusOperator $operator)
    {
        $data = $request->validate([
            'plan_id' => ['required', Rule::exists('plans', 'id')->where('is_active', true)],
        ]);

        $from = $operator->plan?->name;
        $operator->update(['plan_id' => $data['plan_id']]);
        $operator->load('plan');

        ActivityLog::record('operator_plan_changed', $operator->id, [
            'from' => $from,
            'to' => $operator->plan->name,
        ]);

        return $operator->plan;
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('plans', 'code')->ignore($plan)],
            'student_limit' => 'nullable|integer|min:1|max:1000000',
            'monthly_price' => 'required|numeric|min:0|max:1000000',
            'price_per_student' => 'required|numeric|min:0|max:1000000',
            'is_default' => 'required|boolean',
            'is_active' => 'required|boolean',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        // The default plan is what sign-ups land on, so it must be available.
        if ($data['is_default'] && ! $data['is_active']) {
            abort(422, 'The default plan must be active.');
        }

        // The current default can't be un-defaulted directly; make another plan the default instead.
        if ($plan?->is_default && ! $data['is_default']) {
            abort(422, 'There must always be a default plan. Make another plan the default instead.');
        }

        $data['sort_order'] ??= 0;

        return $data;
    }

    private function keepSingleDefault(Plan $plan): void
    {
        if ($plan->is_default) {
            Plan::query()->where('id', '!=', $plan->id)->where('is_default', true)->update(['is_default' => false]);
        }
    }
}
