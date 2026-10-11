<?php

namespace Database\Seeders;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Demo parents and children so the platform admin's Parents report has
 * something to show. Everything it creates is tagged by an email ending in
 *
 * @seed.example.test, so it can be found and removed again:
 *
 *   php artisan db:seed --class=ParentReportDemoSeeder      (add)
 *   php artisan tinker --execute='Database\Seeders\ParentReportDemoSeeder::remove();'   (take away)
 *
 * The children have no route, so the daily billing never invoices them, and
 * the parents' passwords are random, so nobody can log in as them.
 */
class ParentReportDemoSeeder extends Seeder
{
    public const EMAIL_DOMAIN = 'seed.example.test';

    private const PARENTS_PER_OPERATOR = [30, 12];

    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('Refusing to add demo data in production.');

            return;
        }

        if (User::where('email', 'like', '%@'.self::EMAIL_DOMAIN)->exists()) {
            $this->command?->warn('Demo parents already exist; nothing added. Remove them first to start again.');

            return;
        }

        // The operators that already have the most parents, so the demo sits where real data is.
        $operators = BusOperator::query()
            ->where('status', 'active')
            ->withCount('parents')
            ->orderByDesc('parents_count')
            ->orderBy('id')
            ->limit(count(self::PARENTS_PER_OPERATOR))
            ->get();

        if ($operators->isEmpty()) {
            $this->command?->warn('There is no active operator to attach demo parents to; nothing added.');

            return;
        }

        mt_srand(2026); // same demo every time
        $number = 0;
        $made = ['parents' => 0, 'children' => 0];

        DB::transaction(function () use ($operators, &$number, &$made) {
            foreach ($operators as $index => $operator) {
                for ($i = 0; $i < self::PARENTS_PER_OPERATOR[$index]; $i++) {
                    $number++;
                    $children = $this->createFamily($operator, $number, $index);
                    $made['parents']++;
                    $made['children'] += $children;
                }
            }
        });

        $this->command?->info("Added {$made['parents']} demo parents and {$made['children']} children across {$operators->count()} operators.");
    }

    /** Takes away everything this seeder added, and nothing else. */
    public static function remove(): array
    {
        $suffix = '%@'.self::EMAIL_DOMAIN;

        return DB::transaction(function () use ($suffix) {
            $userIds = User::where('email', 'like', $suffix)->pluck('id');
            $parentIds = ParentProfile::withoutGlobalScopes()->whereIn('user_id', $userIds)->pluck('id');

            $children = Student::withoutGlobalScopes()->whereIn('parent_id', $parentIds)->delete();
            $parents = ParentProfile::withoutGlobalScopes()->whereIn('id', $parentIds)->delete();
            DB::table('model_has_roles')->where('model_type', User::class)->whereIn('model_id', $userIds)->delete();
            $users = User::whereIn('id', $userIds)->delete();

            return compact('children', 'parents', 'users');
        });
    }

    private function createFamily(BusOperator $operator, int $number, int $operatorIndex): int
    {
        $pick = fn (array $options) => $options[mt_rand(0, count($options) - 1)];
        $chance = fn (int $percent) => mt_rand(1, 100) <= $percent;

        $first = $pick(['Aminah', 'Siti', 'Nurul', 'Farah', 'Zainab', 'Rohani', 'Mei Ling', 'Priya', 'Lakshmi', 'Azizah',
            'Ahmad', 'Mohd', 'Razak', 'Kumar', 'Wei Jie', 'Hafiz', 'Ismail', 'Rajesh', 'Faizal', 'Daniel']);
        $last = $pick(['Rahman', 'Abdullah', 'Tan', 'Lim', 'Kumar', 'Hassan', 'Ibrahim', 'Wong', 'Singh', 'Ali', 'Yusof', 'Lee']);
        $name = "{$first} {$last}";

        // Mostly mothers, as in real life; a few forgot to say.
        $gender = $chance(5) ? null : ($chance(58) ? 'female' : 'male');
        $relationship = $chance(4) ? null : ($gender === 'male' ? 'father' : ($chance(92) ? 'mother' : 'guardian'));

        $year = mt_rand(1968, 1998);
        $ic = sprintf('%02d%02d%02d-%02d-%04d', $year % 100, mt_rand(1, 12), mt_rand(1, 28), mt_rand(1, 14), mt_rand(1000, 9999));

        $postcodes = $operatorIndex === 0
            ? ['50450', '50088', '59100', '47810', '40000', '43000', '68100', '63000']
            : ['80000', '81100', '79100', '40000', '70000'];
        $postcode = $chance(8) ? null : $pick($postcodes);

        $answered = $chance(72);
        // Weighted, so a few fields and job titles are common (as in life) and the rest are rare.
        $fields = [
            ...array_fill(0, 5, 'education'), ...array_fill(0, 5, 'homemaker'), ...array_fill(0, 4, 'government'),
            ...array_fill(0, 3, 'retail_services'), ...array_fill(0, 3, 'own_business'),
            'healthcare', 'manufacturing', 'finance_it', 'transport_logistics', 'other',
        ];
        $jobByField = [
            'government' => 'Clerk', 'education' => 'Teacher', 'healthcare' => 'Nurse', 'manufacturing' => 'Technician',
            'retail_services' => 'Shop assistant', 'own_business' => 'Shop owner', 'finance_it' => 'Accountant',
            'transport_logistics' => 'Driver', 'homemaker' => 'Housewife', 'other' => 'Freelancer',
        ];
        $field = $answered ? $pick($fields) : null;

        $user = User::create([
            'tenant_id' => $operator->id,
            'name' => $name,
            'email' => sprintf('parent%03d@%s', $number, self::EMAIL_DOMAIN),
            'password' => Hash::make(Str::random(40)),
        ]);
        $user->assignRole('parent');

        $parent = ParentProfile::unguarded(fn () => ParentProfile::create([
            'tenant_id' => $operator->id,
            'user_id' => $user->id,
            'full_name' => $name,
            'relationship' => $relationship,
            'gender' => $gender,
            'ic_number' => $ic,
            'phone' => sprintf('01%d-%07d', mt_rand(1, 9), mt_rand(1000000, 9999999)),
            'email' => $user->email,
            'address_line1' => mt_rand(1, 99).' Jalan '.$pick(['Maju', 'Bahagia', 'Harmoni', 'Melati', 'Setia']),
            'postcode' => $postcode,
            'city' => $postcode ? $pick(['Kuala Lumpur', 'Petaling Jaya', 'Shah Alam', 'Johor Bahru']) : null,
            'income_range' => $answered ? $pick(['under_3000', '3000_5000', '3000_5000', '5000_8000', '5000_8000', '8000_12000', 'above_12000', 'prefer_not_to_say']) : null,
            'working_field' => $field,
            'occupation' => $field ? $jobByField[$field] : null,
            'about_saved_at' => $answered ? now()->subDays(mt_rand(1, 40)) : null,
        ]));

        $count = $chance(50) ? 1 : ($chance(70) ? 2 : 3);
        for ($c = 0; $c < $count; $c++) {
            $age = mt_rand(5, 16);
            Student::unguarded(fn () => Student::create([
                'tenant_id' => $operator->id,
                'parent_id' => $parent->id,
                'route_id' => null,
                'full_name' => $pick(['Aiman', 'Nur', 'Danish', 'Aisyah', 'Arjun', 'Mei', 'Hakim', 'Sofia', 'Ethan', 'Irfan']).' '.$first,
                'date_of_birth' => now()->subYears($age)->subDays(mt_rand(0, 360))->toDateString(),
                'school_name' => $pick(['SK Taman Melati', 'SK Bandar Baru', 'SMK Sri Damansara', 'SJK(C) Bandar Baru']),
                'package_type' => $chance(70) ? PackageType::Return : PackageType::OneWay,
                'billing_period' => BillingPeriod::Monthly,
                'enrollment_status' => 'active',
                'gender' => $chance(50) ? 'male' : 'female',
            ]));
        }

        return $count;
    }
}
