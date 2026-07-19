<?php

namespace Database\Factories;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\StudentApplication;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudentApplication>
 */
class StudentApplicationFactory extends Factory
{
    protected $model = StudentApplication::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'parent_id' => ParentProfile::factory(),
            'full_name' => fake()->firstName(),
            'date_of_birth' => fake()->dateTimeBetween('-12 years', '-5 years')->format('Y-m-d'),
            'school_name' => fake()->company().' School',
            'package_type' => PackageType::Return,
            'billing_period' => BillingPeriod::Monthly,
            'status' => 'pending',
        ];
    }
}
