<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Drivers & conductors (no login). Distinct from the "Operator Staff" role on `users`.
 */
class Staff extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'staff';

    protected $fillable = [
        'tenant_id',
        'full_name',
        'ic_number',
        'phone',
        'role',
        'license_expiry_date',
        'status',
    ];

    protected $casts = [
        'license_expiry_date' => 'date',
    ];

    public function routesAsDriver(): HasMany
    {
        return $this->hasMany(Route::class, 'driver_id');
    }

    public function routesAsConductor(): HasMany
    {
        return $this->hasMany(Route::class, 'conductor_id');
    }
}
