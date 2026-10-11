<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Talks to the WhatsApp Business Cloud API. Every call returns a plain result
 * the admin UI can show; an expired token or unreachable Meta is an expected
 * outcome, not an exception.
 */
class WhatsAppService
{
    // Fixed, never taken from user input.
    private const BASE = 'https://graph.facebook.com/v21.0';

    /** Meta's "hello_world" template exists on every new WhatsApp Business account. */
    public const TEST_TEMPLATE = 'hello_world';

    public const TEST_LANGUAGE = 'en_US';

    /**
     * @param  array<string, mixed>  $settings
     * @return array{ok: bool, reason: string, verified_name: ?string, display_phone_number: ?string}
     */
    public function checkConnection(array $settings): array
    {
        try {
            $response = $this->client($settings)->get(self::BASE.'/'.$settings['phone_number_id'], [
                'fields' => 'verified_name,display_phone_number',
            ]);
        } catch (ConnectionException) {
            return $this->result(false, 'unreachable');
        }

        if ($response->successful()) {
            return $this->result(true, 'ok', $response->json('verified_name'), $response->json('display_phone_number'));
        }

        return $this->result(false, $this->reasonFor($response));
    }

    /**
     * Sends Meta's hello_world template to one number.
     *
     * @param  array<string, mixed>  $settings
     * @return array{ok: bool, reason: string, detail: ?string}
     */
    public function sendTestTemplate(array $settings, string $to): array
    {
        try {
            $response = $this->client($settings)->post(self::BASE.'/'.$settings['phone_number_id'].'/messages', [
                'messaging_product' => 'whatsapp',
                'to' => self::normalizePhone($to),
                'type' => 'template',
                'template' => [
                    'name' => self::TEST_TEMPLATE,
                    'language' => ['code' => self::TEST_LANGUAGE],
                ],
            ]);
        } catch (ConnectionException) {
            return ['ok' => false, 'reason' => 'unreachable', 'detail' => null];
        }

        if ($response->successful()) {
            return ['ok' => true, 'reason' => 'ok', 'detail' => null];
        }

        return [
            'ok' => false,
            'reason' => $this->reasonFor($response),
            // Meta's own explanation (e.g. "recipient not in allowed list"); contains no credentials.
            'detail' => mb_substr((string) $response->json('error.message'), 0, 200) ?: null,
        ];
    }

    /** Malaysian numbers typed any usual way become international digits (0123… → 60123…). */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '60')) {
            return $digits;
        }

        return str_starts_with($digits, '0') ? '6'.$digits : $digits;
    }

    private function client(array $settings)
    {
        return Http::withToken((string) $settings['access_token'])->acceptJson()->timeout(10);
    }

    private function reasonFor(Response $response): string
    {
        $code = (int) $response->json('error.code');

        return match (true) {
            $response->status() === 401, $code === 190 => 'unauthorized',
            $code === 100, $response->status() === 404 => 'phone_number_not_found',
            $code === 131030 => 'recipient_not_allowed',
            $code === 132001 => 'template_not_found',
            default => 'error',
        };
    }

    private function result(bool $ok, string $reason, ?string $name = null, ?string $number = null): array
    {
        return ['ok' => $ok, 'reason' => $reason, 'verified_name' => $name, 'display_phone_number' => $number];
    }
}
