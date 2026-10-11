<?php

namespace Tests\Feature\Operator;

use App\Models\BusOperator;
use App\Services\ReceiptBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class CompanyDetailsTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function profile(BusOperator $tenant, array $overrides = []): array
    {
        return [
            'company_name' => $tenant->company_name,
            'contact_person' => $tenant->contact_person,
            'contact_phone' => $tenant->contact_phone,
            'email' => $tenant->email,
            ...$overrides,
        ];
    }

    public function test_the_company_details_are_saved(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, [
            'legal_name' => 'Alpha Express Sdn Bhd',
            'ssm_number' => '201901234567 (1234567-A)',
            'address_line1' => '12 Jalan Maju',
            'address_line2' => 'Taman Melati',
            'postcode' => '53100',
            'city' => 'Kuala Lumpur',
            'state' => 'Kuala Lumpur',
            'whatsapp_number' => '+60 12-345 6789',
            'payment_note' => 'Letak nama anak sebagai rujukan.',
        ]))->assertOk()
            ->assertJsonPath('legal_name', 'Alpha Express Sdn Bhd')
            ->assertJsonPath('whatsapp_number', '+60 12-345 6789');

        $fresh = $tenant->fresh();
        $this->assertSame('201901234567 (1234567-A)', $fresh->ssm_number);
        $this->assertSame('12 Jalan Maju, Taman Melati, 53100 Kuala Lumpur, Kuala Lumpur', $fresh->fullAddress());
    }

    public function test_every_company_detail_is_optional_and_can_be_cleared(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, [
            'legal_name' => 'Alpha Express Sdn Bhd', 'payment_note' => 'Hello',
        ]))->assertOk();

        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, [
            'legal_name' => '', 'payment_note' => '',
        ]))->assertOk();

        $fresh = $tenant->fresh();
        $this->assertNull($fresh->legal_name);
        $this->assertNull($fresh->payment_note);
        $this->assertNull($fresh->fullAddress());
    }

    public function test_saving_without_the_new_fields_keeps_what_is_stored(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['ssm_number' => '12345-A']))->assertOk();

        // An older form (or an app) that only knows the original four fields.
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['contact_person' => 'New Person']))
            ->assertOk();

        $this->assertSame('12345-A', $tenant->fresh()->ssm_number);
    }

    public function test_the_postcode_state_and_whatsapp_number_are_checked(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['postcode' => '5310']))
            ->assertStatus(422)->assertJsonValidationErrors('postcode');
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['state' => 'Narnia']))
            ->assertStatus(422)->assertJsonValidationErrors('state');
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['whatsapp_number' => 'call me!']))
            ->assertStatus(422)->assertJsonValidationErrors('whatsapp_number');
        $this->actingAs($admin)->putJson('/api/operator/profile', $this->profile($tenant, ['payment_note' => str_repeat('x', 301)]))
            ->assertStatus(422)->assertJsonValidationErrors('payment_note');
    }

    public function test_parents_see_the_company_details_through_their_own_profile_call(): void
    {
        $tenant = $this->createTenant();
        $tenant->forceFill([
            'legal_name' => 'Alpha Express Sdn Bhd', 'whatsapp_number' => '0123456789',
            'payment_note' => 'Letak nama anak.', 'address_line1' => '12 Jalan Maju',
        ])->save();
        [$parent] = $this->createParent($tenant);

        $this->actingAs($parent)->getJson('/api/me')->assertOk()
            ->assertJsonPath('tenant.legal_name', 'Alpha Express Sdn Bhd')
            ->assertJsonPath('tenant.whatsapp_number', '0123456789')
            ->assertJsonPath('tenant.payment_note', 'Letak nama anak.');
    }

    public function test_the_registered_details_are_printed_on_the_receipt(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);
        $tenant->forceFill([
            'legal_name' => 'Alpha Express Sdn Bhd', 'ssm_number' => '12345-A',
            'address_line1' => '12 Jalan Maju', 'postcode' => '53100', 'city' => 'Kuala Lumpur',
        ])->save();

        $html = view('receipts.payment', $this->receiptData($tenant))->render();

        $this->assertStringContainsString('Alpha Express Sdn Bhd', $html);
        $this->assertStringContainsString('SSM: 12345-A', $html);
        $this->assertStringContainsString('12 Jalan Maju, 53100 Kuala Lumpur', $html);
    }

    public function test_the_receipt_is_unchanged_when_no_company_details_were_given(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);

        $html = view('receipts.payment', $this->receiptData($tenant))->render();

        $this->assertStringContainsString('Alpha Buses', $html);
        $this->assertStringNotContainsString('SSM:', $html);
    }

    private function receiptData(BusOperator $tenant): array
    {
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);
        $payment = $invoice->recordPayment([
            'method' => 'cash', 'payment_date' => '2026-10-14', 'amount_paid' => 150,
        ]);

        return app(ReceiptBuilder::class)->viewData($payment->fresh());
    }
}
