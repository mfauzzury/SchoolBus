<?php

namespace App\Support;

use App\Models\ActivityLog as ActivityLogEntry;

class ActivityLog
{
    /**
     * @param  string  $action  snake_case code the UI translates, e.g. `billplz_updated`
     * @param  int|null  $tenantId  the operator the action was about, if any
     * @param  array<string, mixed>  $properties  small, non-secret context (never keys or passwords)
     */
    public static function record(string $action, ?int $tenantId = null, array $properties = []): ActivityLogEntry
    {
        return ActivityLogEntry::create([
            // While "logged in as" an operator, actions still belong to the platform member.
            'user_id' => (request()?->hasSession() ? session('impersonator_id') : null) ?? auth()->id(),
            'tenant_id' => $tenantId,
            'action' => $action,
            'properties' => $properties ?: null,
            'ip_address' => request()?->ip(),
        ]);
    }
}
