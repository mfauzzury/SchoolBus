<?php

namespace App\Services;

use App\Models\BusOperator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin client for one operator's Billplz account. Credentials are per-operator
 * (money settles straight to them), so an instance is always built for a tenant.
 */
class BillplzService
{
    private const PRODUCTION_URL = 'https://www.billplz.com/api';

    private const SANDBOX_URL = 'https://www.billplz-sandbox.com/api';

    public function __construct(private readonly BusOperator $operator)
    {
        if (! $operator->hasBillplz()) {
            throw new RuntimeException('Online payments are not configured for this operator.');
        }
    }

    private function baseUrl(): string
    {
        return $this->operator->billplz_sandbox ? self::SANDBOX_URL : self::PRODUCTION_URL;
    }

    /**
     * Read-only credential check: fetch the configured collection. This proves
     * the Secret Key is valid for the selected environment (sandbox vs live) and
     * that the Collection ID belongs to that account. The X Signature key can't
     * be exercised through the API — it's only used when Billplz calls us back.
     *
     * @return array{ok: bool, reason: string, collection_title: ?string, warnings: list<string>}
     */
    public function checkConnection(): array
    {
        $warnings = [];

        if ($this->operator->billplz_secret_key === $this->operator->billplz_x_signature_key) {
            $warnings[] = 'x_signature_same_as_secret';
        }

        try {
            $response = Http::withBasicAuth($this->operator->billplz_secret_key, '')
                ->acceptJson()
                ->timeout(10)
                ->get($this->baseUrl().'/v3/collections/'.rawurlencode($this->operator->billplz_collection_id));
        } catch (ConnectionException) {
            return ['ok' => false, 'reason' => 'unreachable', 'collection_title' => null, 'warnings' => $warnings];
        }

        $reason = match (true) {
            $response->successful() => 'ok',
            in_array($response->status(), [401, 403], true) => 'unauthorized',
            $response->status() === 404 => 'collection_not_found',
            default => 'unreachable',
        };

        return [
            'ok' => $reason === 'ok',
            'reason' => $reason,
            'collection_title' => $reason === 'ok' ? $response->json('title') : null,
            'warnings' => $warnings,
        ];
    }

    /**
     * Create a bill and return Billplz's `id` and hosted payment page `url`.
     *
     * @param  int  $amountInCents  Billplz is MYR-only and takes the smallest unit.
     * @return array{id: string, url: string}
     */
    public function createBill(
        int $amountInCents,
        string $name,
        string $email,
        string $description,
        string $callbackUrl,
        string $redirectUrl,
        string $reference,
    ): array {
        $response = Http::asForm()
            ->withBasicAuth($this->operator->billplz_secret_key, '')
            ->timeout(15)
            ->post($this->baseUrl().'/v3/bills', [
                'collection_id' => $this->operator->billplz_collection_id,
                'email' => $email,
                'name' => mb_substr($name, 0, 255),
                'amount' => $amountInCents,
                'callback_url' => $callbackUrl,
                'redirect_url' => $redirectUrl,
                'description' => mb_substr($description, 0, 200),
                'reference_1_label' => 'Payment ID',
                'reference_1' => $reference,
            ]);

        if ($response->failed() || ! $response->json('id') || ! $response->json('url')) {
            throw new RuntimeException('Billplz rejected the bill: '.$response->body());
        }

        return ['id' => $response->json('id'), 'url' => $response->json('url')];
    }

    /**
     * Billplz "X Signature": HMAC-SHA256 over every posted pair except the
     * signature itself, each rendered as key+value, sorted case-insensitively and
     * joined with "|". Same scheme for the callback and the redirect.
     *
     * @param  array<string, mixed>  $params  Flat key => value pairs, signature excluded.
     */
    public static function sign(array $params, string $key): string
    {
        $pairs = [];

        foreach ($params as $name => $value) {
            $pairs[] = $name.match (true) {
                is_bool($value) => $value ? 'true' : 'false',
                $value === null => '',
                default => (string) $value,
            };
        }

        sort($pairs, SORT_STRING | SORT_FLAG_CASE);

        return hash_hmac('sha256', implode('|', $pairs), $key);
    }

    /**
     * @param  array<string, mixed>  $params  Flat key => value pairs, signature excluded.
     */
    public static function verify(array $params, ?string $signature, string $key): bool
    {
        return is_string($signature)
            && $signature !== ''
            && hash_equals(self::sign($params, $key), strtolower($signature));
    }

    /**
     * The redirect arrives as billplz[id], billplz[paid], billplz[paid_at], and
     * the signed strings keep the "billplz" prefix (e.g. "billplzidabc123").
     *
     * @param  array<string, mixed>  $billplz  The `billplz` query array, signature excluded.
     * @return array<string, mixed>
     */
    public static function prefixRedirectParams(array $billplz): array
    {
        $prefixed = [];

        foreach ($billplz as $name => $value) {
            $prefixed['billplz'.$name] = $value;
        }

        return $prefixed;
    }
}
