<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * What each platform-team level may do. Levels are fixed (not editable in the
 * UI): Owner keeps the legacy `saas_admin` role so existing admin logins and
 * tests are unchanged, and is allowed everything via Gate::before.
 */
class PlatformAccess
{
    public const OWNER = 'saas_admin';

    public const FINANCE = 'saas_finance';

    public const SUPPORT = 'saas_support';

    /** Team-level name (what the API and UI use) => Spatie role. */
    public const LEVELS = [
        'owner' => self::OWNER,
        'finance' => self::FINANCE,
        'support' => self::SUPPORT,
    ];

    public const PERMISSIONS = [
        'operators.edit',
        'operators.impersonate',
        'operators.suspend',
        'gateway.manage',
        'plans.manage',
        'transactions.export',
        'support.manage',
        'team.manage',
    ];

    private const ROLE_PERMISSIONS = [
        self::OWNER => self::PERMISSIONS,
        self::FINANCE => ['gateway.manage', 'plans.manage', 'transactions.export'],
        self::SUPPORT => ['operators.edit', 'operators.impersonate', 'support.manage'],
    ];

    /** @return list<string> */
    public static function roles(): array
    {
        return array_values(self::LEVELS);
    }

    public static function levelForRole(string $role): ?string
    {
        return array_search($role, self::LEVELS, true) ?: null;
    }

    /**
     * Idempotent: create any missing roles/permissions and bring each role's
     * permission list in line with the table above. Safe to re-run on deploy.
     */
    public static function sync(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        foreach (self::ROLE_PERMISSIONS as $role => $permissions) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web'])
                ->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
