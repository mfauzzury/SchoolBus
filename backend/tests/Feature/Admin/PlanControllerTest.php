<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\BusOperator;
use App\Models\Plan;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class PlanControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function planPayload(array $overrides = []): array
    {
        return [
            'name' => 'Standard',
            'code' => 'standard',
            'student_limit' => 100,
            'monthly_price' => 99,
            'price_per_student' => 2.5,
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 1,
            ...$overrides,
        ];
    }

    private function activeStudents($tenant, int $count): void
    {
        [, $parent] = $this->createParent($tenant);
        Student::factory()->count($count)->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'enrollment_status' => 'active',
        ]);
    }

    public function test_a_free_plan_with_30_students_exists_and_is_the_default(): void
    {
        $free = Plan::default();

        $this->assertSame('free', $free->code);
        $this->assertSame(30, $free->student_limit);
    }

    public function test_new_operators_start_on_the_default_plan(): void
    {
        $this->ensureRole('operator_admin');
        $custom = Plan::create($this->planPayload(['is_default' => false]));
        $this->assertNotSame($custom->id, $this->createTenant()->plan_id);
        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'Fresh Buses',
            'contact_person' => 'Aminah',
            'contact_phone' => '0123456789',
            'email' => 'fresh@buses.test',
            'password' => 'password1',
            'email_token' => $this->verifyEmail('fresh@buses.test'),
        ])->assertCreated();

        $this->assertSame(Plan::default()->id, BusOperator::firstWhere('email', 'fresh@buses.test')->plan_id);
    }

    public function test_every_platform_level_can_list_plans_with_operator_counts(): void
    {
        $this->createTenant();
        $this->createTenant();

        foreach (['owner', 'finance', 'support'] as $level) {
            $response = $this->actingAs($this->createPlatformUser($level))->getJson('/api/admin/plans');
            $response->assertOk();
            $this->assertSame(2, collect($response->json())->firstWhere('code', 'free')['operators_count']);
        }
    }

    public function test_finance_creates_and_edits_a_plan_and_it_is_logged(): void
    {
        $finance = $this->createPlatformUser('finance');

        $id = $this->actingAs($finance)->postJson('/api/admin/plans', $this->planPayload())
            ->assertCreated()->assertJsonPath('student_limit', 100)->json('id');

        $this->actingAs($finance)->putJson("/api/admin/plans/{$id}", $this->planPayload(['student_limit' => null, 'name' => 'Standard+']))
            ->assertOk()->assertJsonPath('name', 'Standard+')->assertJsonPath('student_limit', null);

        $this->assertTrue(ActivityLog::where('action', 'plan_created')->where('user_id', $finance->id)->exists());
        $this->assertTrue(ActivityLog::where('action', 'plan_updated')->exists());
    }

    public function test_support_cannot_change_plans(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $plan = Plan::create($this->planPayload());

        $this->actingAs($support)->postJson('/api/admin/plans', $this->planPayload(['code' => 'x']))->assertForbidden();
        $this->actingAs($support)->putJson("/api/admin/plans/{$plan->id}", $this->planPayload())->assertForbidden();
        $this->actingAs($support)->deleteJson("/api/admin/plans/{$plan->id}")->assertForbidden();
        $this->actingAs($support)->putJson("/api/admin/operators/{$tenant->id}/plan", ['plan_id' => $plan->id])->assertForbidden();
    }

    public function test_plan_codes_are_unique_and_prices_cannot_be_negative(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->postJson('/api/admin/plans', $this->planPayload(['code' => 'free']))
            ->assertStatus(422)->assertJsonValidationErrors('code');
        $this->actingAs($owner)->postJson('/api/admin/plans', $this->planPayload(['monthly_price' => -1]))
            ->assertStatus(422)->assertJsonValidationErrors('monthly_price');
        $this->actingAs($owner)->postJson('/api/admin/plans', $this->planPayload(['student_limit' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('student_limit');
    }

    public function test_making_a_plan_the_default_moves_the_default_flag(): void
    {
        $owner = $this->createPlatformUser('owner');
        $free = Plan::default();

        $id = $this->actingAs($owner)->postJson('/api/admin/plans', $this->planPayload(['is_default' => true]))
            ->assertCreated()->json('id');

        $this->assertSame($id, Plan::default()->id);
        $this->assertFalse($free->fresh()->is_default);
        $this->assertSame(1, Plan::where('is_default', true)->count());
    }

    public function test_there_must_always_be_one_default_and_it_must_be_active(): void
    {
        $owner = $this->createPlatformUser('owner');
        $free = Plan::default();

        $this->actingAs($owner)->putJson("/api/admin/plans/{$free->id}", [
            'name' => 'Free', 'code' => 'free', 'student_limit' => 30, 'monthly_price' => 0,
            'price_per_student' => 0, 'is_default' => false, 'is_active' => true,
        ])->assertStatus(422);

        $this->actingAs($owner)->putJson("/api/admin/plans/{$free->id}", [
            'name' => 'Free', 'code' => 'free', 'student_limit' => 30, 'monthly_price' => 0,
            'price_per_student' => 0, 'is_default' => true, 'is_active' => false,
        ])->assertStatus(422);

        $this->assertTrue($free->fresh()->is_default);
    }

    public function test_a_plan_with_operators_or_the_default_plan_cannot_be_deleted(): void
    {
        $owner = $this->createPlatformUser('owner');
        $plan = Plan::create($this->planPayload());
        $this->createTenant(['plan_id' => $plan->id]);

        $this->actingAs($owner)->deleteJson("/api/admin/plans/{$plan->id}")->assertStatus(422);
        $this->actingAs($owner)->deleteJson('/api/admin/plans/'.Plan::default()->id)->assertStatus(422);

        $empty = Plan::create($this->planPayload(['code' => 'empty']));
        $this->actingAs($owner)->deleteJson("/api/admin/plans/{$empty->id}")->assertNoContent();
        $this->assertDatabaseMissing('plans', ['id' => $empty->id]);
    }

    public function test_an_operator_can_be_moved_to_another_active_plan(): void
    {
        $finance = $this->createPlatformUser('finance');
        $tenant = $this->createTenant();
        $plan = Plan::create($this->planPayload());

        $this->actingAs($finance)->putJson("/api/admin/operators/{$tenant->id}/plan", ['plan_id' => $plan->id])
            ->assertOk()->assertJsonPath('name', 'Standard');

        $this->assertSame($plan->id, $tenant->fresh()->plan_id);
        $entry = ActivityLog::firstWhere('action', 'operator_plan_changed');
        $this->assertSame($tenant->id, $entry->tenant_id);
        $this->assertSame(['from' => 'Free', 'to' => 'Standard'], $entry->properties);
    }

    public function test_an_operator_cannot_be_moved_to_an_inactive_or_unknown_plan(): void
    {
        $finance = $this->createPlatformUser('finance');
        $tenant = $this->createTenant();
        $retired = Plan::create($this->planPayload(['is_active' => false]));

        $this->actingAs($finance)->putJson("/api/admin/operators/{$tenant->id}/plan", ['plan_id' => $retired->id])
            ->assertStatus(422);
        $this->actingAs($finance)->putJson("/api/admin/operators/{$tenant->id}/plan", ['plan_id' => 9999])
            ->assertStatus(422);
    }

    public function test_the_operator_list_shows_plan_and_active_student_usage(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $this->activeStudents($tenant, 3);
        [, $parent] = $this->createParent($tenant);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'enrollment_status' => 'withdrawn']);

        $row = $this->actingAs($owner)->getJson('/api/admin/operators')->json('data.0');

        $this->assertSame('free', $row['plan']['code']);
        $this->assertSame(30, $row['plan']['student_limit']);
        $this->assertSame(3, $row['active_students_count']);
        $this->assertSame(4, $row['students_count']);
    }

    public function test_over_limit_filter_finds_operators_with_more_active_students_than_their_plan_allows(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tiny = Plan::create($this->planPayload(['code' => 'tiny', 'student_limit' => 2]));
        $unlimited = Plan::create($this->planPayload(['code' => 'big', 'student_limit' => null]));

        $over = $this->createTenant(['company_name' => 'Over Co', 'plan_id' => $tiny->id]);
        $this->activeStudents($over, 3);
        $within = $this->createTenant(['company_name' => 'Within Co', 'plan_id' => $tiny->id]);
        $this->activeStudents($within, 2);
        $huge = $this->createTenant(['company_name' => 'Unlimited Co', 'plan_id' => $unlimited->id]);
        $this->activeStudents($huge, 50);

        $names = collect($this->actingAs($owner)->getJson('/api/admin/operators?over_limit=1')->json('data'))
            ->pluck('company_name')->all();

        $this->assertSame(['Over Co'], $names);
    }

    public function test_the_operator_list_filters_by_plan(): void
    {
        $owner = $this->createPlatformUser('owner');
        $plan = Plan::create($this->planPayload());
        $this->createTenant(['company_name' => 'On Standard', 'plan_id' => $plan->id]);
        $this->createTenant(['company_name' => 'On Free']);

        $names = collect($this->actingAs($owner)->getJson("/api/admin/operators?plan_id={$plan->id}")->json('data'))
            ->pluck('company_name')->all();

        $this->assertSame(['On Standard'], $names);
    }
}
