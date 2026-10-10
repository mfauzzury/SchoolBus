<?php

namespace Tests\Feature\Receipts;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Services\ReceiptBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * A receipt is issued per payment, so a part-payment is acknowledged straight
 * away and each receipt says what was paid before and what is still owed.
 */
class ReceiptTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function pay(Invoice $invoice, float $amount, string $method = 'cash', string $date = '2026-10-05', ?string $reference = null): Payment
    {
        return $invoice->payments()->create([
            'tenant_id' => $invoice->tenant_id,
            'method' => $method,
            'reference_number' => $reference,
            'payment_date' => $date,
            'amount_paid' => $amount,
        ]);
    }

    private function html(Payment $payment): string
    {
        return view('receipts.payment', app(ReceiptBuilder::class)->viewData($payment->fresh()))->render();
    }

    public function test_a_payment_downloads_as_a_pdf_for_admin_and_staff(): void
    {
        $tenant = $this->createTenant();
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        $payment = $this->pay($invoice, 150);

        foreach ([$this->createOperatorAdmin($tenant), $this->createOperatorStaff($tenant)] as $user) {
            $response = $this->actingAs($user)->get("/api/operator/payments/{$payment->id}/receipt");

            $response->assertOk();
            $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
            $this->assertStringStartsWith('%PDF', $response->getContent());
        }
    }

    public function test_a_part_payment_gets_a_receipt_showing_the_balance_still_owed(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        $payment = $this->pay($invoice, 50);

        // The bill is still unpaid, yet the parent already has proof of the RM50.
        $this->actingAs($admin)->get("/api/operator/payments/{$payment->id}/receipt")->assertOk();

        $data = app(ReceiptBuilder::class)->viewData($payment);
        $this->assertEquals(0.0, $data['paidBefore']);
        $this->assertEquals(100.0, $data['balanceAfter']);
        $this->assertStringContainsString('Balance remaining', $this->html($payment));
    }

    public function test_each_receipt_counts_only_the_payments_made_before_it(): void
    {
        $tenant = $this->createTenant();
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        // Recorded out of order on purpose: dates decide, not entry order.
        $online = $this->pay($invoice, 120, 'online', '2026-10-10', 'p3d7w1zz');
        $cash = $this->pay($invoice, 30, 'cash', '2026-10-02', 'CASH-001');

        $cashData = app(ReceiptBuilder::class)->viewData($cash);
        $onlineData = app(ReceiptBuilder::class)->viewData($online->fresh());

        $this->assertEquals(0.0, $cashData['paidBefore']);
        $this->assertEquals(120.0, $cashData['balanceAfter']);

        $this->assertEquals(30.0, $onlineData['paidBefore']);
        $this->assertEquals(0.0, $onlineData['balanceAfter']);

        $html = $this->html($online);
        $this->assertStringContainsString('Paid in full', $html);
        $this->assertStringContainsString('Paid before this payment', $html);
        $this->assertStringContainsString('Online payment (Billplz)', $html);
        $this->assertStringContainsString('p3d7w1zz', $html);
    }

    public function test_payments_on_the_same_day_are_ordered_by_when_they_were_recorded(): void
    {
        $tenant = $this->createTenant();
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        $first = $this->pay($invoice, 100, 'cash', '2026-10-05');
        $second = $this->pay($invoice, 50, 'cash', '2026-10-05');

        $this->assertEquals(0.0, app(ReceiptBuilder::class)->viewData($first)['paidBefore']);
        $this->assertEquals(100.0, app(ReceiptBuilder::class)->viewData($second->fresh())['paidBefore']);
    }

    public function test_the_receipt_has_its_own_number_and_shows_the_bills_lines(): void
    {
        $tenant = $this->createTenant();
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        $invoice->items()->create([
            'tenant_id' => $tenant->id,
            'type' => 'adjustment',
            'description' => 'Goodwill discount',
            'amount' => -10,
        ]);
        $payment = $this->pay($invoice, 140);

        $html = $this->html($payment);

        $this->assertMatchesRegularExpression('/^R-\d{6}$/', $payment->receipt_number);
        $this->assertStringContainsString($payment->receipt_number, $html);
        $this->assertStringContainsString('Bus fee', $html);
        $this->assertStringContainsString('Goodwill discount', $html);
    }

    public function test_a_parent_can_download_their_childs_receipt_but_not_another_familys(): void
    {
        $tenant = $this->createTenant();
        [$parentUser, $parent] = $this->createParent($tenant);
        [, $otherParent] = $this->createParent($tenant);
        $mine = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);
        $theirs = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $otherParent->id]);

        $myPayment = $this->pay(Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $mine->id]), 50);
        $theirPayment = $this->pay(Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $theirs->id]), 50);

        $this->actingAs($parentUser)->get("/api/parent/payments/{$myPayment->id}/receipt")->assertOk();
        $this->actingAs($parentUser)->get("/api/parent/payments/{$theirPayment->id}/receipt")->assertStatus(404);
    }

    public function test_an_operator_cannot_download_another_operators_receipt(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $otherTenant = $this->createTenant();
        $other = $this->pay($this->createInvoiceForTenant($otherTenant), 50);

        $this->actingAs($admin)->get("/api/operator/payments/{$other->id}/receipt")->assertStatus(404);
    }

    public function test_the_bill_level_receipt_no_longer_exists(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);

        $this->actingAs($admin)->get("/api/operator/invoices/{$invoice->id}/receipt")->assertStatus(404);
    }

    public function test_payments_carry_their_receipt_number_in_the_api(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $invoice = $this->createInvoiceForTenant($tenant);
        $payment = $this->pay($invoice, 50);

        $this->actingAs($admin)->getJson("/api/operator/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('payments.0.receipt_number', $payment->receipt_number);
    }
}
