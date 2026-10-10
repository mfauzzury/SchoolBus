<?php

namespace Database\Seeders;

use App\Models\BusOperator;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoTenantSeeder extends Seeder
{
    public function run(): void
    {
        $operator = BusOperator::create([
            'company_name' => 'Demo Bus Co',
            'operator_code' => '10000',
            'contact_person' => 'Demo Admin',
            'contact_phone' => '+60123456789',
            'email' => 'contact@demobusco.test',
        ]);

        $admin = User::create([
            'tenant_id' => $operator->id,
            'name' => 'Demo Admin',
            'email' => 'admin@demo.test',
            'password' => 'password',
        ]);

        $admin->assignRole('operator_admin');
    }
}
