<?php

namespace Database\Seeders;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\User;
use App\Services\InvoiceGenerator;
use Illuminate\Database\Seeder;

/**
 * One-off demo data for the seeded "Demo Bus Co" tenant, so the operator
 * dashboard/pages have something realistic to look at. Not part of the
 * standard migrate:fresh --seed chain.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = BusOperator::where('operator_code', '10000')->firstOrFail();

        $buses = collect([
            ['plate_number' => 'WXX 1234', 'capacity' => 40],
            ['plate_number' => 'WPL 5678', 'capacity' => 30],
            ['plate_number' => 'WA 9012', 'capacity' => 45],
        ])->map(fn ($attrs) => $tenant->buses()->create($attrs + ['status' => 'active']));

        $drivers = collect([
            ['full_name' => 'Ahmad Zulkifli', 'ic_number' => '850101-14-5521', 'phone' => '012-3456789', 'license_expiry_date' => now()->addYears(2)],
            ['full_name' => 'Muthu Kumar', 'ic_number' => '780612-08-6612', 'phone' => '017-2223344', 'license_expiry_date' => now()->addMonths(8)],
        ])->map(fn ($attrs) => $tenant->staff()->create($attrs + ['role' => 'driver', 'status' => 'active']));

        $conductors = collect([
            ['full_name' => 'Siti Aminah', 'ic_number' => '920315-10-3344', 'phone' => '019-8887766'],
            ['full_name' => 'Lee Wei Ming', 'ic_number' => '881120-05-9988', 'phone' => '013-5556677'],
        ])->map(fn ($attrs) => $tenant->staff()->create($attrs + ['role' => 'conductor', 'status' => 'active']));

        $routeDefs = [
            ['name' => 'Route A - Taman Melati', 'zone' => 'North', 'school_destination' => 'SK Taman Melati', 'base_monthly_fee' => 150, 'one_way_monthly_fee' => 90, 'stops' => ['Taman Melati Utama', 'Jalan Melati 5', 'Melati LRT Station']],
            ['name' => 'Route B - Bandar Baru', 'zone' => 'South', 'school_destination' => 'SJK(C) Bandar Baru', 'base_monthly_fee' => 130, 'one_way_monthly_fee' => 80, 'stops' => ['Bandar Baru Fasa 1', 'Bandar Baru Fasa 2']],
            ['name' => 'Route C - Sri Damansara', 'zone' => 'West', 'school_destination' => 'SMK Sri Damansara', 'base_monthly_fee' => 170, 'one_way_monthly_fee' => 100, 'stops' => ['Sri Damansara Club', 'Damansara Perdana', 'Sungai Buloh Junction']],
        ];

        $routes = collect($routeDefs)->map(function ($def, $i) use ($tenant, $buses, $drivers, $conductors) {
            $route = $tenant->routes()->create([
                'name' => $def['name'],
                'zone' => $def['zone'],
                'school_destination' => $def['school_destination'],
                'base_monthly_fee' => $def['base_monthly_fee'],
                'one_way_monthly_fee' => $def['one_way_monthly_fee'],
                'bus_id' => $buses[$i % $buses->count()]->id,
                'driver_id' => $drivers[$i % $drivers->count()]->id,
                'conductor_id' => $conductors[$i % $conductors->count()]->id,
            ]);

            foreach ($def['stops'] as $j => $stopName) {
                $route->stops()->create(['tenant_id' => $tenant->id, 'name' => $stopName, 'sequence' => $j + 1]);
            }

            return $route->load('stops');
        });

        $parentDefs = [
            ['name' => 'Rajesh Kumar', 'email' => 'rajesh.kumar@example.test', 'phone' => '012-1112233', 'children' => [
                ['name' => 'Aditya Kumar', 'dob' => '2015-03-12', 'school' => 'SK Taman Melati', 'route' => 0, 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly],
                ['name' => 'Priya Kumar', 'dob' => '2017-07-22', 'school' => 'SK Taman Melati', 'route' => 0, 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly],
            ]],
            ['name' => 'Tan Mei Ling', 'email' => 'meiling.tan@example.test', 'phone' => '016-2223344', 'children' => [
                ['name' => 'Tan Jun Wei', 'dob' => '2014-11-05', 'school' => 'SJK(C) Bandar Baru', 'route' => 1, 'package' => PackageType::OneWay, 'billing' => BillingPeriod::Monthly],
            ], 'applications' => [
                ['name' => 'Tan Xin Yi', 'dob' => '2018-04-09', 'school' => 'SJK(C) Bandar Baru', 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly, 'status' => 'pending'],
            ]],
            ['name' => 'Farah Nabila', 'email' => 'farah.nabila@example.test', 'phone' => '019-3334455', 'children' => [
                ['name' => 'Danish Iman', 'dob' => '2016-01-30', 'school' => 'SMK Sri Damansara', 'route' => 2, 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly],
            ], 'applications' => [
                ['name' => 'Nurul Amira', 'dob' => '2019-02-14', 'school' => 'SMK Sri Damansara', 'package' => PackageType::OneWay, 'billing' => BillingPeriod::Monthly, 'status' => 'pending'],
            ]],
            ['name' => 'Vincent Lim', 'email' => 'vincent.lim@example.test', 'phone' => '017-4445566', 'children' => [
                ['name' => 'Isabelle Lim', 'dob' => '2015-09-18', 'school' => 'SK Taman Melati', 'route' => 0, 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly],
            ], 'applications' => [
                ['name' => 'Gabriel Lim', 'dob' => '2020-06-01', 'school' => 'SK Taman Melati', 'package' => PackageType::Return, 'billing' => BillingPeriod::Monthly, 'status' => 'rejected', 'rejection_reason' => 'No available seats on the requested route for this term.'],
            ]],
        ];

        $invoiceGenerator = app(InvoiceGenerator::class);
        $studentsCreated = [];

        foreach ($parentDefs as $def) {
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $def['name'],
                'email' => $def['email'],
                'password' => 'password',
            ]);
            $user->assignRole('parent');

            $relationship = fake()->randomElement(['father', 'mother', 'guardian']);

            $parent = ParentProfile::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'full_name' => $def['name'],
                'relationship' => $relationship,
                'gender' => $relationship === 'mother' ? 'female' : ($relationship === 'father' ? 'male' : fake()->randomElement(['male', 'female'])),
                'ic_number' => fake()->numerify('######-##-####'),
                'phone' => $def['phone'],
                'email' => $def['email'],
                'address_line1' => fake()->streetAddress(),
                'address_line2' => fake()->optional()->secondaryAddress(),
                'city' => fake()->city(),
                'postcode' => fake()->postcode(),
                'emergency_contact_name' => fake()->name(),
                'emergency_contact_relationship' => fake()->randomElement(['Spouse', 'Sibling', 'Relative', 'Friend']),
                'emergency_contact_phone' => fake()->numerify('01#-#######'),
            ]);

            foreach ($def['children'] as $child) {
                $route = $routes[$child['route']];
                $student = $parent->students()->create([
                    'tenant_id' => $tenant->id,
                    'route_id' => $route->id,
                    'pickup_stop_id' => $route->stops->first()?->id,
                    'full_name' => $child['name'],
                    'date_of_birth' => $child['dob'],
                    'school_name' => $child['school'],
                    'package_type' => $child['package'],
                    'billing_period' => $child['billing'],
                    'enrollment_status' => 'active',
                ]);

                $invoice = $invoiceGenerator->generateForMonth($student, InvoiceGenerator::currentMonth());
                $studentsCreated[] = ['student' => $student, 'invoice' => $invoice];
            }

            foreach ($def['applications'] ?? [] as $application) {
                $parent->studentApplications()->create([
                    'tenant_id' => $tenant->id,
                    'full_name' => $application['name'],
                    'date_of_birth' => $application['dob'],
                    'school_name' => $application['school'],
                    'package_type' => $application['package'],
                    'billing_period' => $application['billing'],
                    'status' => $application['status'],
                    'rejection_reason' => $application['rejection_reason'] ?? null,
                    'reviewed_at' => $application['status'] === 'rejected' ? now()->subDay() : null,
                ]);
            }
        }

        // Give a realistic mix of paid / outstanding / overdue on the ledger.
        foreach ($studentsCreated as $i => $entry) {
            $invoice = $entry['invoice'];

            if ($i % 3 === 0) {
                $invoice->payments()->create([
                    'tenant_id' => $tenant->id,
                    'method' => 'bank_transfer',
                    'reference_number' => 'TXN-'.strtoupper(uniqid()),
                    'payment_date' => now()->subDays(2),
                    'amount_paid' => $invoice->final_amount,
                ]);
                $invoice->update(['status' => 'paid', 'paid_at' => now()->subDays(2)]);
            } elseif ($i % 3 === 1) {
                $invoice->update(['due_date' => now()->subDays(5)]);
            }
        }

        $this->command?->info('Seeded: '.$buses->count().' buses, '.($drivers->count() + $conductors->count()).' staff, '.$routes->count().' routes, '.count($studentsCreated).' students/invoices.');
    }
}
