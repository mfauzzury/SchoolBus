<?php

namespace Database\Seeders;

use App\Models\BusOperator;
use App\Models\TransitCenter;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Demo transit centers (pusat transit) for the demo operator, run on its own
 * after DemoDataSeeder, like it:
 *
 *   php artisan db:seed --class=TransitCenterDemoSeeder
 *
 * Safe to run again: a center that already exists (same operator and email)
 * is left exactly as it is, so prices the operator has set are never reset
 * (a center without a map pin yet is given one).
 * Logins use the same demo password as the other demo accounts.
 */
class TransitCenterDemoSeeder extends Seeder
{
    public function run(): void
    {
        $operator = BusOperator::where('operator_code', '10000')->firstOrFail();

        Role::firstOrCreate(['name' => 'transit_center', 'guard_name' => 'web']);

        $centers = [
            [
                // Priced, with a login.
                'name' => 'Pusat Tuisyen Bright Kids',
                'contact_person' => 'Puan Siti Rahmah',
                'phone' => '03-5513 2200',
                'email' => 'brightkids@transit.test',
                'address' => 'No 1, Jalan Melati 2, Taman Melati, 53100 Kuala Lumpur',
                'latitude' => 3.2071, 'longitude' => 101.7287,
                'monthly_price' => 100,
                'login' => true,
            ],
            [
                // Priced, with a login.
                'name' => 'Taska & Pusat Jagaan Ceria Hati',
                'contact_person' => 'Kak Rosnah',
                'phone' => '012-334 5566',
                'email' => 'ceriahati@transit.test',
                'address' => 'No 12, Jalan Melati 5, Taman Melati, 53100 Kuala Lumpur',
                'latitude' => 3.2058, 'longitude' => 101.7262,
                'monthly_price' => 75,
                'login' => true,
            ],
            [
                // No prices yet and no login yet: for trying "Set prices" and the platform's "Send login".
                'name' => 'Pusat Bimbingan Cemerlang',
                'contact_person' => 'Encik Razak Hamid',
                'phone' => '017-889 2211',
                'email' => 'cemerlang@transit.test',
                'address' => 'Lot 5, Bandar Baru Fasa 2, 47500 Subang Jaya',
                'latitude' => 3.0567, 'longitude' => 101.5851,
                'monthly_price' => null,
                'login' => false,
            ],
        ];

        foreach ($centers as $def) {
            $login = $def['login'];
            unset($def['login']);

            $center = TransitCenter::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $operator->id, 'email' => $def['email']],
                [...$def, 'status' => 'active'],
            );

            // Centers made before the map existed get their pin; a pin someone has dropped is never moved.
            if ($center->latitude === null) {
                $center->update(['latitude' => $def['latitude'], 'longitude' => $def['longitude']]);
            }

            if ($login && ! $center->user_id) {
                $user = User::firstOrCreate(
                    ['email' => $def['email']],
                    ['tenant_id' => $operator->id, 'name' => $def['name'], 'password' => 'password'],
                );
                $user->assignRole('transit_center');
                $center->update(['user_id' => $user->id]);
            }
        }

        $this->command?->info('Seeded: '.count($centers).' transit centers (2 with logins).');
    }
}
