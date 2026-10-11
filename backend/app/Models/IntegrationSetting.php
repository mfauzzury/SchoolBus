<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Credentials for one outside service (Brevo email, WhatsApp Business). Stored
 * encrypted and never serialised: the admin screens only learn whether a
 * secret is present, never what it is.
 */
class IntegrationSetting extends Model
{
    public const BREVO = 'brevo';

    public const WHATSAPP = 'whatsapp';

    public $incrementing = false;

    protected $primaryKey = 'provider';

    protected $keyType = 'string';

    protected $fillable = ['provider', 'enabled', 'settings', 'updated_by'];

    protected $hidden = ['settings'];

    protected $casts = [
        'enabled' => 'boolean',
        'settings' => 'encrypted:array',
    ];

    /** @return array<string, mixed> */
    public function values(): array
    {
        return $this->settings ?? [];
    }
}
