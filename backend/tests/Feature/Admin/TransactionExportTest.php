<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TransactionExportTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function payment($tenant, array $overrides = []): Payment
    {
        return Payment::create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $this->createInvoiceForTenant($tenant)->id,
            'method' => 'cash',
            'payment_date' => '2026-07-01',
            'amount_paid' => 10,
            ...$overrides,
        ]);
    }

    public function test_index_is_paged_but_totals_cover_every_match(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $invoice = $this->createInvoiceForTenant($tenant);
        foreach (range(1, 27) as $i) {
            Payment::create([
                'tenant_id' => $tenant->id, 'invoice_id' => $invoice->id,
                'method' => 'cash', 'payment_date' => '2026-07-01', 'amount_paid' => 10,
            ]);
        }

        $first = $this->actingAs($owner)->getJson('/api/admin/transactions')->assertOk();
        $first->assertJsonCount(25, 'data')->assertJsonPath('last_page', 2)
            ->assertJsonPath('totals.count', 27)->assertJsonPath('totals.amount', 270);

        $this->actingAs($owner)->getJson('/api/admin/transactions?page=2')
            ->assertJsonCount(2, 'data')->assertJsonPath('totals.amount', 270);
    }

    public function test_totals_follow_the_filters(): void
    {
        $owner = $this->createPlatformUser('finance');
        $tenant = $this->createTenant();
        $this->payment($tenant, ['method' => 'fpx', 'amount_paid' => 30]);
        $this->payment($tenant, ['method' => 'cash', 'amount_paid' => 5]);

        $this->actingAs($owner)->getJson('/api/admin/transactions?method=fpx')
            ->assertJsonPath('totals.count', 1)->assertJsonPath('totals.amount', 30);
        $this->actingAs($owner)->getJson('/api/admin/transactions?method=bogus')->assertStatus(422);
    }

    public function test_owner_and_finance_can_export_but_support_cannot(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses', 'operator_code' => '12345']);
        $this->payment($tenant, ['reference_number' => 'REF-1', 'amount_paid' => 42.5]);

        $this->actingAs($this->createPlatformUser('support'))->get('/api/admin/transactions/export')->assertForbidden();

        foreach (['owner', 'finance'] as $level) {
            $response = $this->actingAs($this->createPlatformUser($level))->get('/api/admin/transactions/export');
            $response->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

            $rows = array_map('str_getcsv', array_filter(explode("\n", $response->getContent())));
            $this->assertSame(['Payment Date', 'Operator', 'Operator Code', 'Student', 'Route', 'Method', 'Reference', 'Amount'], $rows[0]);
            $this->assertSame('Alpha Buses', $rows[1][1]);
            $this->assertSame('12345', $rows[1][2]);
            $this->assertSame('REF-1', $rows[1][6]);
            $this->assertSame('42.50', $rows[1][7]);
        }
    }

    public function test_export_respects_filters_and_is_logged(): void
    {
        $owner = $this->createPlatformUser('owner');
        $a = $this->createTenant(['company_name' => 'Alpha Buses']);
        $b = $this->createTenant(['company_name' => 'Beta Buses']);
        $this->payment($a);
        $this->payment($b);

        $csv = $this->actingAs($owner)->get("/api/admin/transactions/export?operator_id={$a->id}")->getContent();

        $this->assertStringContainsString('Alpha Buses', $csv);
        $this->assertStringNotContainsString('Beta Buses', $csv);
        $this->assertTrue(ActivityLog::where('action', 'transactions_exported')->where('tenant_id', $a->id)->exists());
    }

    public function test_spreadsheet_formulas_in_operator_typed_text_are_neutralised(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $this->payment($tenant, ['reference_number' => '=HYPERLINK("http://evil.test")']);

        $csv = $this->actingAs($owner)->get('/api/admin/transactions/export')->getContent();

        $this->assertStringNotContainsString(',"=HYPERLINK', $csv);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_online_payment_attempts_list_shows_status_and_stuck_flag(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant(['company_name' => 'Pay Co']);
        [$parent] = $this->createParent($tenant);
        (new PaymentAttempt)->forceFill(['tenant_id' => $tenant->id, 'user_id' => $parent->id, 'amount' => 80, 'status' => 'pending', 'created_at' => now()->subHours(2)])->save();
        (new PaymentAttempt)->forceFill(['tenant_id' => $tenant->id, 'user_id' => $parent->id, 'amount' => 60, 'status' => 'paid', 'paid_at' => now()])->save();

        $all = $this->actingAs($support)->getJson('/api/admin/payment-attempts')->assertOk();
        $all->assertJsonPath('total', 2);
        $this->assertSame('Pay Co', $all->json('data.0.bus_operator.company_name'));

        $stuck = $this->actingAs($support)->getJson('/api/admin/payment-attempts?stuck=1')->assertOk();
        $stuck->assertJsonPath('total', 1)->assertJsonPath('data.0.stuck', true);

        $this->actingAs($support)->getJson('/api/admin/payment-attempts?status=paid')
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.stuck', false);
    }

    public function test_operators_cannot_read_platform_payment_attempts(): void
    {
        $tenant = $this->createTenant();

        $this->actingAs($this->createOperatorAdmin($tenant))->getJson('/api/admin/payment-attempts')->assertForbidden();
    }
}
