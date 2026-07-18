<?php

namespace Database\Factories;

use App\Models\BusOperator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BusOperator>
 */
class BusOperatorFactory extends Factory
{
    protected $model = BusOperator::class;

    public function definition(): array
    {
        return [
            'company_name' => fake()->company(),
            'contact_person' => fake()->name(),
            'contact_phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->companyEmail(),
            'subscription_plan' => 'free',
        ];
    }
}
