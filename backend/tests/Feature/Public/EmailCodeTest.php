<?php

namespace Tests\Feature\Public;

use App\Mail\EmailOtpMail;
use App\Models\User;
use App\Support\EmailOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class EmailCodeTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    /** The code that was emailed to this address. */
    private function sentCode(string $email): string
    {
        $code = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use ($email, &$code) {
            if ($mail->hasTo($email)) {
                $code = $mail->code;
            }

            return $mail->hasTo($email);
        });

        return $code;
    }

    private function wrongCodeFor(string $real): string
    {
        return $real === '000000' ? '111111' : '000000';
    }

    // ---- parent sign-up ----

    private function sendForParent(string $email, string $operator = '10000')
    {
        return $this->fromFrontend()->postJson("/api/register/{$operator}/email-code", ['email' => $email]);
    }

    private function verifyForParent(string $email, string $code, string $operator = '10000')
    {
        return $this->fromFrontend()->postJson("/api/register/{$operator}/email-code/verify", [
            'email' => $email,
            'code' => $code,
        ]);
    }

    public function test_a_parent_gets_a_code_and_the_right_digits_prove_the_email(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000', 'company_name' => 'Demo Bus Co']);

        $this->sendForParent('parent@test.com')->assertOk()->assertJsonPath('resend_after', 60);

        $code = $this->sentCode('parent@test.com');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $token = $this->verifyForParent('parent@test.com', $code)
            ->assertOk()
            ->assertJsonPath('verified', true)
            ->json('token');

        // The proof is the token, not the fact that the email was verified.
        $otp = app(EmailOtp::class);
        $this->assertTrue($otp->isVerified(EmailOtp::REGISTRATION, 'parent@test.com', $token));
        $this->assertFalse($otp->isVerified(EmailOtp::REGISTRATION, 'parent@test.com', null));
        $this->assertFalse($otp->isVerified(EmailOtp::REGISTRATION, 'parent@test.com', 'a-guess'));
        $this->assertFalse($otp->isVerified(EmailOtp::PASSWORD_RESET, 'parent@test.com', $token));
    }

    public function test_the_email_is_not_case_sensitive(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);

        $this->sendForParent('Parent@Test.com')->assertOk();
        $code = $this->sentCode('Parent@Test.com');

        $this->verifyForParent('parent@test.com', $code)->assertOk();
    }

    public function test_the_mail_carries_the_code_and_names_what_it_is_for(): void
    {
        config(['app.name' => 'BasSekolah.my']);

        $registering = (new EmailOtpMail('123456', EmailOtp::REGISTRATION, "Demo\nBus Co"))->render();
        $this->assertStringContainsString('123456', $registering);
        $this->assertStringContainsString('register with Demo Bus Co', $registering);

        $company = (new EmailOtpMail('123456', EmailOtp::REGISTRATION))->render();
        $this->assertStringContainsString('register your company on BasSekolah.my', $company);

        $reset = (new EmailOtpMail('654321', EmailOtp::PASSWORD_RESET))->render();
        $this->assertStringContainsString('654321', $reset);
        $this->assertStringContainsString('reset your BasSekolah.my password', $reset);
        $this->assertStringNotContainsString('SchoolBus', $reset);
    }

    public function test_a_company_name_cannot_smuggle_a_link_or_markup_into_the_code_email(): void
    {
        $html = (new EmailOtpMail('123456', EmailOtp::REGISTRATION, '[Pay here](http://bad.example) <b>Bus</b>'))->render();

        $this->assertStringNotContainsString('href="http://bad.example"', $html);
        $this->assertStringNotContainsString('<b>Bus</b>', $html);
        $this->assertStringContainsString('Pay here', $html);
    }

    public function test_the_code_email_is_a_branded_html_message_with_a_plain_text_copy(): void
    {
        config(['app.name' => 'BasSekolah.my']);
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();

        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) {
            $mail->assertHasSubject('Kod pengesahan / Verification code - BasSekolah.my');
            $mail->assertSeeInHtml('code-digits', false);
            $mail->assertSeeInHtml($mail->code);
            $mail->assertSeeInText($mail->code);
            $mail->assertSeeInHtml('BasSekolah.my');

            return true;
        });
    }

    public function test_a_wrong_code_is_refused(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();
        $real = $this->sentCode('parent@test.com');

        $this->verifyForParent('parent@test.com', $this->wrongCodeFor($real))
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', EmailOtp::INVALID)
            ->assertJsonMissingPath('token');
    }

    public function test_guessing_is_cut_off_after_five_wrong_tries_even_with_the_right_code(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();
        $real = $this->sentCode('parent@test.com');
        $wrong = $this->wrongCodeFor($real);

        for ($i = 1; $i < EmailOtp::MAX_ATTEMPTS; $i++) {
            $this->verifyForParent('parent@test.com', $wrong)
                ->assertStatus(422)
                ->assertJsonPath('errors.code.0', EmailOtp::INVALID);
        }

        // The last allowed try burns the code...
        $this->verifyForParent('parent@test.com', $wrong)
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', EmailOtp::TOO_MANY_ATTEMPTS);

        // ...so even the right digits are refused; a new code has to be asked for.
        $this->verifyForParent('parent@test.com', $real)
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', EmailOtp::EXPIRED)
            ->assertJsonMissingPath('token');
    }

    public function test_the_right_code_still_works_on_the_last_allowed_try(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();
        $real = $this->sentCode('parent@test.com');

        for ($i = 1; $i < EmailOtp::MAX_ATTEMPTS; $i++) {
            $this->verifyForParent('parent@test.com', $this->wrongCodeFor($real))->assertStatus(422);
        }

        $this->verifyForParent('parent@test.com', $real)->assertOk();
    }

    public function test_an_email_with_too_many_wrong_guesses_is_locked_however_many_codes_are_asked_for(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $otp = app(EmailOtp::class);
        $codesNeeded = intdiv(EmailOtp::MAX_WRONG_PER_DAY, EmailOtp::MAX_ATTEMPTS);

        for ($round = 0; $round < $codesNeeded; $round++) {
            $this->travel(EmailOtp::RESEND_SECONDS + 1)->seconds();
            $real = $otp->issue(EmailOtp::REGISTRATION, 'parent@test.com');
            $this->assertNotNull($real);

            for ($i = 0; $i < EmailOtp::MAX_ATTEMPTS; $i++) {
                $this->verifyForParent('parent@test.com', $this->wrongCodeFor($real))->assertStatus(422);
            }
        }

        // No fresh code, and no more tries, until the day is over.
        $this->travel(EmailOtp::RESEND_SECONDS + 1)->seconds();
        $this->sendForParent('parent@test.com')
            ->assertStatus(429)
            ->assertJsonPath('locked', true)
            ->assertJsonPath('pending', false);
        $this->verifyForParent('parent@test.com', '123456')
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', EmailOtp::LOCKED);
        Mail::assertNothingSent();

        // Someone else's email is not affected.
        $this->sendForParent('other@test.com')->assertOk();

        $this->travel(25)->hours();
        $this->sendForParent('parent@test.com')->assertOk();
    }

    public function test_an_email_can_only_be_sent_so_many_codes_an_hour(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);

        for ($i = 0; $i < EmailOtp::MAX_CODES_PER_HOUR; $i++) {
            $this->sendForParent('parent@test.com')->assertOk();
            $this->travel(EmailOtp::RESEND_SECONDS + 1)->seconds();
        }

        $refused = $this->sendForParent('parent@test.com')->assertStatus(429);
        $this->assertGreaterThan(EmailOtp::RESEND_SECONDS, $refused->json('retry_after'));
        Mail::assertSentCount(EmailOtp::MAX_CODES_PER_HOUR);

        $this->travel(61)->minutes();
        $this->sendForParent('parent@test.com')->assertOk();
    }

    public function test_a_code_expires(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();
        $code = $this->sentCode('parent@test.com');

        $this->travel(EmailOtp::CODE_MINUTES + 1)->minutes();

        $this->verifyForParent('parent@test.com', $code)
            ->assertStatus(422)
            ->assertJsonPath('errors.code.0', EmailOtp::EXPIRED);
    }

    public function test_a_code_only_works_once(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);
        $this->sendForParent('parent@test.com')->assertOk();
        $code = $this->sentCode('parent@test.com');

        $this->verifyForParent('parent@test.com', $code)->assertOk();
        $this->verifyForParent('parent@test.com', $code)->assertStatus(422);
    }

    public function test_a_new_code_cannot_be_asked_for_straight_away(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);

        $this->sendForParent('parent@test.com')->assertOk();
        // "pending" tells the page a code really is on its way.
        $this->sendForParent('parent@test.com')
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after'])
            ->assertJsonPath('pending', true)
            ->assertJsonPath('locked', false);

        Mail::assertSentCount(1);

        $this->travel(EmailOtp::RESEND_SECONDS + 1)->seconds();
        $this->sendForParent('parent@test.com')->assertOk();
        Mail::assertSentCount(2);
    }

    public function test_a_resent_code_replaces_the_old_one(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);

        $this->sendForParent('parent@test.com')->assertOk();
        $first = $this->sentCode('parent@test.com');

        $this->travel(EmailOtp::RESEND_SECONDS + 1)->seconds();
        Mail::fake();
        $this->sendForParent('parent@test.com')->assertOk();
        $second = $this->sentCode('parent@test.com');

        if ($first !== $second) {
            $this->verifyForParent('parent@test.com', $first)->assertStatus(422);
        }
        $this->verifyForParent('parent@test.com', $second)->assertOk();
    }

    public function test_an_email_that_already_has_an_account_gets_no_sign_up_code(): void
    {
        Mail::fake();
        $tenant = $this->createTenant(['operator_code' => '10000']);
        $this->createOperatorAdmin($tenant, ['email' => 'taken@test.com']);

        // A word the page can tell apart from "that is not an email address".
        $this->sendForParent('taken@test.com')->assertStatus(422)->assertJsonPath('errors.email.0', 'taken');

        Mail::assertNothingSent();
    }

    public function test_the_email_must_be_valid(): void
    {
        Mail::fake();
        $this->createTenant(['operator_code' => '10000']);

        $response = $this->sendForParent('not-an-email')->assertStatus(422)->assertJsonValidationErrors(['email']);
        $this->assertNotSame('taken', $response->json('errors.email.0'));
        Mail::assertNothingSent();
    }

    public function test_the_code_must_be_six_digits(): void
    {
        $this->createTenant(['operator_code' => '10000']);

        $this->verifyForParent('parent@test.com', '12ab')->assertStatus(422)->assertJsonValidationErrors(['code']);
    }

    public function test_a_failed_send_reports_it_and_lets_the_parent_try_again_at_once(): void
    {
        $this->createTenant(['operator_code' => '10000']);
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('smtp down'));

        $this->sendForParent('parent@test.com')->assertStatus(502);

        // No cooldown was left behind.
        $this->assertSame(0, app(EmailOtp::class)->secondsUntilResend(EmailOtp::REGISTRATION, 'parent@test.com'));
    }

    public function test_an_unknown_or_suspended_operator_is_not_found(): void
    {
        Mail::fake();
        $this->sendForParent('parent@test.com', '99999')->assertNotFound();
        $this->verifyForParent('parent@test.com', '123456', '99999')->assertNotFound();

        $this->createTenant(['operator_code' => '10001', 'status' => 'suspended']);
        $this->sendForParent('parent@test.com', '10001')->assertNotFound();
        Mail::assertNothingSent();
    }

    // ---- operator sign-up ----

    public function test_an_operator_can_prove_their_email_before_signing_up(): void
    {
        Mail::fake();
        $this->ensureRole('operator_admin');

        $this->fromFrontend()->postJson('/api/register-operator/email-code', ['email' => 'jane@newbusco.test'])
            ->assertOk();
        $code = $this->sentCode('jane@newbusco.test');

        $token = $this->fromFrontend()->postJson('/api/register-operator/email-code/verify', [
            'email' => 'jane@newbusco.test', 'code' => $code,
        ])->assertOk()->json('token');

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'New Bus Co', 'contact_person' => 'Jane', 'contact_phone' => '0123456789',
            'email' => 'jane@newbusco.test', 'password' => 'password123', 'email_token' => $token,
        ])->assertCreated();
    }

    public function test_an_operator_email_already_used_by_a_company_gets_no_code(): void
    {
        Mail::fake();
        $this->createTenant(['email' => 'taken@test.com']);

        $this->fromFrontend()->postJson('/api/register-operator/email-code', ['email' => 'taken@test.com'])
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'taken');

        Mail::assertNothingSent();
    }

    // ---- forgot password ----

    private function resetPayload(string $email, ?string $token, string $password = 'newpass123'): array
    {
        return ['email' => $email, 'password' => $password, 'email_token' => $token];
    }

    public function test_a_forgotten_password_is_reset_with_the_emailed_code(): void
    {
        Mail::fake();
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);

        $this->fromFrontend()->postJson('/api/forgot-password', ['email' => 'owner@test.com'])->assertOk();
        $code = $this->sentCode('owner@test.com');

        $token = $this->fromFrontend()
            ->postJson('/api/forgot-password/verify', ['email' => 'owner@test.com', 'code' => $code])
            ->assertOk()
            ->json('token');
        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token))
            ->assertOk();

        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
    }

    public function test_knowing_the_email_is_not_enough_to_finish_someone_elses_reset(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);

        // The owner typed the right code in their own browser and is choosing a password...
        $this->verifyEmail('owner@test.com', EmailOtp::PASSWORD_RESET);

        // ...a stranger who only knows the address cannot slip in a password of their own.
        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', null, 'attacker123'))
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'unverified');
        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', 'a-guess', 'attacker123'))
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'unverified');

        $this->assertTrue(Hash::check('oldpass123', $user->fresh()->password));
    }

    public function test_the_reset_cannot_be_done_without_proving_the_email(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);

        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', null))
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'unverified');

        $this->assertTrue(Hash::check('oldpass123', $user->fresh()->password));
    }

    public function test_a_sign_up_proof_cannot_be_used_to_reset_a_password(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);
        $token = $this->verifyEmail('owner@test.com', EmailOtp::REGISTRATION);

        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token))
            ->assertStatus(422);

        $this->assertTrue(Hash::check('oldpass123', $user->fresh()->password));
    }

    public function test_the_proof_is_used_up_by_the_reset(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);
        $token = $this->verifyEmail('owner@test.com', EmailOtp::PASSWORD_RESET);

        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token))
            ->assertOk();
        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token, 'another123'))
            ->assertStatus(422);
    }

    public function test_the_new_password_must_be_strong_enough(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com']);
        $token = $this->verifyEmail('owner@test.com', EmailOtp::PASSWORD_RESET);

        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token, 'short'))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_forgot_password_answers_the_same_for_an_email_nobody_has(): void
    {
        Mail::fake();
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com']);

        $known = $this->fromFrontend()->postJson('/api/forgot-password', ['email' => 'owner@test.com']);
        $unknown = $this->fromFrontend()->postJson('/api/forgot-password', ['email' => 'nobody@test.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());

        // (Not a count: the test app re-runs after-response work on every request.)
        $this->sentCode('owner@test.com');
        Mail::assertNotSent(EmailOtpMail::class, fn (EmailOtpMail $mail) => $mail->hasTo('nobody@test.com'));
    }

    public function test_an_email_nobody_has_cannot_be_verified(): void
    {
        $this->fromFrontend()->postJson('/api/forgot-password', ['email' => 'nobody@test.com'])->assertOk();

        $this->fromFrontend()->postJson('/api/forgot-password/verify', ['email' => 'nobody@test.com', 'code' => '123456'])
            ->assertStatus(422);

        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('nobody@test.com', null))
            ->assertStatus(422);
        $this->assertNull(User::firstWhere('email', 'nobody@test.com'));
    }

    public function test_checking_codes_does_not_use_up_the_allowance_for_changing_the_password(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'owner@test.com', 'password' => 'oldpass123']);

        // Plenty of code checks from this network (other people mistyping theirs)...
        for ($i = 0; $i < 25; $i++) {
            $this->fromFrontend()
                ->postJson('/api/forgot-password/verify', ['email' => "someone{$i}@test.com", 'code' => '123456'])
                ->assertStatus(422);
        }

        // ...must not get in the way of the last step.
        $token = $this->verifyEmail('owner@test.com', EmailOtp::PASSWORD_RESET);
        $this->fromFrontend()->postJson('/api/forgot-password/reset', $this->resetPayload('owner@test.com', $token))
            ->assertOk();
        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
    }

    public function test_invitation_links_still_set_a_password_with_a_token(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createOperatorAdmin($tenant, ['email' => 'invited@test.com']);
        $token = Password::createToken($user);

        $this->fromFrontend()->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'invited@test.com',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ])->assertOk();

        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
    }
}
