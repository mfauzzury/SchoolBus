<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Support\ActivityLog;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        return Announcement::query()->latest('id')->get();
    }

    public function store(Request $request)
    {
        $announcement = Announcement::create([
            ...$this->validated($request),
            'created_by' => $request->user()->id,
        ]);

        ActivityLog::record('announcement_created', properties: ['title' => $announcement->title]);

        return response()->json($announcement->fresh(), 201);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $announcement->update($this->validated($request));

        ActivityLog::record('announcement_updated', properties: ['title' => $announcement->title]);

        return $announcement->fresh();
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        ActivityLog::record('announcement_deleted', properties: ['title' => $announcement->title]);

        return response()->noContent();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:120',
            'body' => 'required|string|max:500',
            'title_ms' => 'nullable|string|max:120',
            'body_ms' => 'nullable|string|max:500',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
        ]);
    }
}
