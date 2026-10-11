<?php

namespace Tests\Feature\Admin;

use App\Models\PaymentAttempt;
use App\Models\SystemStatus;
use App\Services\BillplzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class SystemControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_before_anything_has_run_billing_is_reported_as_stale_with_no_time(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->getJson('/api/admin/system')->assertOk()
            ->assertJsonPath('billing.ran_at', null)
            ->assertJsonPath('billing.ok', null)
            ->assertJsonPath('billing.stale', true)
            ->assertJsonPath('failed_jobs.count', 0)
            ->assertJsonPath('billplz_webhook.received_at', null);
    }

    public function test_running_the_billing_command_records_when_and_how_it_went(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $this->createBillableStudent($tenant);
        $this->createBillableStudent($tenant);

        $this->artisan('invoices:generate-recurring')->assertSuccessful();

        $this->actingAs($owner)->getJson('/api/admin/system')->assertOk()
            ->assertJsonPath('billing.ok', true)
            ->assertJsonPath('billing.generated', 2)
            ->assertJsonPath('billing.skipped', 0)
            ->assertJsonPath('billing.stale', false);
    }

    public function test_a_billing_run_that_is_over_a_day_and_a_half_old_is_stale(): void
    {
        $owner = $this->createPlatformUser('owner');
        SystemStatus::record('invoices_generate_recurring', ['ok' => true, 'generated' => 1, 'skipped' => 0]);
        $this->travel(37)->hours();

        $this->actingAs($owner)->getJson('/api/admin/system')->assertJsonPath('billing.stale', true);
    }

    public function test_a_failed_billing_run_is_recorded_as_failed(): void
    {
        SystemStatus::record('invoices_generate_recurring', ['ok' => false, 'message' => 'RuntimeException: boom']);

        $this->actingAs($this->createPlatformUser('owner'))->getJson('/api/admin/system')
            ->assertJsonPath('billing.ok', false)
            ->assertJsonPath('billing.message', 'RuntimeException: boom');
    }

    public function test_failed_queue_jobs_are_counted_by_job_name(): void
    {
        DB::table('failed_jobs')->insert([
            'uuid' => 'a', 'connection' => 'database', 'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\SendReceipt']),
            'exception' => 'secret stack trace', 'failed_at' => now(),
        ]);

        $response = $this->actingAs($this->createPlatformUser('owner'))->getJson('/api/admin/system')->assertOk();

        $response->assertJsonPath('failed_jobs.count', 1)
            ->assertJsonPath('failed_jobs.latest.0.name', 'App\\Jobs\\SendReceipt');
        $this->assertStringNotContainsString('secret stack trace', $response->getContent());
    }

    public function test_a_signed_billplz_callback_updates_the_last_webhook_time(): void
    {
        $tenant = $this->createTenant();
        $tenant->forceFill([
            'billplz_secret_key' => 's', 'billplz_x_signature_key' => 'k', 'billplz_collection_id' => 'c',
        ])->save();
        [$parent] = $this->createParent($tenant);
        $attempt = PaymentAttempt::create([
            'tenant_id' => $tenant->id, 'user_id' => $parent->id, 'billplz_bill_id' => 'bill_1', 'amount' => 10,
        ]);

        $params = ['id' => 'bill_1', 'paid' => 'false', 'state' => 'due', 'amount' => '1000'];
        $this->postJson('/api/webhooks/billplz', [...$params, 'x_signature' => BillplzService::sign($params, 'k')])
            ->assertOk();

        $this->assertNotNull(SystemStatus::read('billplz_webhook'));
        $this->actingAs($this->createPlatformUser('owner'))->getJson('/api/admin/system')
            ->assertJsonPath('billplz_webhook.received_at', fn ($value) => $value !== null);
        $this->assertNotNull($attempt->fresh());
    }

    public function test_an_unsigned_callback_does_not_count_as_billplz_reaching_us(): void
    {
        $tenant = $this->createTenant();
        $tenant->forceFill([
            'billplz_secret_key' => 's', 'billplz_x_signature_key' => 'k', 'billplz_collection_id' => 'c',
        ])->save();
        [$parent] = $this->createParent($tenant);
        PaymentAttempt::create(['tenant_id' => $tenant->id, 'user_id' => $parent->id, 'billplz_bill_id' => 'bill_2', 'amount' => 10]);

        $this->postJson('/api/webhooks/billplz', ['id' => 'bill_2', 'paid' => 'true', 'x_signature' => 'forged'])
            ->assertForbidden();

        $this->assertNull(SystemStatus::read('billplz_webhook'));
    }

    public function test_only_live_connected_sandbox_operators_are_listed(): void
    {
        $owner = $this->createPlatformUser('owner');
        $sandbox = $this->createTenant(['company_name' => 'Sandbox Co']);
        $sandbox->forceFill([
            'billplz_secret_key' => 's', 'billplz_x_signature_key' => 'k', 'billplz_collection_id' => 'c', 'billplz_sandbox' => true,
        ])->save();
        $live = $this->createTenant(['company_name' => 'Live Co']);
        $live->forceFill([
            'billplz_secret_key' => 's', 'billplz_x_signature_key' => 'k', 'billplz_collection_id' => 'c', 'billplz_sandbox' => false,
        ])->save();
        // Disabled keys leave the sandbox flag cleared, but make sure a half-set one isn't counted either.
        $this->createTenant(['company_name' => 'No Keys Co'])->forceFill(['billplz_sandbox' => true])->save();

        $response = $this->actingAs($owner)->getJson('/api/admin/system')->assertOk();

        $response->assertJsonPath('sandbox_operators.count', 1)
            ->assertJsonPath('sandbox_operators.items.0.company_name', 'Sandbox Co');
    }

    public function test_environment_facts_never_include_secrets(): void
    {
        $owner = $this->createPlatformUser('owner');

        $response = $this->actingAs($owner)->getJson('/api/admin/system')->assertOk();

        $this->assertEqualsCanonicalizing(['app_env', 'debug', 'mailer', 'queue'], array_keys($response->json('environment')));
        $this->assertStringNotContainsString(config('app.key'), $response->getContent());
    }

    public function test_only_the_owner_can_see_the_system_page(): void
    {
        foreach (['finance', 'support'] as $level) {
            $this->actingAs($this->createPlatformUser($level))->getJson('/api/admin/system')->assertForbidden();
        }

        $tenant = $this->createTenant();
        $this->actingAs($this->createOperatorAdmin($tenant))->getJson('/api/admin/system')->assertForbidden();
    }
}
