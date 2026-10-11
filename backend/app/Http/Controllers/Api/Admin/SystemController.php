<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\SystemStatus;
use Illuminate\Support\Facades\DB;

/**
 * "Is the machinery healthy?" in plain facts: did the daily billing run, is the
 * queue stuck, is Billplz reaching us, is email really being sent.
 */
class SystemController extends Controller
{
    /** The billing job is daily; a day and a half without a run means the scheduler is not running. */
    private const BILLING_STALE_AFTER_HOURS = 36;

    public function show()
    {
        $billing = SystemStatus::read('invoices_generate_recurring');
        $webhook = SystemStatus::read('billplz_webhook');

        $failedJobs = DB::table('failed_jobs')->orderByDesc('failed_at')->limit(5)
            ->get(['id', 'payload', 'failed_at'])
            ->map(fn ($job) => [
                'id' => $job->id,
                'name' => json_decode($job->payload, true)['displayName'] ?? 'Unknown job',
                'failed_at' => $job->failed_at,
            ]);

        $sandbox = BusOperator::query()
            ->billplzConnected()
            ->where('billplz_sandbox', true)
            ->orderBy('company_name')
            ->toBase()
            ->get(['id', 'company_name']);

        return [
            'billing' => [
                'ran_at' => $billing?->updated_at,
                'ok' => $billing ? (bool) ($billing->value['ok'] ?? false) : null,
                'generated' => $billing?->value['generated'] ?? null,
                'skipped' => $billing?->value['skipped'] ?? null,
                'message' => $billing?->value['message'] ?? null,
                'stale' => ! $billing || $billing->updated_at->lt(now()->subHours(self::BILLING_STALE_AFTER_HOURS)),
            ],
            'failed_jobs' => [
                'count' => DB::table('failed_jobs')->count(),
                'latest' => $failedJobs,
            ],
            'billplz_webhook' => [
                'received_at' => $webhook?->updated_at,
            ],
            'sandbox_operators' => [
                'count' => $sandbox->count(),
                'items' => $sandbox->take(10)->values(),
            ],
            'environment' => [
                'app_env' => config('app.env'),
                'debug' => (bool) config('app.debug'),
                // 'log' / 'array' mean emails are written to a file, never sent.
                'mailer' => config('mail.default'),
                'queue' => config('queue.default'),
            ],
        ];
    }
}
