<?php

namespace Tests\Feature\Admin;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Notifications\BillsIssued;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class EmailTemplateTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private const LINES = [['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07']];

    private function billEmail(string $operator = 'Shahrul Transport'): string
    {
        return (string) (new BillsIssued($operator, 'Aminah', self::LINES))->toMail(new User)->render();
    }

    public function test_only_the_owner_can_see_or_change_templates(): void
    {
        foreach (['finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->getJson('/api/admin/notifications/templates')->assertForbidden();
            $this->actingAs($user)->postJson('/api/admin/notifications/templates/bill_issued/preview')->assertForbidden();
            $this->actingAs($user)->putJson('/api/admin/notifications/templates/bill_issued', ['blocks' => ['intro' => 'x']])->assertForbidden();
            $this->actingAs($user)->deleteJson('/api/admin/notifications/templates/bill_issued')->assertForbidden();
        }
    }

    public function test_every_parent_email_is_listed_and_the_code_emails_are_read_only(): void
    {
        $owner = $this->createPlatformUser('owner');

        $templates = collect($this->actingAs($owner)->getJson('/api/admin/notifications/templates')->assertOk()->json())->keyBy('template');

        $this->assertSame(
            ['bill_issued', 'payment_received', 'reminder_due_soon', 'reminder_overdue', 'application_approved', 'application_rejected', 'signup_code', 'password_reset_code'],
            $templates->keys()->all(),
        );
        $this->assertTrue($templates['bill_issued']['editable']);
        $this->assertFalse($templates['signup_code']['editable']);
        $this->assertFalse($templates['bill_issued']['customised']);
        // The reject email has no button, so it offers none to edit.
        $this->assertNotContains('button', collect($templates['application_rejected']['blocks'])->pluck('key')->all());
    }

    public function test_a_preview_draws_the_real_email_with_sample_data_and_shows_an_unsaved_edit(): void
    {
        $owner = $this->createPlatformUser('owner');

        $default = $this->actingAs($owner)->postJson('/api/admin/notifications/templates/bill_issued/preview')->assertOk();
        $this->assertStringContainsString('Bas Sekolah Maju', $default->json('subject'));
        $this->assertStringContainsString('<table', $default->json('html'));
        $this->assertStringContainsString('Aisyah', $default->json('html'));

        $draft = $this->actingAs($owner)->postJson('/api/admin/notifications/templates/bill_issued/preview', [
            'blocks' => ['intro' => 'Bil untuk anda daripada {operator}:'],
        ])->assertOk();
        $this->assertStringContainsString('Bil untuk anda daripada Bas Sekolah Maju:', $draft->json('html'));

        // Previewing never saves.
        $this->assertDatabaseCount('email_templates', 0);
    }

    public function test_the_code_emails_can_be_previewed(): void
    {
        $owner = $this->createPlatformUser('owner');

        foreach (['signup_code', 'password_reset_code'] as $template) {
            $this->actingAs($owner)->postJson("/api/admin/notifications/templates/{$template}/preview")
                ->assertOk()
                ->assertJsonPath('subject', fn ($subject) => str_contains($subject, 'Kod'));
        }
    }

    public function test_saved_wording_is_used_in_the_email_parents_get_and_the_rest_stays_as_built(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/bill_issued', [
            'blocks' => ['intro' => 'Bil baharu anda dari {operator}:', 'subject' => 'Bil bulan ini - {operator}'],
        ])->assertOk()->assertJsonPath('customised', true);

        $html = $this->billEmail();
        $this->assertStringContainsString('Bil baharu anda dari Shahrul Transport:', $html);
        $this->assertSame('Bil bulan ini - Shahrul Transport', (new BillsIssued('Shahrul Transport', 'Aminah', self::LINES))->subjectLine());
        // The button was not edited, so it keeps its original wording.
        $this->assertStringContainsString('Lihat dan bayar / View and pay', $html);
        $this->assertDatabaseHas('activity_logs', ['action' => 'email_template_updated']);
    }

    public function test_wording_that_matches_the_default_or_is_blank_is_not_stored(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/bill_issued', [
            'blocks' => ['intro' => '{operator} telah mengeluarkan bil baharu:', 'outro' => '   '],
        ])->assertOk()->assertJsonPath('customised', false);

        $this->assertDatabaseCount('email_templates', 0);
    }

    public function test_a_misspelt_placeholder_or_unknown_part_is_refused(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/bill_issued', ['blocks' => ['intro' => 'Hi {oprator}']])
            ->assertUnprocessable()->assertJsonValidationErrors('blocks.intro');
        // {total} exists for payment emails but not for bills.
        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/bill_issued', ['blocks' => ['intro' => 'Total {total}']])
            ->assertUnprocessable();
        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/bill_issued', ['blocks' => ['footer' => 'x']])
            ->assertUnprocessable();
        $this->assertDatabaseCount('email_templates', 0);
    }

    public function test_resetting_goes_back_to_the_built_in_wording(): void
    {
        $owner = $this->createPlatformUser('owner');
        EmailTemplate::create(['template' => 'bill_issued', 'blocks' => ['intro' => 'Custom {operator}']]);
        $this->assertStringContainsString('Custom Shahrul Transport', $this->billEmail());

        $this->actingAs($owner)->deleteJson('/api/admin/notifications/templates/bill_issued')->assertNoContent();

        $this->assertStringContainsString('telah mengeluarkan bil baharu', $this->billEmail());
    }

    public function test_code_emails_and_unknown_templates_cannot_be_edited(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/templates/signup_code', ['blocks' => ['intro' => 'x']])->assertNotFound();
        $this->actingAs($owner)->deleteJson('/api/admin/notifications/templates/nope')->assertNotFound();
        $this->actingAs($owner)->postJson('/api/admin/notifications/templates/nope/preview')->assertNotFound();
    }

    public function test_neither_a_name_nor_the_owners_wording_can_become_a_link(): void
    {
        EmailTemplate::create(['template' => 'bill_issued', 'blocks' => ['intro' => 'Pay [here](http://evil.example) for {operator}']]);

        $html = $this->billEmail('[Click](http://bad.example)');

        $this->assertStringNotContainsString('href="http://evil.example"', $html);
        $this->assertStringNotContainsString('href="http://bad.example"', $html);
    }
}
