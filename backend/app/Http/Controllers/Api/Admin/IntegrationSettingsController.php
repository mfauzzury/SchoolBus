<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\IntegrationTestMail;
use App\Models\IntegrationSetting;
use App\Services\WhatsAppService;
use App\Support\ActivityLog;
use App\Support\Integrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Owner-only. Secrets go in and are encrypted; nothing here ever sends one
 * back to the browser — only whether it is stored.
 */
class IntegrationSettingsController extends Controller
{
    public function show()
    {
        return [
            'brevo' => $this->brevoSummary(IntegrationSetting::find(IntegrationSetting::BREVO)),
            'whatsapp' => $this->whatsappSummary(IntegrationSetting::find(IntegrationSetting::WHATSAPP)),
        ];
    }

    // ---- Brevo (email) ----

    public function updateBrevo(Request $request)
    {
        $row = IntegrationSetting::find(IntegrationSetting::BREVO);
        $current = $row?->values() ?? [];

        $data = $request->validate([
            'smtp_login' => 'required|string|max:255',
            // Required the first time; afterwards blank keeps the stored key.
            'smtp_key' => [Rule::requiredIf(blank($current['smtp_key'] ?? null)), 'nullable', 'string', 'max:255'],
            'from_email' => 'required|email|max:255',
            'from_name' => 'nullable|string|max:100',
            'enabled' => 'required|boolean',
        ]);

        $row = $this->save(IntegrationSetting::BREVO, $data['enabled'], [
            'smtp_login' => trim($data['smtp_login']),
            'smtp_key' => filled($data['smtp_key'] ?? null) ? $data['smtp_key'] : $current['smtp_key'],
            'from_email' => $data['from_email'],
            'from_name' => $data['from_name'] ?? null,
        ], $request);

        ActivityLog::record('integration_updated', properties: ['provider' => 'brevo', 'enabled' => $row->enabled]);

        // Take effect straight away for this request's own emails too.
        Integrations::applyMail();

        return $this->brevoSummary($row);
    }

    /** Sends a real email through the *saved* settings, so a bad key shows up here and not on a parent's reset. */
    public function testBrevo(Request $request)
    {
        $data = $request->validate(['to' => 'required|email|max:255']);

        $row = IntegrationSetting::find(IntegrationSetting::BREVO);
        abort_unless($row, 422, 'Save the Brevo settings first.');
        $settings = $row->values();

        config(['mail.mailers.brevo-test' => Integrations::brevoMailer($settings)]);

        try {
            Mail::mailer('brevo-test')
                ->to($data['to'])
                ->send((new IntegrationTestMail)->from($settings['from_email'], $settings['from_name'] ?? null));
        } catch (Throwable $e) {
            return $this->failed($e);
        } finally {
            Mail::purge('brevo-test');
        }

        ActivityLog::record('integration_tested', properties: ['provider' => 'brevo']);

        return ['ok' => true, 'reason' => 'ok'];
    }

    // ---- WhatsApp Business ----

    public function updateWhatsApp(Request $request)
    {
        $row = IntegrationSetting::find(IntegrationSetting::WHATSAPP);
        $current = $row?->values() ?? [];

        $data = $request->validate([
            'access_token' => [Rule::requiredIf(blank($current['access_token'] ?? null)), 'nullable', 'string', 'max:1000'],
            // Digits only: this is placed into the Graph API URL.
            'phone_number_id' => ['required', 'string', 'regex:/^\d{5,25}$/'],
            'business_account_id' => ['nullable', 'string', 'regex:/^\d{5,25}$/'],
            'enabled' => 'required|boolean',
        ]);

        $row = $this->save(IntegrationSetting::WHATSAPP, $data['enabled'], [
            'access_token' => filled($data['access_token'] ?? null) ? $data['access_token'] : $current['access_token'],
            'phone_number_id' => $data['phone_number_id'],
            'business_account_id' => $data['business_account_id'] ?? null,
        ], $request);

        ActivityLog::record('integration_updated', properties: ['provider' => 'whatsapp', 'enabled' => $row->enabled]);

        return $this->whatsappSummary($row);
    }

    /** Checks the saved token and number; with `to`, also sends Meta's hello_world template there. */
    public function testWhatsApp(Request $request, WhatsAppService $whatsapp)
    {
        $data = $request->validate(['to' => 'nullable|string|max:30']);

        $row = IntegrationSetting::find(IntegrationSetting::WHATSAPP);
        abort_unless($row, 422, 'Save the WhatsApp settings first.');
        $settings = $row->values();

        $connection = $whatsapp->checkConnection($settings);
        $result = [...$connection, 'sent' => false, 'detail' => null];

        if ($connection['ok'] && filled($data['to'] ?? null)) {
            $sent = $whatsapp->sendTestTemplate($settings, $data['to']);
            $result['sent'] = $sent['ok'];
            $result['detail'] = $sent['detail'];
            if (! $sent['ok']) {
                $result['ok'] = false;
                $result['reason'] = $sent['reason'];
            }
        }

        ActivityLog::record('integration_tested', properties: ['provider' => 'whatsapp']);

        return $result;
    }

    // ---- shared ----

    /** Forget a provider's credentials entirely. */
    public function destroy(string $provider)
    {
        abort_unless(in_array($provider, [IntegrationSetting::BREVO, IntegrationSetting::WHATSAPP], true), 404);

        IntegrationSetting::whereKey($provider)->delete();

        ActivityLog::record('integration_removed', properties: ['provider' => $provider]);

        return $this->show();
    }

    private function save(string $provider, bool $enabled, array $settings, Request $request): IntegrationSetting
    {
        return tap(IntegrationSetting::firstOrNew(['provider' => $provider]), function (IntegrationSetting $row) use ($enabled, $settings, $request) {
            $row->enabled = $enabled;
            $row->settings = $settings;
            $row->updated_by = $request->user()->id;
            $row->save();
        });
    }

    /** A failed send is an expected outcome (wrong key, no network): answer 200 with a reason the UI can explain. */
    private function failed(Throwable $e): array
    {
        $message = strtolower($e->getMessage());

        $reason = match (true) {
            str_contains($message, 'authenticat'), str_contains($message, '535') => 'auth',
            str_contains($message, 'connection'), str_contains($message, 'timed out'), str_contains($message, 'could not be established') => 'unreachable',
            default => 'error',
        };

        return ['ok' => false, 'reason' => $reason];
    }

    private function brevoSummary(?IntegrationSetting $row): array
    {
        $values = $row?->values() ?? [];

        return [
            'configured' => $row !== null,
            'enabled' => (bool) $row?->enabled,
            'smtp_login' => $values['smtp_login'] ?? null,
            'has_smtp_key' => filled($values['smtp_key'] ?? null),
            'from_email' => $values['from_email'] ?? null,
            'from_name' => $values['from_name'] ?? null,
        ];
    }

    private function whatsappSummary(?IntegrationSetting $row): array
    {
        $values = $row?->values() ?? [];

        return [
            'configured' => $row !== null,
            'enabled' => (bool) $row?->enabled,
            'has_access_token' => filled($values['access_token'] ?? null),
            'phone_number_id' => $values['phone_number_id'] ?? null,
            'business_account_id' => $values['business_account_id'] ?? null,
        ];
    }
}
