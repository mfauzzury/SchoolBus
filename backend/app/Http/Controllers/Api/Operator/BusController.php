<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BusController extends Controller
{
    public function index()
    {
        return Bus::orderBy('plate_number')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'plate_number' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'status' => 'sometimes|in:active,maintenance,retired',
        ]);

        return response()->json(Bus::create($data), 201);
    }

    public function show(Bus $bus)
    {
        return $bus;
    }

    public function update(Request $request, Bus $bus)
    {
        $data = $request->validate([
            'plate_number' => 'sometimes|required|string|max:255',
            'capacity' => 'sometimes|required|integer|min:1',
            'status' => 'sometimes|in:active,maintenance,retired',
        ]);

        $bus->update($data);

        return $bus;
    }

    public function destroy(Bus $bus)
    {
        $bus->delete();

        return response()->json(null, 204);
    }

    public function uploadAvatar(Request $request, Bus $bus)
    {
        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        if ($bus->avatar_path) {
            Storage::disk('public')->delete($bus->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars/buses', 'public');
        $bus->update(['avatar_path' => $path]);

        return $bus->fresh();
    }
}
