<?php

namespace Tests\Feature\Operator;

use App\Models\Invoice;
use App\Models\Route;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TransactionControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function pay(Invoice $invoice, float $amount, string $method = 'cash', string $date = '2026-10-05'): void
    {
        $invoice->payments()->create([
            'tenant_id' => $invoice->tenant_id,
            'method' => $method,
            'payment_date' => $date,
            'amount_paid' => $amount,
        ]);
    }

    public function test_lists_the_operators_own_payments_newest_first(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $this->pay($invoice, 50, date: '2026-10-03');
        $this->pay($invoice, 100, date: '2026-10-09');
        $this->pay($this->createInvoiceForTenant($this->createTenant()), 999);

        $response = $this->actingAs($staff)->getJson('/api/operator/payments');

        $response->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.amount_paid', fn ($amount) => (float) $amount === 100.0)
            ->assertJsonPath('1.amount_paid', fn ($amount) => (float) $amount === 50.0)
            ->assertJsonPath('0.invoice.student.id', $invoice->student_id);
    }

    public function test_can_be_filtered_by_method_date_range_and_route(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id]);
        $onRoute = $this->createInvoiceForTenant($tenant, ['route_id' => $route->id]);
        $offRoute = $this->createInvoiceForTenant($tenant);
        $this->pay($onRoute, 10, 'cash', '2026-10-01');
        $this->pay($onRoute, 20, 'online', '2026-10-10');
        $this->pay($offRoute, 30, 'cash', '2026-10-20');

        $this->actingAs($admin)->getJson('/api/operator/payments?method=online')->assertJsonCount(1);
        $this->actingAs($admin)->getJson('/api/operator/payments?date_from=2026-10-05&date_to=2026-10-15')
            ->assertJsonCount(1)->assertJsonPath('0.amount_paid', fn ($amount) => (float) $amount === 20.0);
        $this->actingAs($admin)->getJson("/api/operator/payments?route_id={$route->id}")->assertJsonCount(2);
    }

    public function test_csv_export_has_a_header_and_one_row_per_payment(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->pay($this->createInvoiceForTenant($tenant), 150, 'bank_transfer');

        $response = $this->actingAs($admin)->get('/api/operator/payments/export');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $lines = array_values(array_filter(explode("\n", trim($response->getContent()))));
        $this->assertCount(2, $lines);
        $this->assertStringContainsString('Payment Date', $lines[0]);
        $this->assertStringContainsString('bank_transfer', $lines[1]);
        $this->assertStringContainsString('150', $lines[1]);
    }

    public function test_can_be_searched_by_child_or_parent_name(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        [, $rajesh] = $this->createParent($tenant, [], ['full_name' => 'Rajesh Kumar']);
        $aditya = \App\Models\Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $rajesh->id, 'full_name' => 'Aditya']);
        $this->pay(Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $aditya->id]), 50);

        [, $meiLing] = $this->createParent($tenant, [], ['full_name' => 'Tan Mei Ling']);
        $junWei = \App\Models\Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $meiLing->id, 'full_name' => 'Jun Wei']);
        $this->pay(Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $junWei->id]), 80);

        $this->actingAs($admin)->getJson('/api/operator/payments?search=ADITYA')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.invoice.student.full_name', 'Aditya');
        $this->actingAs($admin)->getJson('/api/operator/payments?search=mei ling')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.invoice.student.full_name', 'Jun Wei');
        $this->actingAs($admin)->get('/api/operator/payments/export?search=aditya')
            ->assertOk()->assertSee('Aditya')->assertDontSee('Jun Wei');
    }
}
