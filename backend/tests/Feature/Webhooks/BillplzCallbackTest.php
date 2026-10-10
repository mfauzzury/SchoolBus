<?php

namespace Tests\Feature\Webhooks;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentAttemptStatus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\PaymentAttempt;
use App\Services\BillplzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class BillplzCallbackTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private const KEY = 'xsig-test-key';

    private function operator(): BusOperator
    {
        $tenant = $this->createTenant();
        $tenant->forceFill([
            'billplz_secret_key' => 'secret',
            'billplz_x_signature_key' => self::KEY,
            'billplz_collection_id' => 'col123',
        ])->save();

        return $tenant;
    }

    /**
     * @return array{0: PaymentAttempt, 1: Invoice}
     */
    private function attemptFor(BusOperator $tenant, float $amount = 150.00, string $billId = 'bill_abc'): array
    {
        [$user] = $this->createParent($tenant);
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => $amount]);

        $attempt = PaymentAttempt::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'billplz_bill_id' => $billId,
            'bill_url' => "https://www.billplz.com/bills/{$billId}",
            'amount' => $amount,
        ]);
        $attempt->invoices()->attach($invoice->id, ['amount' => $amount]);

        return [$attempt, $invoice];
    }

    private function callbackParams(PaymentAttempt $attempt, array $overrides = [], string $key = self::KEY): array
    {
        $params = [
            'id' => $attempt->billplz_bill_id,
            'collection_id' => 'col123',
            'paid' => 'true',
            'state' => 'paid',
            'amount' => (string) $attempt->amountInCents(),
            'paid_amount' => (string) $attempt->amountInCents(),
            'due_at' => '2026-10-31',
            'email' => 'parent@example.com',
            'mobile' => '',
            'name' => 'Test Parent',
            'url' => 'https://www.billplz.com/bills/'.$attempt->billplz_bill_id,
            'paid_at' => '2026-10-10 12:30:00 +0800',
            ...$overrides,
        ];

        return [...$params, 'x_signature' => BillplzService::sign($params, $key)];
    }

    public function test_a_signed_paid_callback_records_the_payment_and_marks_the_invoice_paid(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt))
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
        $this->assertSame(PaymentAttemptStatus::Paid, $attempt->fresh()->status);
        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'tenant_id' => $invoice->tenant_id,
            'method' => 'online',
            'reference_number' => 'bill_abc',
            'amount_paid' => 150,
        ]);
        $this->assertSame('2026-10-10', $invoice->payments()->first()->payment_date->toDateString());
    }

    public function test_the_callback_works_over_a_real_form_body_with_whitespace_and_empty_values(): void
    {
        // Trim/ConvertEmptyStrings middleware would otherwise corrupt the signed values.
        [$attempt, $invoice] = $this->attemptFor($this->operator());
        $params = $this->callbackParams($attempt, ['name' => 'Test Parent ', 'mobile' => '']);

        $this->call(
            'POST',
            '/api/webhooks/billplz',
            [], [], [],
            ['CONTENT_TYPE' => 'application/x-www-form-urlencoded', 'HTTP_ACCEPT' => 'application/json'],
            http_build_query($params),
        )->assertOk()->assertJsonPath('status', 'ok');

        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
    }

    public function test_a_replayed_callback_does_not_double_record_the_payment(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());
        $params = $this->callbackParams($attempt);

        $this->postJson('/api/webhooks/billplz', $params)->assertOk();
        $this->postJson('/api/webhooks/billplz', $params)->assertOk();

        $this->assertSame(1, $invoice->payments()->count());
    }

    public function test_a_bad_signature_is_rejected_and_nothing_is_recorded(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt, [], 'attacker-key'))
            ->assertForbidden();

        $this->assertSame(InvoiceStatus::Issued, $invoice->fresh()->status);
        $this->assertSame(0, $invoice->payments()->count());
    }

    public function test_tampering_with_a_signed_field_is_rejected(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());
        $params = $this->callbackParams($attempt);
        $params['paid_amount'] = '1';

        $this->postJson('/api/webhooks/billplz', $params)->assertForbidden();
        $this->assertSame(0, $invoice->payments()->count());
    }

    public function test_an_unknown_bill_is_a_404(): void
    {
        $this->operator();
        $attempt = new PaymentAttempt(['billplz_bill_id' => 'nope', 'amount' => 10]);

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt))->assertNotFound();
    }

    public function test_a_signature_from_another_operators_key_is_rejected(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());

        $other = $this->createTenant();
        $other->forceFill(['billplz_x_signature_key' => 'other-operator-key'])->save();

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt, [], 'other-operator-key'))
            ->assertForbidden();

        $this->assertSame(0, $invoice->payments()->count());
    }

    public function test_an_unpaid_callback_is_acknowledged_but_does_not_settle(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt, [
            'paid' => 'false', 'state' => 'due', 'paid_amount' => '0', 'paid_at' => '',
        ]))->assertOk()->assertJsonPath('status', 'ignored');

        $this->assertSame(InvoiceStatus::Issued, $invoice->fresh()->status);
        $this->assertSame(PaymentAttemptStatus::Pending, $attempt->fresh()->status);
    }

    public function test_a_paid_amount_that_disagrees_with_the_attempt_is_not_booked(): void
    {
        [$attempt, $invoice] = $this->attemptFor($this->operator());

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt, ['paid_amount' => '100']))
            ->assertOk()
            ->assertJsonPath('status', 'amount_mismatch');

        $this->assertSame(0, $invoice->payments()->count());
        $this->assertSame(PaymentAttemptStatus::Pending, $attempt->fresh()->status);
    }

    public function test_one_bill_can_settle_several_invoices(): void
    {
        $tenant = $this->operator();
        [$attempt, $first] = $this->attemptFor($tenant, 100.00);
        $second = $this->createInvoiceForTenant($tenant, ['final_amount' => 50]);
        $attempt->invoices()->attach($second->id, ['amount' => 50]);
        $attempt->update(['amount' => 150]);

        $this->postJson('/api/webhooks/billplz', $this->callbackParams($attempt->fresh()))->assertOk();

        $this->assertSame(InvoiceStatus::Paid, $first->fresh()->status);
        $this->assertSame(InvoiceStatus::Paid, $second->fresh()->status);
    }
}
