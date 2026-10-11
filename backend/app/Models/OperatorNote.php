<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A private note the platform team keeps about an operator. Deliberately not
 * BelongsToTenant: it is platform-side data, never shown inside the operator's own app.
 */
class OperatorNote extends Model
{
    protected $fillable = ['tenant_id', 'user_id', 'body'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
