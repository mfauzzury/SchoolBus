<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * One-time codes that prove someone can read the email they typed.
 *
 * Used before an account is created (parent and operator sign-up) and before a
 * forgotten password is replaced. A code lives in the cache for a few minutes
 * and is stored hashed.
 *
 * Accepting a code hands back a proof token. Only the browser that typed the
 * code has it, and the endpoint that does the real work (create the account,
 * set the password) asks for it and then clears it. Knowing someone's email is
 * therefore never enough to ride on their verification.
 *
 * Guessing is limited three ways: a code dies after a few tries, an email can
 * only be sent so many codes an hour, and an email with too many wrong guesses
 * in a day is locked until the day is over, however many new codes are asked for.
 *
 * The purpose keeps the proofs apart: proving an email to sign up never lets
 * anyone reset that email's password, and the other way round.
 */
class EmailOtp
{
    public const REGISTRATION = 'registration';

    public const PASSWORD_RESET = 'password-reset';

    public const CODE_MINUTES = 10;

    public const VERIFIED_MINUTES = 30;

    public const RESEND_SECONDS = 60;

    /** Tries allowed against one code. */
    public const MAX_ATTEMPTS = 5;

    /** Codes one email may be sent in an hour. */
    public const MAX_CODES_PER_HOUR = 6;

    /** Wrong guesses one email may collect in a day, across all its codes. */
    public const MAX_WRONG_PER_DAY = 15;

    public const OK = 'ok';

    public const INVALID = 'invalid';

    public const EXPIRED = 'expired';

    public const TOO_MANY_ATTEMPTS = 'too_many_attempts';

    public const LOCKED = 'locked';

    /**
     * Start a new code for this email and return it so the caller can send it.
     * Returns null when no code may be sent right now (see secondsUntilResend).
     */
    public function issue(string $purpose, string $email): ?string
    {
        if ($this->isLocked($purpose, $email) || $this->sentTooMany($purpose, $email)) {
            return null;
        }

        $until = now()->addSeconds(self::RESEND_SECONDS)->getTimestamp();

        if (! Cache::add($this->key('cooldown', $purpose, $email), $until, self::RESEND_SECONDS)) {
            return null;
        }

        RateLimiter::hit($this->key('sent', $purpose, $email), 3600);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // A new code gets its own tries; the day's wrong guesses carry over.
        RateLimiter::clear($this->key('attempts', $purpose, $email));
        Cache::put($this->key('code', $purpose, $email), $this->hash($code), now()->addMinutes(self::CODE_MINUTES));

        return $code;
    }

    /** Seconds until another code may be requested (0 when it may be requested now). */
    public function secondsUntilResend(string $purpose, string $email): int
    {
        $until = Cache::get($this->key('cooldown', $purpose, $email));
        $waits = [$until ? max(0, (int) $until - now()->getTimestamp()) : 0];

        if ($this->sentTooMany($purpose, $email)) {
            $waits[] = RateLimiter::availableIn($this->key('sent', $purpose, $email));
        }

        if ($this->isLocked($purpose, $email)) {
            $waits[] = RateLimiter::availableIn($this->key('wrong', $purpose, $email));
        }

        return max($waits);
    }

    /** A code has been issued for this email and can still be typed in. */
    public function hasPendingCode(string $purpose, string $email): bool
    {
        return Cache::has($this->key('code', $purpose, $email));
    }

    /** Too many wrong guesses today: no new codes and no more tries until the day is over. */
    public function isLocked(string $purpose, string $email): bool
    {
        return RateLimiter::tooManyAttempts($this->key('wrong', $purpose, $email), self::MAX_WRONG_PER_DAY);
    }

    /** The email could not be sent: drop the code and the cooldown so they can retry at once. */
    public function discard(string $purpose, string $email): void
    {
        Cache::forget($this->key('code', $purpose, $email));
        Cache::forget($this->key('cooldown', $purpose, $email));
        RateLimiter::decrement($this->key('sent', $purpose, $email), 3600);
    }

    /**
     * Check a typed code. On success the second value is the proof token the
     * final step must present; otherwise it is null.
     *
     * @return array{0: self::OK|self::INVALID|self::EXPIRED|self::TOO_MANY_ATTEMPTS|self::LOCKED, 1: ?string}
     */
    public function verify(string $purpose, string $email, string $code): array
    {
        if ($this->isLocked($purpose, $email)) {
            return [self::LOCKED, null];
        }

        $codeKey = $this->key('code', $purpose, $email);
        $hash = Cache::get($codeKey);

        if (! $hash) {
            return [self::EXPIRED, null];
        }

        // Count the try before looking at the code. The counter is atomic, so a
        // burst of guesses sent at the same moment cannot share one try.
        $attempt = RateLimiter::hit($this->key('attempts', $purpose, $email), self::CODE_MINUTES * 60);

        if ($attempt > self::MAX_ATTEMPTS) {
            Cache::forget($codeKey);

            return [self::TOO_MANY_ATTEMPTS, null];
        }

        if (! hash_equals($hash, $this->hash($code))) {
            RateLimiter::hit($this->key('wrong', $purpose, $email), 86400);

            if ($attempt < self::MAX_ATTEMPTS) {
                return [self::INVALID, null];
            }

            Cache::forget($codeKey);

            return [self::TOO_MANY_ATTEMPTS, null];
        }

        Cache::forget($codeKey);

        $token = Str::random(64);
        Cache::put($this->key('verified', $purpose, $email), $this->hash($token), now()->addMinutes(self::VERIFIED_MINUTES));

        return [self::OK, $token];
    }

    /** Whether this token is the proof handed out when the email's code was accepted. */
    public function isVerified(string $purpose, string $email, ?string $token): bool
    {
        $hash = Cache::get($this->key('verified', $purpose, $email));

        return is_string($hash) && filled($token) && hash_equals($hash, $this->hash($token));
    }

    /** Called once the email has been used for what it was proven for, so the proof cannot be reused. */
    public function forget(string $purpose, string $email): void
    {
        Cache::forget($this->key('verified', $purpose, $email));
    }

    private function sentTooMany(string $purpose, string $email): bool
    {
        return RateLimiter::tooManyAttempts($this->key('sent', $purpose, $email), self::MAX_CODES_PER_HOUR);
    }

    private function hash(string $value): string
    {
        return hash_hmac('sha256', $value, (string) config('app.key'));
    }

    private function key(string $kind, string $purpose, string $email): string
    {
        return "email-otp-{$purpose}-{$kind}:".sha1(Str::lower(trim($email)));
    }
}
