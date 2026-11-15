<?php

namespace Tests\Feature\Transit;

use App\Models\TransitCenter;
use App\Models\User;
use Database\Seeders\TransitCenterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TransitCenterDemoSeederTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_it_seeds_centers_with_prices_and_logins_and_can_be_run_again(): void
    {
        $tenant = $this->createTenant(['operator_code' => '10000']);

        $this->seed(TransitCenterDemoSeeder::class);

        $centers = TransitCenter::withoutGlobalScopes()->where('tenant_id', $tenant->id)->orderBy('id')->get();
        $this->assertCount(3, $centers);
        $this->assertSame('100.00', $centers[0]->monthly_price);
        $this->assertSame('75.00', $centers[1]->monthly_price);
        $this->assertNull($centers[2]->monthly_price);

        // Each has a pin on the map, which a later run fills in for older centers but never moves.
        $this->assertEqualsWithDelta(3.2071, $centers[0]->latitude, 0.00001);
        $this->assertEqualsWithDelta(101.7287, $centers[0]->longitude, 0.00001);
        $this->assertNotNull($centers[2]->latitude);

        // Two have a login that works as a transit center; the third is left for the platform to send one.
        $this->assertSame(2, $centers->whereNotNull('user_id')->count());
        $user = User::where('email', 'brightkids@transit.test')->firstOrFail();
        $this->assertTrue($user->hasRole('transit_center'));
        $this->assertSame($tenant->id, $user->tenant_id);
        $this->assertTrue(password_verify('password', $user->password));
        $this->assertNull($centers[2]->user_id);

        // Running it again adds nothing and keeps prices the operator has since changed.
        $centers[0]->update(['monthly_price' => 99, 'latitude' => 1.5, 'longitude' => 103.7]);
        $centers[1]->update(['latitude' => null, 'longitude' => null]);
        $this->seed(TransitCenterDemoSeeder::class);

        $this->assertSame(3, TransitCenter::withoutGlobalScopes()->count());
        $this->assertSame(2, User::role('transit_center')->count());
        $this->assertSame('99.00', $centers[0]->fresh()->monthly_price);
        $this->assertSame(1.5, $centers[0]->fresh()->latitude);
        $this->assertEqualsWithDelta(3.2058, $centers[1]->fresh()->latitude, 0.00001);
    }
}
