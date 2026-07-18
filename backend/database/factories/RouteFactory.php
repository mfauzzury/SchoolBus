<?php

namespace Database\Factories;

use App\Models\BusOperator;
use App\Models\Route;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Route>
 */
class RouteFactory extends Factory
{
    protected $model = Route::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'name' => 'Route '.fake()->unique()->randomLetter(),
            'zone' => fake()->city(),
            'school_destination' => fake()->company().' School',
            'base_monthly_fee' => fake()->randomElement([100, 120, 150, 180, 200]),
        ];
    }
}
