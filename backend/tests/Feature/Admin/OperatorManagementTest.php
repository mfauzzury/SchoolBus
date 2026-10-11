<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\OperatorNote;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class OperatorManagementTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    // ---- list: search, filters, paging, options ----

    public function test_index_searches_name_code_email_and_phone_ignoring_case(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->createTenant(['company_name' => 'Alpha Express', 'operator_code' => '11111', 'email' => 'a@alpha.test', 'contact_phone' => '0111111111']);
        $this->createTenant(['company_name' => 'Beta Travel', 'operator_code' => '22222', 'email' => 'b@beta.test', 'contact_phone' => '0122222222']);

        foreach (['alpha', 'ALPHA EXP', '11111', 'a@alpha', '0111111'] as $term) {
            $names = collect($this->actingAs($owner)->getJson('/api/admin/operators?search='.urlencode($term))->json('data'))
                ->pluck('company_name')->all();
            $this->assertSame(['Alpha Express'], $names, "search for [{$term}]");
        }
    }

    public function test_index_treats_percent_in_search_as_plain_text(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->createTenant(['company_name' => 'Alpha Express']);

        $this->actingAs($owner)->getJson('/api/admin/operators?search=%25')
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_index_filters_by_status_and_billplz(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->createTenant(['company_name' => 'Active Co']);
        $suspended = $this->createTenant(['company_name' => 'Suspended Co']);
        $suspended->forceFill(['status' => 'suspended'])->save();
        $connected = $this->createTenant(['company_name' => 'Connected Co']);
        $connected->forceFill([
            'billplz_secret_key' => 'k', 'billplz_x_signature_key' => 'x', 'billplz_collection_id' => 'c',
        ])->save();

        $names = fn (string $query) => collect($this->actingAs($owner)->getJson("/api/admin/operators?{$query}")->json('data'))
            ->pluck('company_name')->sort()->values()->all();

        $this->assertSame(['Suspended Co'], $names('status=suspended'));
        $this->assertSame(['Active Co', 'Connected Co'], $names('status=active'));
        $this->assertSame(['Connected Co'], $names('billplz=connected'));
        $this->assertSame(['Active Co', 'Suspended Co'], $names('billplz=none'));
    }

    public function test_index_reports_the_owner_logins_last_login_not_a_parents(): void
    {
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['last_login_at' => '2026-10-01 08:00:00']);
        $this->createParent($tenant, ['last_login_at' => '2026-10-09 08:00:00']);

        $row = $this->actingAs($owner)->getJson('/api/admin/operators')->json('data.0');

        $this->assertStringStartsWith('2026-10-01', $row['last_login_at']);
    }

    public function test_index_is_paged_and_rejects_unknown_sort_columns(): void
    {
        $owner = $this->createPlatformUser('owner');
        foreach (range(1, 22) as $i) {
            $this->createTenant(['company_name' => sprintf('Company %02d', $i)]);
        }

        $this->actingAs($owner)->getJson('/api/admin/operators')
            ->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('last_page', 2);
        $this->actingAs($owner)->getJson('/api/admin/operators?page=2')
            ->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($owner)->getJson('/api/admin/operators?sort=billplz_secret_key')
            ->assertStatus(422);
    }

    public function test_options_returns_just_id_and_name_for_every_operator(): void
    {
        $owner = $this->createPlatformUser('support');
        $tenant = $this->createTenant(['company_name' => 'Alpha Express']);

        $this->actingAs($owner)->getJson('/api/admin/operators/options')
            ->assertOk()
            ->assertExactJson([['id' => $tenant->id, 'company_name' => 'Alpha Express']]);
    }

    // ---- edit ----

    public function test_support_edits_company_details_and_it_is_logged(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant(['company_name' => 'Old Name', 'email' => 'keep@op.test']);

        $this->actingAs($support)->putJson("/api/admin/operators/{$tenant->id}", [
            'company_name' => 'New Name',
            'contact_person' => 'Aminah',
            'contact_phone' => '0123456789',
            'email' => 'sneaky@op.test',
        ])->assertOk()->assertJsonPath('company_name', 'New Name');

        $tenant->refresh();
        $this->assertSame('New Name', $tenant->company_name);
        $this->assertSame('keep@op.test', $tenant->email, 'login email is not editable here');
        $this->assertTrue(ActivityLog::where('action', 'operator_updated')->where('tenant_id', $tenant->id)->exists());
    }

    public function test_finance_cannot_edit_or_see_notes_or_reset_passwords(): void
    {
        $finance = $this->createPlatformUser('finance');
        $tenant = $this->createTenant();

        $this->actingAs($finance)->putJson("/api/admin/operators/{$tenant->id}", [
            'company_name' => 'X', 'contact_person' => 'Y', 'contact_phone' => '1',
        ])->assertForbidden();
        $this->actingAs($finance)->getJson("/api/admin/operators/{$tenant->id}/notes")->assertForbidden();
        $this->actingAs($finance)->postJson("/api/admin/operators/{$tenant->id}/password-reset")->assertForbidden();
    }

    // ---- suspend / reactivate ----

    public function test_only_the_owner_can_suspend_and_reactivate(): void
    {
        $tenant = $this->createTenant();

        foreach (['finance', 'support'] as $level) {
            $this->actingAs($this->createPlatformUser($level))
                ->postJson("/api/admin/operators/{$tenant->id}/suspend", ['reason' => 'x'])
                ->assertForbidden();
        }
        $this->assertSame('active', $tenant->fresh()->status);

        $owner = $this->createPlatformUser('owner');
        $this->actingAs($owner)->postJson("/api/admin/operators/{$tenant->id}/suspend", ['reason' => 'Unpaid'])
            ->assertOk()->assertJsonPath('status', 'suspended')->assertJsonPath('suspended_reason', 'Unpaid');
        $this->assertTrue($tenant->fresh()->isSuspended());

        $this->actingAs($owner)->postJson("/api/admin/operators/{$tenant->id}/reactivate")
            ->assertOk()->assertJsonPath('status', 'active');
        $fresh = $tenant->fresh();
        $this->assertFalse($fresh->isSuspended());
        $this->assertNull($fresh->suspended_reason);
    }

    public function test_the_suspension_reason_is_never_shown_to_the_operator_or_parents(): void
    {
        $tenant = $this->createTenant();
        $tenant->forceFill(['status' => 'suspended', 'suspended_reason' => 'Internal: fraud check'])->save();
        $operator = $this->createOperatorAdmin($tenant);
        [$parent] = $this->createParent($tenant);

        foreach ([$operator, $parent] as $user) {
            $response = $this->actingAs($user)->getJson('/api/me');
            $response->assertOk()->assertJsonPath('tenant.status', 'suspended');
            $this->assertStringNotContainsString('Internal: fraud check', $response->getContent());
        }
    }

    public function test_a_suspended_operator_locks_out_its_staff_and_parents(): void
    {
        $tenant = $this->createTenant();
        $tenant->forceFill(['status' => 'suspended'])->save();
        $admin = $this->createOperatorAdmin($tenant);
        [$parent] = $this->createParent($tenant);

        $this->actingAs($admin)->getJson('/api/operator/buses')
            ->assertForbidden()->assertJsonPath('code', 'operator_suspended');
        $this->actingAs($parent)->getJson('/api/parent/students')
            ->assertForbidden()->assertJsonPath('code', 'operator_suspended');
    }

    public function test_another_operator_is_unaffected_by_a_suspension(): void
    {
        $suspended = $this->createTenant();
        $suspended->forceFill(['status' => 'suspended'])->save();
        $other = $this->createTenant();

        $this->actingAs($this->createOperatorAdmin($other))->getJson('/api/operator/buses')->assertOk();
    }

    public function test_suspended_operators_drivers_and_parents_cannot_log_in_to_the_apps(): void
    {
        $tenant = $this->createTenant(['operator_code' => '90020']);
        [, $staff] = $this->createDriver($tenant, ['password' => '1234']);
        [$parent] = $this->createParent($tenant, ['email' => 'p@op.test', 'password' => 'password1']);

        $this->postJson('/api/driver/login', [
            'operator_code' => '90020', 'phone' => $staff->phone, 'pin' => '1234',
        ])->assertCreated();
        $this->postJson('/api/parent/login', ['email' => 'p@op.test', 'password' => 'password1'])->assertCreated();

        $tenant->forceFill(['status' => 'suspended'])->save();

        $this->postJson('/api/driver/login', [
            'operator_code' => '90020', 'phone' => $staff->phone, 'pin' => '1234',
        ])->assertStatus(422);
        $this->postJson('/api/parent/login', ['email' => 'p@op.test', 'password' => 'password1'])->assertStatus(422);
    }

    public function test_a_suspended_operator_is_not_found_by_its_registration_code(): void
    {
        $tenant = $this->createTenant(['operator_code' => '90030']);
        $this->getJson('/api/register/90030')->assertOk();

        $tenant->forceFill(['status' => 'suspended'])->save();

        $this->getJson('/api/register/90030')->assertNotFound();
        $this->postJson('/api/register/90030', [])->assertNotFound();
    }

    // ---- password reset ----

    public function test_support_sends_the_operators_owner_a_password_reset(): void
    {
        Notification::fake();
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $owner = $this->createOperatorAdmin($tenant);

        $this->actingAs($support)->postJson("/api/admin/operators/{$tenant->id}/password-reset")
            ->assertOk()->assertJsonPath('email', $owner->email);

        Notification::assertSentTo($owner, ResetPassword::class);
    }

    public function test_password_reset_needs_an_owner_login(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();

        $this->actingAs($support)->postJson("/api/admin/operators/{$tenant->id}/password-reset")
            ->assertStatus(422);
    }

    // ---- notes ----

    public function test_notes_can_be_added_listed_and_removed_by_their_author(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $other = $this->createTenant();
        OperatorNote::create(['tenant_id' => $other->id, 'body' => 'about someone else']);

        $created = $this->actingAs($support)->postJson("/api/admin/operators/{$tenant->id}/notes", ['body' => 'Called, will pay Friday'])
            ->assertCreated()->assertJsonPath('user.name', $support->name);

        $this->actingAs($support)->getJson("/api/admin/operators/{$tenant->id}/notes")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.body', 'Called, will pay Friday');

        $this->actingAs($support)->deleteJson("/api/admin/operators/{$tenant->id}/notes/{$created->json('id')}")
            ->assertNoContent();
        $this->assertDatabaseCount('operator_notes', 1);
    }

    public function test_only_the_author_or_an_owner_can_remove_a_note(): void
    {
        $author = $this->createPlatformUser('support');
        $colleague = $this->createPlatformUser('support');
        $owner = $this->createPlatformUser('owner');
        $tenant = $this->createTenant();
        $note = OperatorNote::create(['tenant_id' => $tenant->id, 'user_id' => $author->id, 'body' => 'x']);

        $this->actingAs($colleague)->deleteJson("/api/admin/operators/{$tenant->id}/notes/{$note->id}")->assertForbidden();
        $this->actingAs($owner)->deleteJson("/api/admin/operators/{$tenant->id}/notes/{$note->id}")->assertNoContent();
    }

    public function test_a_note_cannot_be_removed_through_another_operators_url(): void
    {
        $owner = $this->createPlatformUser('owner');
        $a = $this->createTenant();
        $b = $this->createTenant();
        $note = OperatorNote::create(['tenant_id' => $a->id, 'user_id' => $owner->id, 'body' => 'x']);

        $this->actingAs($owner)->deleteJson("/api/admin/operators/{$b->id}/notes/{$note->id}")->assertNotFound();
        $this->assertDatabaseCount('operator_notes', 1);
    }

    // ---- log in as operator ----

    public function test_support_can_log_in_as_the_operators_owner(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $owner = $this->createOperatorAdmin($tenant);

        $this->fromFrontend()->actingAs($support)->postJson("/api/admin/operators/{$tenant->id}/impersonate")
            ->assertOk();

        $this->assertAuthenticatedAs($owner, 'web');
        $this->assertSame($support->id, session('impersonator_id'));
        $this->assertTrue(ActivityLog::where('action', 'impersonation_started')
            ->where('user_id', $support->id)->where('tenant_id', $tenant->id)->exists());
    }

    public function test_finance_cannot_log_in_as_an_operator(): void
    {
        $finance = $this->createPlatformUser('finance');
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant);

        $this->fromFrontend()->actingAs($finance)->postJson("/api/admin/operators/{$tenant->id}/impersonate")
            ->assertForbidden();
    }

    public function test_an_operator_without_an_owner_login_cannot_be_impersonated(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();

        $this->fromFrontend()->actingAs($support)->postJson("/api/admin/operators/{$tenant->id}/impersonate")
            ->assertStatus(422);
    }

    public function test_me_says_who_is_viewing_while_impersonating(): void
    {
        $support = $this->createPlatformUser('support', ['name' => 'Sam Support']);
        $tenant = $this->createTenant();
        $owner = $this->createOperatorAdmin($tenant);

        $this->fromFrontend()->actingAs($owner)->getJson('/api/me')
            ->assertOk()->assertJsonPath('impersonating', null);

        $this->withSession(['impersonator_id' => $support->id])->fromFrontend()->actingAs($owner)->getJson('/api/me')
            ->assertOk()->assertJsonPath('impersonating.admin_name', 'Sam Support');
    }

    public function test_an_impersonating_member_can_still_work_in_a_suspended_operator(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $tenant->forceFill(['status' => 'suspended'])->save();
        $owner = $this->createOperatorAdmin($tenant);

        $this->withSession(['impersonator_id' => $support->id])->fromFrontend()->actingAs($owner)
            ->getJson('/api/operator/buses')->assertOk();
    }

    public function test_stopping_returns_to_the_platform_member(): void
    {
        $support = $this->createPlatformUser('support');
        $tenant = $this->createTenant();
        $owner = $this->createOperatorAdmin($tenant);

        $this->withSession(['impersonator_id' => $support->id])->fromFrontend()->actingAs($owner)
            ->postJson('/api/impersonation/stop')
            ->assertOk()->assertJsonPath('operator_id', $tenant->id);

        $this->assertAuthenticatedAs($support, 'web');
        $this->assertNull(session('impersonator_id'));
        $this->assertTrue(ActivityLog::where('action', 'impersonation_stopped')->where('user_id', $support->id)->exists());
    }

    public function test_stop_is_refused_when_not_impersonating(): void
    {
        $tenant = $this->createTenant();
        $owner = $this->createOperatorAdmin($tenant);

        $this->fromFrontend()->actingAs($owner)->postJson('/api/impersonation/stop')->assertForbidden();
    }
}
