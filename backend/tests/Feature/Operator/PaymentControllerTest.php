<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_recording_a_full_payment_marks_the_invoice_paid(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = Invoice::factory()->create(['tenant_id' => $tenant->id, 'final_amount' => 150]);

        $response = $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 150,
        ]);

        $response->assertCreated()->assertJsonPath('status', 'paid');
        $this->assertDatabaseHas('payments', ['invoice_id' => $invoice->id, 'amount_paid' => 150]);
    }

    public function test_a_partial_payment_leaves_the_invoice_issued(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = Invoice::factory()->create(['tenant_id' => $tenant->id, 'final_amount' => 150]);

        $response = $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 50,
        ]);

        $response->assertCreated()->assertJsonPath('status', 'issued');
    }

    public function test_two_partial_payments_that_sum_to_the_full_amount_mark_it_paid(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = Invoice::factory()->create(['tenant_id' => $tenant->id, 'final_amount' => 150]);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash', 'payment_date' => now()->toDateString(), 'amount_paid' => 100,
        ])->assertJsonPath('status', 'issued');

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'bank_transfer', 'payment_date' => now()->toDateString(), 'amount_paid' => 50,
        ])->assertJsonPath('status', 'paid');

        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
    }

    public function test_method_must_be_a_known_payment_method(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = Invoice::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'crypto',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['method']);
    }

    public function test_staff_cannot_record_payments(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $invoice = Invoice::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($staff)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash', 'payment_date' => now()->toDateString(), 'amount_paid' => 10,
        ])->assertStatus(403);
    }

    public function test_admin_cannot_record_a_payment_against_another_tenants_invoice(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $otherInvoice = Invoice::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->postJson("/api/operator/invoices/{$otherInvoice->id}/payments", [
            'method' => 'cash', 'payment_date' => now()->toDateString(), 'amount_paid' => 10,
        ])->assertStatus(404);
    }
}
