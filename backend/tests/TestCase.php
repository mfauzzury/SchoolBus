<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Sanctum's EnsureFrontendRequestsAreStateful only starts the session
     * (needed by /api/login, /api/logout, and the public registration
     * endpoints) for requests carrying an Origin/Referer that matches
     * SANCTUM_STATEFUL_DOMAINS. The test client sends neither by default.
     */
    protected function fromFrontend(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
        ]);
    }
}
