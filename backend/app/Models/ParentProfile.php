<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

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
        'avatar_path',
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
        'income_range',
        'occupation',
        'working_field',
        'about_saved_at',
    ];

    /** Monthly household income bands (RM). The parent may also choose not to say. */
    public const INCOME_RANGES = [
        'under_3000',
        '3000_5000',
        '5000_8000',
        '8000_12000',
        'above_12000',
        'prefer_not_to_say',
    ];

    /** The industry the parent works in. */
    public const WORKING_FIELDS = [
        'government',
        'education',
        'healthcare',
        'manufacturing',
        'construction',
        'retail_services',
        'transport_logistics',
        'finance_it',
        'agriculture',
        'own_business',
        'homemaker',
        'not_working',
        'other',
    ];

    /**
     * What the parent tells us about themselves. Hidden from every serialised
     * profile by default, so it can never leak into an operator's student,
     * bill or application screens; only the parent's own endpoints reveal it.
     */
    public const PRIVATE_FIELDS = ['income_range', 'occupation', 'working_field'];

    protected $hidden = self::PRIVATE_FIELDS;

    protected $casts = [
        'about_saved_at' => 'datetime',
    ];

    protected $appends = ['avatar_url'];

    /** This profile, for its own owner: includes the private About-you answers. */
    public function forOwner(): static
    {
        return $this->makeVisible(self::PRIVATE_FIELDS);
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

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
