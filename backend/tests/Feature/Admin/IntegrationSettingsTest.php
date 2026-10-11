<?php

namespace Tests\Feature\Admin;

use App\Mail\IntegrationTestMail;
use App\Models\ActivityLog;
use App\Models\IntegrationSetting;
use App\Support\Integrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class IntegrationSettingsTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function brevo(array $overrides = []): array
    {
        return [
            'smtp_login' => 'owner@school.test',
            'smtp_key' => 'xsmtpsib-super-secret',
            'from_email' => 'hello@school.test',
            'from_name' => 'SchoolBus',
            'enabled' => true,
            ...$overrides,
        ];
    }

    private function whatsapp(array $overrides = []): array
    {
        return [
            'access_token' => 'EAAG-super-secret-token',
            'phone_number_id' => '109876543210',
            'business_account_id' => '208765432109',
            'enabled' => true,
            ...$overrides,
        ];
    }

    public function test_only_the_owner_can_see_or_change_integrations(): void
    {
        foreach (['finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->getJson('/api/admin/settings')->assertForbidden();
            $this->actingAs($user)->putJson('/api/admin/settings/brevo', $this->brevo())->assertForbidden();
            $this->actingAs($user)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertForbidden();
            $this->actingAs($user)->postJson('/api/admin/settings/brevo/test', ['to' => 'a@b.test'])->assertForbidden();
            $this->actingAs($user)->deleteJson('/api/admin/settings/brevo')->assertForbidden();
        }

        $operator = $this->createOperatorAdmin($this->createTenant());
        $this->actingAs($operator)->getJson('/api/admin/settings')->assertForbidden();
    }

    public function test_nothing_is_configured_to_begin_with(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->getJson('/api/admin/settings')->assertOk()
            ->assertJsonPath('brevo.configured', false)
            ->assertJsonPath('brevo.has_smtp_key', false)
            ->assertJsonPath('whatsapp.configured', false)
            ->assertJsonPath('whatsapp.has_access_token', false);
    }

    public function test_saved_secrets_are_encrypted_at_rest_and_never_returned(): void
    {
        $owner = $this->createPlatformUser('owner');

        $brevo = $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo())->assertOk();
        $whatsapp = $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertOk();
        $show = $this->actingAs($owner)->getJson('/api/admin/settings')->assertOk();

        foreach ([$brevo, $whatsapp, $show] as $response) {
            $this->assertStringNotContainsString('xsmtpsib-super-secret', $response->getContent());
            $this->assertStringNotContainsString('EAAG-super-secret-token', $response->getContent());
        }
        $show->assertJsonPath('brevo.has_smtp_key', true)
            ->assertJsonPath('brevo.smtp_login', 'owner@school.test')
            ->assertJsonPath('whatsapp.has_access_token', true)
            ->assertJsonPath('whatsapp.phone_number_id', '109876543210');

        $raw = DB::table('integration_settings')->pluck('settings')->implode('|');
        $this->assertStringNotContainsString('xsmtpsib-super-secret', $raw);
        $this->assertStringNotContainsString('EAAG-super-secret-token', $raw);
        // ...but it round-trips through the model.
        $this->assertSame('xsmtpsib-super-secret', IntegrationSetting::find('brevo')->values()['smtp_key']);
    }

    public function test_a_blank_secret_keeps_the_stored_one_but_is_required_the_first_time(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo(['smtp_key' => '']))
            ->assertStatus(422)->assertJsonValidationErrors('smtp_key');

        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo())->assertOk();
        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo(['smtp_key' => '', 'from_name' => 'Renamed']))
            ->assertOk()->assertJsonPath('from_name', 'Renamed');

        $this->assertSame('xsmtpsib-super-secret', IntegrationSetting::find('brevo')->values()['smtp_key']);
    }

    public function test_validation(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo(['from_email' => 'not-an-email']))
            ->assertStatus(422)->assertJsonValidationErrors('from_email');
        // The phone number id ends up in a URL, so only digits are accepted.
        $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp(['phone_number_id' => '../me?x=1']))
            ->assertStatus(422)->assertJsonValidationErrors('phone_number_id');
    }

    public function test_changes_are_logged_without_secrets(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo())->assertOk();

        $entry = ActivityLog::firstWhere('action', 'integration_updated');
        $this->assertSame($owner->id, $entry->user_id);
        $this->assertSame(['provider' => 'brevo', 'enabled' => true], $entry->properties);
    }

    public function test_enabling_brevo_routes_all_email_through_it(): void
    {
        $this->assertNotSame('brevo', config('mail.default'));

        IntegrationSetting::create([
            'provider' => 'brevo', 'enabled' => true,
            'settings' => $this->brevo(['from_name' => 'School Bus Co']),
        ]);
        Integrations::applyMail();

        $this->assertSame('brevo', config('mail.default'));
        $this->assertSame('smtp-relay.brevo.com', config('mail.mailers.brevo.host'));
        $this->assertSame(587, config('mail.mailers.brevo.port'));
        $this->assertSame('owner@school.test', config('mail.mailers.brevo.username'));
        $this->assertSame('hello@school.test', config('mail.from.address'));
        $this->assertSame('School Bus Co', config('mail.from.name'));
    }

    public function test_a_disabled_or_incomplete_brevo_leaves_email_alone(): void
    {
        $before = config('mail.default');

        IntegrationSetting::create(['provider' => 'brevo', 'enabled' => false, 'settings' => $this->brevo()]);
        Integrations::applyMail();
        $this->assertSame($before, config('mail.default'));

        IntegrationSetting::find('brevo')->update(['enabled' => true, 'settings' => $this->brevo(['smtp_key' => ''])]);
        Integrations::applyMail();
        $this->assertSame($before, config('mail.default'));
    }

    public function test_the_test_email_goes_to_the_address_given(): void
    {
        Mail::fake();
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo())->assertOk();

        $this->actingAs($owner)->postJson('/api/admin/settings/brevo/test', ['to' => 'me@example.test'])
            ->assertOk()->assertJsonPath('ok', true);

        Mail::assertSent(IntegrationTestMail::class, fn ($mail) => $mail->hasTo('me@example.test')
            && $mail->from[0]['address'] === 'hello@school.test'
            && $mail->from[0]['name'] === 'SchoolBus');
    }

    public function test_testing_before_saving_is_refused(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->postJson('/api/admin/settings/brevo/test', ['to' => 'me@example.test'])->assertStatus(422);
        $this->actingAs($owner)->postJson('/api/admin/settings/whatsapp/test')->assertStatus(422);
    }

    public function test_whatsapp_connection_check_reports_the_verified_name(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['verified_name' => 'Demo Bus Co', 'display_phone_number' => '+60 12-345 6789']),
        ]);
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertOk();

        $this->actingAs($owner)->postJson('/api/admin/settings/whatsapp/test')->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('verified_name', 'Demo Bus Co')
            ->assertJsonPath('sent', false);

        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer EAAG-super-secret-token')
            && str_contains($request->url(), '/109876543210'));
    }

    public function test_whatsapp_sends_the_hello_world_template_to_a_normalised_number(): void
    {
        Http::fake([
            'graph.facebook.com/*/messages' => Http::response(['messages' => [['id' => 'wamid.1']]]),
            'graph.facebook.com/*' => Http::response(['verified_name' => 'Demo', 'display_phone_number' => '+60']),
        ]);
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertOk();

        $this->actingAs($owner)->postJson('/api/admin/settings/whatsapp/test', ['to' => '012-345 6789'])->assertOk()
            ->assertJsonPath('ok', true)->assertJsonPath('sent', true);

        Http::assertSent(fn ($request) => $request->method() === 'POST'
            && $request['to'] === '60123456789'
            && $request['template']['name'] === 'hello_world');
    }

    public function test_whatsapp_explains_a_rejected_token(): void
    {
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['code' => 190, 'message' => 'Invalid OAuth access token']], 400)]);
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertOk();

        $this->actingAs($owner)->postJson('/api/admin/settings/whatsapp/test')->assertOk()
            ->assertJsonPath('ok', false)->assertJsonPath('reason', 'unauthorized')->assertJsonPath('sent', false);
    }

    public function test_whatsapp_explains_when_the_recipient_is_not_allowed(): void
    {
        Http::fake([
            'graph.facebook.com/*/messages' => Http::response(['error' => ['code' => 131030, 'message' => 'Recipient phone number not in allowed list']], 400),
            'graph.facebook.com/*' => Http::response(['verified_name' => 'Demo', 'display_phone_number' => '+60']),
        ]);
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/whatsapp', $this->whatsapp())->assertOk();

        $this->actingAs($owner)->postJson('/api/admin/settings/whatsapp/test', ['to' => '0123456789'])->assertOk()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('reason', 'recipient_not_allowed')
            ->assertJsonPath('detail', 'Recipient phone number not in allowed list');
    }

    public function test_removing_a_provider_forgets_its_credentials(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->putJson('/api/admin/settings/brevo', $this->brevo())->assertOk();

        $this->actingAs($owner)->deleteJson('/api/admin/settings/brevo')->assertOk()
            ->assertJsonPath('brevo.configured', false);

        $this->assertDatabaseMissing('integration_settings', ['provider' => 'brevo']);
        $this->actingAs($owner)->deleteJson('/api/admin/settings/nonsense')->assertNotFound();
    }

    public function test_the_owner_permission_list_includes_settings(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->assertContains('settings.manage', $this->actingAs($owner)->getJson('/api/me')->json('permissions'));
    }
}
