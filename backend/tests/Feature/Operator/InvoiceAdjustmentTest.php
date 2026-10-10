<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\PaymentAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * What an operator may do to a bill after it is issued: add or remove
 * adjustment lines, cancel it, or raise one by hand.
 */
class InvoiceAdjustmentTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function pay(Invoice $invoice, float $amount): void
    {
        $invoice->payments()->create([
            'tenant_id' => $invoice->tenant_id,
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => $amount,
        ]);
    }

    public function test_a_discount_line_reduces_the_bill(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $response = $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Bus broke down for a week',
            'amount' => -20,
        ]);

        $response->assertCreated()
            ->assertJsonPath('final_amount', fn ($amount) => (float) $amount === 130.0)
            ->assertJsonPath('discount_amount', fn ($amount) => (float) $amount === 20.0)
            ->assertJsonPath('balance', '130.00')
            ->assertJsonPath('status', 'issued')
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.1.type', 'adjustment')
            ->assertJsonPath('items.1.description', 'Bus broke down for a week');
        $this->assertDatabaseHas('invoice_items', ['invoice_id' => $invoice->id, 'amount' => -20, 'created_by' => $admin->id]);
    }

    public function test_an_extra_charge_line_increases_the_bill(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Replacement bus card',
            'amount' => 10,
        ])->assertCreated()
            ->assertJsonPath('amount_before_discount', fn ($amount) => (float) $amount === 160.0)
            ->assertJsonPath('final_amount', fn ($amount) => (float) $amount === 160.0);
    }

    public function test_an_adjustment_needs_a_reason_and_a_non_zero_amount(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", ['amount' => 0])
            ->assertStatus(422)->assertJsonValidationErrors(['description', 'amount']);
    }

    public function test_a_bill_cannot_be_reduced_below_what_is_already_paid(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $this->pay($invoice, 100);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Too generous',
            'amount' => -60,
        ])->assertStatus(422)->assertJsonValidationErrors(['amount']);

        // Rolled back: no stray line, totals untouched.
        $this->assertSame(1, $invoice->items()->count());
        $this->assertEquals(150.0, (float) $invoice->fresh()->final_amount);
    }

    public function test_a_bill_cannot_be_reduced_below_zero(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Oops',
            'amount' => -200,
        ])->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_reducing_a_bill_to_what_was_already_paid_settles_it(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $this->pay($invoice, 100);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Waive the rest',
            'amount' => -50,
        ])->assertCreated()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('balance', '0.00');
        $this->assertNotNull($invoice->fresh()->paid_at);
    }

    public function test_paid_bills_are_locked(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant, ['status' => InvoiceStatus::Paid]);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Late change',
            'amount' => -10,
        ])->assertStatus(422);
        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/void", ['reason' => 'Mistake'])
            ->assertStatus(422);
    }

    public function test_an_adjustment_line_can_be_removed_but_the_fee_line_cannot(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $feeLine = $invoice->items()->firstOrFail();

        $adjustmentId = $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Goodwill',
            'amount' => -20,
        ])->json('items.1.id');

        $this->actingAs($admin)->deleteJson("/api/operator/invoices/{$invoice->id}/items/{$feeLine->id}")
            ->assertStatus(422);

        $this->actingAs($admin)->deleteJson("/api/operator/invoices/{$invoice->id}/items/{$adjustmentId}")
            ->assertOk()
            ->assertJsonPath('final_amount', fn ($amount) => (float) $amount === 150.0)
            ->assertJsonCount(1, 'items');
    }

    public function test_removing_a_charge_cannot_take_the_bill_below_what_is_paid(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $chargeId = $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", [
            'description' => 'Extra stop',
            'amount' => 30,
        ])->json('items.1.id');
        $this->pay($invoice, 170);

        $this->actingAs($admin)->deleteJson("/api/operator/invoices/{$invoice->id}/items/{$chargeId}")
            ->assertStatus(422);
        $this->assertEquals(180.0, (float) $invoice->fresh()->final_amount);
    }

    public function test_a_line_cannot_be_removed_through_a_different_bill(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $other = $this->createInvoiceForTenant($tenant);

        $adjustmentId = $this->actingAs($admin)->postJson("/api/operator/invoices/{$other->id}/items", [
            'description' => 'Goodwill',
            'amount' => -20,
        ])->json('items.1.id');

        $this->actingAs($admin)->deleteJson("/api/operator/invoices/{$invoice->id}/items/{$adjustmentId}")
            ->assertStatus(404);
    }

    public function test_cancelling_a_bill_keeps_it_on_record_but_out_of_the_ledger(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/void", ['reason' => 'Billed the wrong child'])
            ->assertOk()
            ->assertJsonPath('status', 'void')
            ->assertJsonPath('void_reason', 'Billed the wrong child')
            ->assertJsonPath('balance', '0.00');

        $this->assertNotNull($invoice->fresh()->voided_at);
        $this->actingAs($admin)->getJson('/api/operator/invoices')->assertOk()->assertJsonCount(0);
        $this->actingAs($admin)->getJson('/api/operator/invoices?status=void')->assertOk()->assertJsonCount(1);
    }

    public function test_cancelling_needs_a_reason(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/void", [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason']);
    }

    public function test_a_bill_with_a_payment_cannot_be_cancelled(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $this->pay($invoice, 10);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/void", ['reason' => 'Mistake'])
            ->assertStatus(422);
        $this->assertEquals(InvoiceStatus::Issued, $invoice->fresh()->status);
    }

    public function test_a_cancelled_bill_cannot_take_a_payment(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant, ['status' => InvoiceStatus::Void]);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 150,
        ])->assertStatus(422);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_a_bill_being_paid_online_cannot_be_changed_until_the_checkout_goes_stale(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [$parentUser] = $this->createParent($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $attempt = PaymentAttempt::create(['tenant_id' => $tenant->id, 'user_id' => $parentUser->id, 'amount' => 150]);
        $attempt->invoices()->attach($invoice->id, ['amount' => 150]);

        $adjustment = ['description' => 'Goodwill', 'amount' => -20];

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", $adjustment)->assertStatus(409);
        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/void", ['reason' => 'Mistake'])->assertStatus(409);

        // An abandoned checkout never completes, so it only blocks for a while.
        $this->travel(31)->minutes();

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/items", $adjustment)->assertCreated();
    }

    public function test_staff_can_neither_adjust_cancel_nor_raise_bills(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $itemId = $invoice->items()->firstOrFail()->id;

        $this->actingAs($staff)->postJson("/api/operator/invoices/{$invoice->id}/items", ['description' => 'x', 'amount' => -1])->assertStatus(403);
        $this->actingAs($staff)->deleteJson("/api/operator/invoices/{$invoice->id}/items/{$itemId}")->assertStatus(403);
        $this->actingAs($staff)->postJson("/api/operator/invoices/{$invoice->id}/void", ['reason' => 'x'])->assertStatus(403);
        $this->actingAs($staff)->postJson('/api/operator/invoices', ['student_id' => $invoice->student_id, 'year' => 2026, 'month' => 10])->assertStatus(403);
    }

    public function test_admin_cannot_touch_another_tenants_bill(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $otherInvoice = $this->createInvoiceForTenant($this->createTenant());
        $otherItemId = $otherInvoice->items()->firstOrFail()->id;

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$otherInvoice->id}/items", ['description' => 'x', 'amount' => -1])->assertStatus(404);
        $this->actingAs($admin)->deleteJson("/api/operator/invoices/{$otherInvoice->id}/items/{$otherItemId}")->assertStatus(404);
        $this->actingAs($admin)->postJson("/api/operator/invoices/{$otherInvoice->id}/void", ['reason' => 'x'])->assertStatus(404);
        $this->actingAs($admin)->postJson('/api/operator/invoices', ['student_id' => $otherInvoice->student_id, 'year' => 2026, 'month' => 10])
            ->assertStatus(422)->assertJsonValidationErrors(['student_id']);

        $this->assertSame(1, $otherInvoice->items()->withoutGlobalScopes()->count());
        $this->assertEquals(InvoiceStatus::Issued, $otherInvoice->fresh()->status);
    }

    public function test_admin_can_raise_a_bill_by_hand_for_a_month_but_not_twice(): void
    {
        $this->travelTo('2026-10-20 03:00:00');
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);
        $payload = ['student_id' => $student->id, 'year' => 2026, 'month' => 9];

        $this->actingAs($admin)->postJson('/api/operator/invoices', $payload)
            ->assertCreated()
            ->assertJsonPath('period_start', '2026-09-01T00:00:00.000000Z')
            ->assertJsonPath('final_amount', fn ($amount) => (float) $amount === 150.0)
            ->assertJsonPath('student.id', $student->id)
            ->assertJsonCount(1, 'items');

        $this->actingAs($admin)->postJson('/api/operator/invoices', $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['month']);
        $this->assertSame(1, $student->invoices()->count());
    }

    public function test_a_cancelled_bill_can_be_raised_again(): void
    {
        $this->travelTo('2026-10-05 03:00:00');
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);
        $payload = ['student_id' => $student->id, 'year' => 2026, 'month' => 10];

        $firstId = $this->actingAs($admin)->postJson('/api/operator/invoices', $payload)->json('id');
        $this->actingAs($admin)->postJson("/api/operator/invoices/{$firstId}/void", ['reason' => 'Wrong fee'])->assertOk();

        $this->actingAs($admin)->postJson('/api/operator/invoices', $payload)->assertCreated();
        $this->assertSame(2, $student->invoices()->count());
    }

    public function test_a_bill_cannot_be_raised_for_a_student_with_no_price(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => null]);

        $this->actingAs($admin)->postJson('/api/operator/invoices', ['student_id' => $student->id, 'year' => 2026, 'month' => 10])
            ->assertStatus(422)->assertJsonValidationErrors(['student_id']);
    }
}
