<?php

namespace Database\Factories;

use App\Models\BusOperator;
use App\Models\Bus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bus>
 */
class BusFactory extends Factory
{
    protected $model = Bus::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'plate_number' => strtoupper(fake()->bothify('???####')),
            'capacity' => fake()->numberBetween(20, 45),
            'status' => 'active',
        ];
    }
}
