<?php

namespace Tests\Feature\Admin;

use App\Models\ParentProfile;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\ParentReportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ParentReportDemoSeederTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function seedDemo(): void
    {
        $this->ensureRole('parent');
        $this->seed(ParentReportDemoSeeder::class);
    }

    public function test_it_adds_enough_varied_parents_for_the_report_to_have_something_to_show(): void
    {
        $busy = $this->createTenant(['company_name' => 'Busy Buses']);
        $this->createParent($busy);
        $this->createTenant(['company_name' => 'Quiet Buses']);

        $this->seedDemo();

        $report = $this->actingAs($this->createPlatformUser('owner'))
            ->getJson('/api/admin/reports/parents')->assertOk()->json();

        $this->assertSame(43, $report['total_parents']); // 1 real + 30 + 12
        $this->assertTrue($report['enough_data']);
        $this->assertGreaterThanOrEqual(2, count($report['distributions']['gender']['items']));
        $this->assertNotEmpty($report['distributions']['income']['items']);
        $this->assertNotEmpty($report['distributions']['school_level']['items']);
    }

    public function test_demo_children_are_never_billed_and_demo_parents_cannot_log_in(): void
    {
        $this->createTenant();
        $this->seedDemo();

        $this->assertSame(0, Student::whereNotNull('route_id')->count());
        $this->artisan('invoices:generate-recurring')->assertSuccessful();
        $this->assertDatabaseCount('invoices', 0);

        $demo = User::where('email', 'like', '%@seed.example.test')->first();
        $this->assertFalse(Hash::check('password', $demo->password));
    }

    public function test_running_it_twice_does_not_double_the_data(): void
    {
        $this->createTenant();
        $this->seedDemo();
        $first = ParentProfile::count();

        $this->seed(ParentReportDemoSeeder::class);

        $this->assertSame($first, ParentProfile::count());
    }

    public function test_remove_takes_away_exactly_the_demo_data_and_leaves_everything_else(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant, ['email' => 'owner@real-bus.test']);
        [$realParentUser, $realParent] = $this->createParent($tenant, ['email' => 'mum@real-family.test']);
        $realChild = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $realParent->id]);

        $this->seedDemo();
        $this->assertGreaterThan(1, ParentProfile::count());

        $removed = ParentReportDemoSeeder::remove();

        $this->assertSame(30, $removed['parents']); // one operator exists, so one batch
        $this->assertSame(0, User::where('email', 'like', '%@seed.example.test')->count());
        // Real records are untouched.
        $this->assertSame(1, ParentProfile::count());
        $this->assertSame(1, Student::count());
        $this->assertNotNull($realChild->fresh());
        $this->assertNotNull($realParentUser->fresh());
        $this->assertNotNull($admin->fresh());
    }

    public function test_with_no_operators_it_adds_nothing_instead_of_failing(): void
    {
        $this->seedDemo();

        $this->assertSame(0, ParentProfile::count());
    }
}
