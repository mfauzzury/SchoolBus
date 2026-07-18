<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Route as RouteModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RouteController extends Controller
{
    public function index()
    {
        return RouteModel::with(['bus', 'driver', 'conductor', 'stops'])
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $route = DB::transaction(function () use ($data) {
            $route = RouteModel::create($this->routeAttributes($data));
            $this->syncStops($route, $data['stops'] ?? null);

            return $route;
        });

        return response()->json($route->load(['bus', 'driver', 'conductor', 'stops']), 201);
    }

    public function show(RouteModel $route)
    {
        return $route->load(['bus', 'driver', 'conductor', 'stops']);
    }

    public function update(Request $request, RouteModel $route)
    {
        $data = $this->validated($request, sometimes: true);

        DB::transaction(function () use ($route, $data) {
            $route->update($this->routeAttributes($data));

            if (array_key_exists('stops', $data)) {
                $this->syncStops($route, $data['stops']);
            }
        });

        return $route->load(['bus', 'driver', 'conductor', 'stops']);
    }

    public function destroy(RouteModel $route)
    {
        $route->delete();

        return response()->json(null, 204);
    }

    private function validated(Request $request, bool $sometimes = false): array
    {
        $prefix = $sometimes ? 'sometimes|' : '';

        return $request->validate([
            'name' => $prefix.'required|string|max:255',
            'zone' => 'nullable|string|max:255',
            'school_destination' => 'nullable|string|max:255',
            'bus_id' => 'nullable|exists:buses,id',
            'driver_id' => 'nullable|exists:staff,id',
            'conductor_id' => 'nullable|exists:staff,id',
            'base_monthly_fee' => 'nullable|numeric|min:0',
            'stops' => 'sometimes|array',
            'stops.*.name' => 'required_with:stops|string|max:255',
            'stops.*.sequence' => 'required_with:stops|integer|min:0',
        ]);
    }

    private function routeAttributes(array $data): array
    {
        return array_intersect_key($data, array_flip([
            'name', 'zone', 'school_destination', 'bus_id', 'driver_id', 'conductor_id', 'base_monthly_fee',
        ]));
    }

    private function syncStops(RouteModel $route, ?array $stops): void
    {
        if ($stops === null) {
            return;
        }

        $route->stops()->delete();

        foreach ($stops as $stop) {
            $route->stops()->create([
                'tenant_id' => $route->tenant_id,
                'name' => $stop['name'],
                'sequence' => $stop['sequence'],
            ]);
        }
    }
}
