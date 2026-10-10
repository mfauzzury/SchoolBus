<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\OperatorNote;
use Illuminate\Http\Request;

class OperatorNoteController extends Controller
{
    public function index(BusOperator $operator)
    {
        return $operator->notes()->with('user:id,name')->latest('id')->get();
    }

    public function store(Request $request, BusOperator $operator)
    {
        $data = $request->validate(['body' => 'required|string|max:2000']);

        $note = $operator->notes()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json($note->load('user:id,name'), 201);
    }

    /** Authors remove their own notes; an Owner (team.manage) may remove any. */
    public function destroy(Request $request, BusOperator $operator, OperatorNote $note)
    {
        abort_unless($note->tenant_id === $operator->id, 404);
        abort_unless(
            $note->user_id === $request->user()->id || $request->user()->can('team.manage'),
            403,
        );

        $note->delete();

        return response()->noContent();
    }
}
