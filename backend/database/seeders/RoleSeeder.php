<?php

namespace Database\Seeders;

use App\Support\PlatformAccess;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['operator_admin', 'operator_staff', 'parent', 'driver'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        // Platform team levels (Owner / Finance / Support) and their permissions.
        PlatformAccess::sync();
    }
}
