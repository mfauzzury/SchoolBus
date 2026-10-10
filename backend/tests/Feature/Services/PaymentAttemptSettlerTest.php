<?php

namespace Tests\Feature\Services;

use App\Models\PaymentAttempt;
use App\Services\PaymentAttemptSettler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class PaymentAttemptSettlerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function attempt(): PaymentAttempt
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant);
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);

        $attempt = PaymentAttempt::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'billplz_bill_id' => 'bill_settle',
            'bill_url' => 'https://www.billplz.com/bills/bill_settle',
            'amount' => 150,
        ]);
        $attempt->invoices()->attach($invoice->id, ['amount' => 150]);

        return $attempt;
    }

    public function test_a_payment_with_no_time_given_is_dated_by_the_malaysian_clock(): void
    {
        // 17:00 UTC on the 10th is already 01:00 on the 11th in Kuala Lumpur.
        $this->travelTo('2026-10-10 17:00:00');

        app(PaymentAttemptSettler::class)->settle($this->attempt(), null);

        $this->assertDatabaseHas('payments', ['reference_number' => 'bill_settle', 'payment_date' => '2026-10-11 00:00:00']);
    }

    public function test_a_payment_time_in_utc_is_converted_to_the_malaysian_date(): void
    {
        app(PaymentAttemptSettler::class)->settle($this->attempt(), Carbon::parse('2026-10-10 17:30:00 +0000'));

        $this->assertDatabaseHas('payments', ['reference_number' => 'bill_settle', 'payment_date' => '2026-10-11 00:00:00']);
    }

    public function test_a_payment_time_already_in_malaysian_time_keeps_its_date(): void
    {
        app(PaymentAttemptSettler::class)->settle($this->attempt(), Carbon::parse('2026-10-11 00:30:00 +0800'));

        $this->assertDatabaseHas('payments', ['reference_number' => 'bill_settle', 'payment_date' => '2026-10-11 00:00:00']);
    }
}
