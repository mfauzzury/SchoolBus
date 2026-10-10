<?php

namespace Tests\Feature\Services;

use App\Services\BillplzService;
use Tests\TestCase;

class BillplzServiceTest extends TestCase
{
    // Published example from Billplz's API docs ("X Signature Redirect URL").
    private const DOC_KEY = 'S-s7b4yWpp9h7rrkNM1i3Z_g';

    private const DOC_REDIRECT_SIGNATURE = '4aab095fe5a39b1d534500988f9a0cb085cd1b6d5bbb55dd4e02ea6fa102b47b';

    private function docRedirectParams(): array
    {
        return BillplzService::prefixRedirectParams([
            'id' => 'zq0tm2wc',
            'paid' => 'true',
            'paid_at' => '2018-09-27 15:15:09 +0800',
        ]);
    }

    public function test_it_reproduces_the_documented_redirect_signature(): void
    {
        $this->assertSame(
            self::DOC_REDIRECT_SIGNATURE,
            BillplzService::sign($this->docRedirectParams(), self::DOC_KEY),
        );
    }

    public function test_verify_accepts_the_documented_signature_and_rejects_tampering(): void
    {
        $this->assertTrue(BillplzService::verify($this->docRedirectParams(), self::DOC_REDIRECT_SIGNATURE, self::DOC_KEY));

        $tampered = [...$this->docRedirectParams(), 'billplzpaid' => 'false'];
        $this->assertFalse(BillplzService::verify($tampered, self::DOC_REDIRECT_SIGNATURE, self::DOC_KEY));
        $this->assertFalse(BillplzService::verify($this->docRedirectParams(), self::DOC_REDIRECT_SIGNATURE, 'wrong-key'));
        $this->assertFalse(BillplzService::verify($this->docRedirectParams(), null, self::DOC_KEY));
        $this->assertFalse(BillplzService::verify($this->docRedirectParams(), '', self::DOC_KEY));
    }

    public function test_sorting_is_case_insensitive_and_nulls_sign_as_empty(): void
    {
        // "paid_amount" must sort before "paid_at" before "paid"+"true", and
        // null (an empty mobile) must contribute just its key.
        $a = BillplzService::sign(['paid' => 'true', 'paid_at' => 'x', 'paid_amount' => '100', 'mobile' => null], 'k');
        $b = BillplzService::sign(['mobile' => '', 'paid_amount' => '100', 'paid_at' => 'x', 'paid' => 'true'], 'k');

        $this->assertSame($a, $b);
        $this->assertSame(
            hash_hmac('sha256', 'mobile|paid_amount100|paid_atx|paidtrue', 'k'),
            $a,
        );
    }
}
