<?php

namespace App\Support;

class TenantContext
{
    protected ?int $tenantId = null;

    public function set(int $tenantId): void
    {
        $this->tenantId = $tenantId;
    }

    public function getTenantId(): ?int
    {
        return $this->tenantId;
    }

    public function hasTenant(): bool
    {
        return $this->tenantId !== null;
    }
}
