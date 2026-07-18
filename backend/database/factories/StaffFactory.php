<?php

namespace Database\Factories;

use App\Models\BusOperator;
use App\Models\Staff;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Staff>
 */
class StaffFactory extends Factory
{
    protected $model = Staff::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'full_name' => fake()->name(),
            'ic_number' => fake()->numerify('######-##-####'),
            'phone' => fake()->phoneNumber(),
            'role' => fake()->randomElement(['driver', 'conductor']),
            'status' => 'active',
        ];
    }

    public function driver(): static
    {
        return $this->state(['role' => 'driver']);
    }

    public function conductor(): static
    {
        return $this->state(['role' => 'conductor']);
    }
}
