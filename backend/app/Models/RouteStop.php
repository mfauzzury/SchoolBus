<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RouteStop extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'route_id',
        'transit_center_id',
        'name',
        'sequence',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    /** Set when this stop is a transit center. */
    public function transitCenter(): BelongsTo
    {
        return $this->belongsTo(TransitCenter::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'pickup_stop_id');
    }
}
