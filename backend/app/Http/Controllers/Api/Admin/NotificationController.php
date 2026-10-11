<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use App\Models\NotificationSetting;
use App\Notifications\NotificationType;
use App\Support\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * The Owner's view of automatic messages: which kinds are switched on, and
 * a log of what was actually sent (or why it wasn't).
 */
class NotificationController extends Controller
{
    public function index()
    {
        $since = now()->subDays(30);

        $counts = NotificationLog::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('type, status, count(*) as total')
            ->groupBy('type', 'status')
            ->get()
            ->groupBy('type');

        $enabled = NotificationSetting::query()->pluck('enabled', 'type');

        $types = collect(NotificationType::all())->map(function (array $meta, string $type) use ($counts, $enabled) {
            $byStatus = ($counts[$type] ?? collect())->pluck('total', 'status');

            return [
                'type' => $type,
                'audience' => $meta['audience'],
                'enabled' => (bool) ($enabled[$type] ?? true),
                'sent' => (int) ($byStatus[NotificationLog::SENT] ?? 0),
                'failed' => (int) ($byStatus[NotificationLog::FAILED] ?? 0),
                'waiting' => (int) ($byStatus[NotificationLog::QUEUED] ?? 0),
            ];
        })->values();

        return [
            'types' => $types,
            // 'log' / 'array' mean mail is written to a file: the log would say "sent" but nobody gets it.
            'mailer' => config('mail.default'),
            'delivers' => ! in_array(config('mail.default'), ['log', 'array'], true),
        ];
    }

    public function update(Request $request, string $type)
    {
        abort_unless(NotificationType::exists($type), 404);

        $data = $request->validate(['enabled' => 'required|boolean']);

        NotificationSetting::updateOrCreate(
            ['type' => $type],
            ['enabled' => $data['enabled'], 'updated_by' => $request->user()->id],
        );

        ActivityLog::record('notification_type_toggled', properties: ['type' => $type, 'enabled' => $data['enabled']]);

        return ['type' => $type, 'enabled' => $data['enabled']];
    }

    public function log(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in([NotificationLog::QUEUED, NotificationLog::SENT, NotificationLog::FAILED, NotificationLog::SKIPPED])],
            'type' => ['nullable', Rule::in(array_keys(NotificationType::all()))],
            'search' => 'nullable|string|max:100',
        ]);

        $query = NotificationLog::query()->with('busOperator:id,company_name')->latest()->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $text = $request->string('search')->trim()->lower()->toString();
        if ($text !== '') {
            // Escaped so a typed % or _ is a plain character, not a wildcard.
            $term = '%'.addcslashes($text, '%_\\').'%';
            $query->where(fn ($q) => $q
                ->whereRaw("LOWER(recipient) LIKE ? ESCAPE '\\'", [$term])
                ->orWhereRaw("LOWER(COALESCE(recipient_name, '')) LIKE ? ESCAPE '\\'", [$term]));
        }

        return $query->paginate(25);
    }
}
