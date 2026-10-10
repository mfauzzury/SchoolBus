<?php

namespace Tests\Feature\ParentPortal;

use App\Enums\InvoiceStatus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\ParentProfile;
use App\Models\PaymentAttempt;
use App\Models\Student;
use App\Models\User;
use App\Services\BillplzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private const KEY = 'xsig-test-key';

    private function enabledTenant(): BusOperator
    {
        $tenant = $this->createTenant(['company_name' => 'Sunrise Transport']);
        $tenant->forceFill([
            'billplz_secret_key' => 'sk_live_secret',
            'billplz_x_signature_key' => self::KEY,
            'billplz_collection_id' => 'col123',
            'billplz_sandbox' => true,
        ])->save();

        return $tenant;
    }

    /**
     * @return array{0: User, 1: ParentProfile, 2: Invoice}
     */
    private function parentWithInvoice(BusOperator $tenant, float $amount = 150): array
    {
        [$user, $profile] = $this->createParent($tenant, [], ['full_name' => 'Aisyah Rahman']);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $profile->id]);
        $invoice = Invoice::factory()->create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'final_amount' => $amount,
        ]);

        return [$user, $profile, $invoice];
    }

    private function fakeBillplz(): void
    {
        Http::fake([
            'www.billplz-sandbox.com/api/v3/bills' => Http::response([
                'id' => 'bill_xyz',
                'url' => 'https://www.billplz-sandbox.com/bills/bill_xyz',
            ], 200),
        ]);
    }

    public function test_config_reports_whether_online_payments_are_enabled(): void
    {
        [$user] = $this->parentWithInvoice($this->enabledTenant());
        $this->actingAs($user)->getJson('/api/parent/payments/config')->assertOk()->assertJson(['enabled' => true]);

        [$other] = $this->parentWithInvoice($this->createTenant());
        $this->actingAs($other)->getJson('/api/parent/payments/config')->assertOk()->assertJson(['enabled' => false]);
    }

    public function test_starting_a_checkout_creates_a_bill_for_the_outstanding_amount(): void
    {
        $this->fakeBillplz();
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant(), 150);

        // A RM 50 cash deposit was already recorded — only RM 100 is still owed.
        $invoice->recordPayment([
            'method' => 'cash', 'payment_date' => now()->toDateString(), 'amount_paid' => 50,
        ]);

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id]])
            ->assertCreated()
            ->assertJsonPath('url', 'https://www.billplz-sandbox.com/bills/bill_xyz');

        Http::assertSent(function (HttpRequest $request) {
            return $request->url() === 'https://www.billplz-sandbox.com/api/v3/bills'
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('sk_live_secret:'))
                && $request['collection_id'] === 'col123'
                && (int) $request['amount'] === 10000
                && $request['email'] !== null
                && $request['name'] === 'Aisyah Rahman'
                && str_ends_with($request['callback_url'], '/api/webhooks/billplz')
                && str_contains($request['redirect_url'], '/parent/invoices/pay/return/');
        });

        $attempt = PaymentAttempt::firstOrFail();
        $this->assertSame('bill_xyz', $attempt->billplz_bill_id);
        $this->assertEquals(100, $attempt->amount);
        $this->assertSame($user->id, $attempt->user_id);
    }

    public function test_the_client_cannot_choose_the_amount(): void
    {
        $this->fakeBillplz();
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant(), 150);

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id], 'amount' => 1])
            ->assertCreated();

        $this->assertEquals(150, PaymentAttempt::firstOrFail()->amount);
    }

    public function test_it_refuses_another_parents_invoices(): void
    {
        $this->fakeBillplz();
        $tenant = $this->enabledTenant();
        [$user] = $this->parentWithInvoice($tenant);
        [, , $foreign] = $this->parentWithInvoice($tenant);

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$foreign->id]])
            ->assertStatus(422);

        $this->assertSame(0, PaymentAttempt::count());
        Http::assertNothingSent();
    }

    public function test_it_refuses_invoices_that_are_already_paid(): void
    {
        $this->fakeBillplz();
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $invoice->update(['status' => InvoiceStatus::Paid]);

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id]])
            ->assertStatus(422);
    }

    public function test_it_is_unavailable_when_the_operator_has_no_billplz_credentials(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->createTenant());

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id]])
            ->assertStatus(422);
    }

    public function test_a_billplz_outage_returns_502_and_leaves_no_attempt_behind(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'Unauthorized']], 401)]);
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());

        $this->actingAs($user)
            ->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id]])
            ->assertStatus(502);

        $this->assertSame(0, PaymentAttempt::count());
    }

    private function startCheckout(User $user, Invoice $invoice): PaymentAttempt
    {
        $this->fakeBillplz();
        $this->actingAs($user)->postJson('/api/parent/payments', ['invoice_ids' => [$invoice->id]])->assertCreated();

        return PaymentAttempt::firstOrFail();
    }

    private function redirectParams(array $overrides = [], string $key = self::KEY): array
    {
        $billplz = ['id' => 'bill_xyz', 'paid' => 'true', 'paid_at' => '2026-10-10 12:30:00 +0800', ...$overrides];

        return ['billplz' => [
            ...$billplz,
            'x_signature' => BillplzService::sign(BillplzService::prefixRedirectParams($billplz), $key),
        ]];
    }

    public function test_a_signed_paid_redirect_settles_the_invoice_immediately(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $attempt = $this->startCheckout($user, $invoice);

        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams())
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
        $this->assertSame(1, $invoice->payments()->count());

        // Confirming again (or the callback arriving too) must not double-book.
        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams())
            ->assertOk();
        $this->assertSame(1, $invoice->payments()->count());
    }

    public function test_a_paid_attempt_lists_the_receipts_it_created(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $attempt = $this->startCheckout($user, $invoice);

        // Nothing to download until it is paid.
        $this->actingAs($user)->getJson("/api/parent/payments/{$attempt->id}")
            ->assertOk()->assertJsonPath('receipts', []);

        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams())
            ->assertOk()
            ->assertJsonCount(1, 'receipts')
            ->assertJsonPath('receipts.0.payment_id', $invoice->payments()->first()->id)
            ->assertJsonPath('receipts.0.student_name', $invoice->student->full_name);

        // The same receipt must be downloadable by this parent.
        $paymentId = $invoice->payments()->first()->id;
        $this->actingAs($user)->get("/api/parent/payments/{$paymentId}/receipt")->assertOk();
    }

    public function test_a_forged_redirect_is_rejected(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $attempt = $this->startCheckout($user, $invoice);

        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams([], 'guessed-key'))
            ->assertForbidden();

        $this->assertSame(InvoiceStatus::Issued, $invoice->fresh()->status);
    }

    public function test_a_validly_signed_redirect_for_a_different_bill_is_rejected(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $attempt = $this->startCheckout($user, $invoice);

        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams(['id' => 'some_other_bill']))
            ->assertForbidden();

        $this->assertSame(InvoiceStatus::Issued, $invoice->fresh()->status);
    }

    public function test_an_unpaid_redirect_leaves_the_attempt_pending_and_offers_retry(): void
    {
        [$user, , $invoice] = $this->parentWithInvoice($this->enabledTenant());
        $attempt = $this->startCheckout($user, $invoice);

        $this->actingAs($user)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams(['paid' => 'false', 'paid_at' => '']))
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('bill_url', 'https://www.billplz-sandbox.com/bills/bill_xyz');

        $this->assertSame(0, $invoice->payments()->count());
    }

    public function test_a_parent_cannot_read_or_confirm_another_parents_attempt(): void
    {
        $tenant = $this->enabledTenant();
        [$owner, , $invoice] = $this->parentWithInvoice($tenant);
        [$intruder] = $this->parentWithInvoice($tenant);
        $attempt = $this->startCheckout($owner, $invoice);

        $this->actingAs($intruder)->getJson("/api/parent/payments/{$attempt->id}")->assertNotFound();
        $this->actingAs($intruder)
            ->postJson("/api/parent/payments/{$attempt->id}/confirm", $this->redirectParams())
            ->assertNotFound();
    }
}
