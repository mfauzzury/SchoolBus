<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SaasAdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@bassekolah.my'],
            [
                'tenant_id' => null,
                'name' => 'Platform Admin',
                'password' => 'password',
            ],
        );

        if (! $admin->hasRole('saas_admin')) {
            $admin->assignRole('saas_admin');
        }
    }
}
