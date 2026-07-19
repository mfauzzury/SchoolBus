<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Maps to the `parents` table. Named ParentProfile because `Parent` is a reserved PHP keyword.
 */
class ParentProfile extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'parents';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'full_name',
        'relationship',
        'gender',
        'ic_number',
        'phone',
        'email',
        'address_line1',
        'address_line2',
        'city',
        'postcode',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'parent_id');
    }

    public function studentApplications(): HasMany
    {
        return $this->hasMany(StudentApplication::class, 'parent_id');
    }
}
