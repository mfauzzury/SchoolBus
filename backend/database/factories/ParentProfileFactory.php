<?php

namespace Database\Factories;

use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParentProfile>
 *
 * tenant_id and user_id are cross-model and easy to get out of sync if
 * auto-generated here — always pass them explicitly (see CreatesTestData).
 */
class ParentProfileFactory extends Factory
{
    protected $model = ParentProfile::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'user_id' => User::factory(),
            'full_name' => fake()->name(),
            'ic_number' => fake()->numerify('######-##-####'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
}
