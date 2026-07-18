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
}
