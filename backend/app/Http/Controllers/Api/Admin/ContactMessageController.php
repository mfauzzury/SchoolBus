<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Support\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Messages from the public contact form. Replying happens in the person's own
 * email / WhatsApp — here the team just reads them and marks them dealt with.
 */
class ContactMessageController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['status' => ['nullable', Rule::in(['open', 'handled'])]]);

        $query = ContactMessage::query()->with('handler:id,name')->latest()->orderByDesc('id');

        if ($request->input('status') === 'open') {
            $query->whereNull('handled_at');
        } elseif ($request->input('status') === 'handled') {
            $query->whereNotNull('handled_at');
        }

        return $query->paginate(20);
    }

    /** How many are waiting — drives the badge in the side menu. */
    public function summary()
    {
        return ['open' => ContactMessage::whereNull('handled_at')->count()];
    }

    public function show(ContactMessage $message)
    {
        return $message->load('handler:id,name');
    }

    public function handle(Request $request, ContactMessage $message)
    {
        $message->forceFill([
            'handled_at' => now(),
            'handled_by' => $request->user()->id,
        ])->save();

        ActivityLog::record('contact_message_handled', properties: ['from' => $message->name]);

        return $message->load('handler:id,name');
    }

    public function reopen(ContactMessage $message)
    {
        $message->forceFill(['handled_at' => null, 'handled_by' => null])->save();

        return $message->load('handler:id,name');
    }
}
