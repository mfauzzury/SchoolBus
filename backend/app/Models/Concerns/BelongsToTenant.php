<?php

namespace App\Models\Concerns;

use App\Models\BusOperator;
use App\Models\Scopes\TenantScope;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model) {
            $context = app(TenantContext::class);

            if (empty($model->tenant_id) && $context->hasTenant()) {
                $model->tenant_id = $context->getTenantId();
            }
        });
    }

    public function busOperator(): BelongsTo
    {
        return $this->belongsTo(BusOperator::class, 'tenant_id');
    }

    /**
     * Route model binding (SubstituteBindings) resolves before our tenant
     * middleware runs, so TenantScope's global scope isn't active yet at this
     * point — without this override, e.g. `GET /operator/buses/{bus}` would
     * happily resolve another tenant's bus by ID. Read tenant_id directly off
     * the authenticated request user instead, which auth:sanctum guarantees
     * is already resolved by the time binding happens.
     */
    public function resolveRouteBinding($value, $field = null): ?Model
    {
        $query = $this->where($field ?? $this->getRouteKeyName(), $value);

        if ($tenantId = request()?->user()?->tenant_id) {
            $query->where($this->getTable().'.tenant_id', $tenantId);
        }

        return $query->first();
    }
}
