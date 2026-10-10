<?php

namespace Tests\Feature\Admin;

use App\Enums\PaymentAttemptStatus;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\Plan;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class DashboardInsightsTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function pay($tenant, string $date, float $amount): void
    {
        Payment::create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $this->createInvoiceForTenant($tenant)->id,
            'method' => 'cash',
            'payment_date' => $date,
            'amount_paid' => $amount,
        ]);
    }

    public function test_summary_puts_this_month_next_to_last_month(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant(['created_at' => now()->startOfMonth()->subMonth()->addDays(2)]);
        $this->createTenant(['created_at' => now()->startOfMonth()->addHours(1)]);
        $this->createTenant(['created_at' => now()->startOfMonth()->addHours(2)]);
        [, $parent] = $this->createParent($tenant);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'created_at' => now()->startOfMonth()->subDay()]);

        $this->pay($tenant, now()->startOfMonth()->toDateString(), 100);
        $this->pay($tenant, now()->startOfMonth()->subDay()->toDateString(), 40);
        $this->pay($tenant, now()->startOfMonth()->subMonths(2)->toDateString(), 999);

        $response = $this->actingAs($owner)->getJson('/api/admin/dashboard/summary')->assertOk();

        $response->assertJsonPath('this_month.new_operators', 2)
            ->assertJsonPath('last_month.new_operators', 1)
            ->assertJsonPath('this_month.collected', 100)
            ->assertJsonPath('last_month.collected', 40)
            ->assertJsonPath('last_month.new_students', 1);
    }

    public function test_trends_cover_twelve_months_oldest_first(): void
    {
        $owner = $this->createPlatformUser('support');
        $tenant = $this->createTenant(['created_at' => now()->startOfMonth()->subMonths(11)->addDay()]);
        $this->pay($tenant, now()->toDateString(), 75.5);

        $months = $this->actingAs($owner)->getJson('/api/admin/dashboard/trends')
            ->assertOk()->assertJsonCount(12, 'months')->json('months');

        $this->assertSame(now()->startOfMonth()->subMonths(11)->format('Y-m'), $months[0]['month']);
        $this->assertSame(now()->format('Y-m'), $months[11]['month']);
        $this->assertSame(1, $months[0]['new_operators']);
        $this->assertSame(75.5, $months[11]['collected']);
        // The invoice helper creates a parent/student/operator-less record only for the paying tenant.
        $this->assertSame(0, $months[5]['new_operators']);
    }

    public function test_attention_counts_each_reason_and_skips_suspended_operators(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tiny = Plan::create([
            'name' => 'Tiny', 'code' => 'tiny', 'student_limit' => 1,
            'monthly_price' => 0, 'price_per_student' => 0, 'is_default' => false, 'is_active' => true,
        ]);

        // Old, connected, busy, logged in recently, over a 1-student limit.
        $busy = $this->createTenant(['company_name' => 'Busy Co', 'plan_id' => $tiny->id, 'created_at' => now()->subDays(60)]);
        $busy->forceFill(['billplz_secret_key' => 'k', 'billplz_x_signature_key' => 'x', 'billplz_collection_id' => 'c'])->save();
        $this->ensureRole('operator_admin');
        $this->createOperatorAdmin($busy, ['last_login_at' => now()->subDays(2)]);
        $this->createBillableStudent($busy);
        $this->createBillableStudent($busy);

        // Old, never logged in, no students, no Billplz.
        $quiet = $this->createTenant(['company_name' => 'Quiet Co', 'created_at' => now()->subDays(60)]);
        $this->createOperatorAdmin($quiet, ['last_login_at' => now()->subDays(45)]);

        // Joined today.
        $this->createTenant(['company_name' => 'Fresh Co']);

        // Suspended operators are never flagged.
        $this->createTenant(['company_name' => 'Gone Co', 'status' => 'suspended', 'created_at' => now()->subDays(60)]);

        $data = $this->actingAs($owner)->getJson('/api/admin/dashboard/attention')->assertOk()->json();

        $names = fn (string $kind) => collect($data[$kind]['items'])->pluck('company_name')->sort()->values()->all();

        $this->assertSame(['Fresh Co'], $names('new'));
        $this->assertSame(['Fresh Co', 'Quiet Co'], $names('no_billplz'));
        $this->assertSame(['Quiet Co'], $names('no_students'));
        $this->assertSame(['Busy Co'], $names('over_limit'));
        $this->assertSame(['Quiet Co'], $names('inactive'));
        $this->assertSame(2, $data['no_billplz']['count']);
    }

    public function test_the_operator_list_attention_filter_matches_the_dashboard_count(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->createTenant(['company_name' => 'Old A', 'created_at' => now()->subDays(40)]);
        $this->createTenant(['company_name' => 'Old B', 'created_at' => now()->subDays(40)]);
        $this->createTenant(['company_name' => 'New C']);

        $attention = $this->actingAs($owner)->getJson('/api/admin/dashboard/attention')->json();
        foreach (['new', 'no_billplz', 'no_students', 'over_limit', 'inactive'] as $kind) {
            $total = $this->actingAs($owner)->getJson("/api/admin/operators?attention={$kind}")
                ->assertOk()->json('total');
            $this->assertSame($attention[$kind]['count'], $total, "attention={$kind}");
        }

        $this->actingAs($owner)->getJson('/api/admin/operators?attention=nonsense')->assertStatus(422);
    }

    public function test_a_brand_new_operator_signup_is_not_flagged_inactive(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->ensureRole('operator_admin');

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'Fresh Buses', 'contact_person' => 'Aminah', 'contact_phone' => '0123456789',
            'email' => 'fresh@buses.test', 'password' => 'password1',
        ])->assertCreated();

        $user = User::firstWhere('email', 'fresh@buses.test');
        $this->assertNotNull($user->last_login_at);
        $this->assertSame(0, $this->actingAs($owner)->getJson('/api/admin/dashboard/attention')->json('inactive.count'));
    }

    public function test_stuck_online_payments_are_pending_attempts_older_than_an_hour(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant(['company_name' => 'Pay Co']);
        [$parent] = $this->createParent($tenant);

        // created_at is not mass-assignable, so backdate through forceFill.
        $make = fn (array $attrs) => tap(
            (new PaymentAttempt)->forceFill(['tenant_id' => $tenant->id, 'user_id' => $parent->id, 'amount' => 50, ...$attrs]),
            fn (PaymentAttempt $attempt) => $attempt->save(),
        );
        $stuck = $make(['status' => PaymentAttemptStatus::Pending, 'created_at' => now()->subHours(3)]);
        $make(['status' => PaymentAttemptStatus::Pending, 'created_at' => now()->subMinutes(10)]);
        $make(['status' => PaymentAttemptStatus::Paid, 'created_at' => now()->subHours(3), 'paid_at' => now()]);

        $data = $this->actingAs($owner)->getJson('/api/admin/dashboard/attention')->json('stuck_payments');

        $this->assertSame(1, $data['count']);
        $this->assertSame($stuck->id, $data['items'][0]['id']);
        $this->assertSame('Pay Co', $data['items'][0]['company_name']);
    }

    public function test_operators_and_parents_cannot_read_the_insights(): void
    {
        $tenant = $this->createTenant();
        $operator = $this->createOperatorAdmin($tenant);

        foreach (['trends', 'attention'] as $endpoint) {
            $this->actingAs($operator)->getJson("/api/admin/dashboard/{$endpoint}")->assertForbidden();
        }
    }
}
