<?php

namespace Tests\Concerns;

use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\ParentProfile;
use App\Models\Student;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Shared tenant/user wiring for feature tests. Kept explicit (no magic
 * cross-factory linking) so it's always obvious which tenant a user belongs to.
 */
trait CreatesTestData
{
    protected function createTenant(array $attributes = []): BusOperator
    {
        return BusOperator::factory()->create($attributes);
    }

    protected function ensureRole(string $name): Role
    {
        return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
    }

    protected function createOperatorAdmin(BusOperator $tenant, array $attributes = []): User
    {
        $this->ensureRole('operator_admin');
        $user = User::factory()->create([...$attributes, 'tenant_id' => $tenant->id]);
        $user->assignRole('operator_admin');

        return $user;
    }

    protected function createOperatorStaff(BusOperator $tenant, array $attributes = []): User
    {
        $this->ensureRole('operator_staff');
        $user = User::factory()->create([...$attributes, 'tenant_id' => $tenant->id]);
        $user->assignRole('operator_staff');

        return $user;
    }

    /**
     * @return array{0: User, 1: ParentProfile}
     */
    protected function createParent(BusOperator $tenant, array $userAttributes = [], array $profileAttributes = []): array
    {
        $this->ensureRole('parent');
        $user = User::factory()->create([...$userAttributes, 'tenant_id' => $tenant->id]);
        $user->assignRole('parent');

        $profile = ParentProfile::factory()->create([
            ...$profileAttributes,
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
        ]);

        return [$user, $profile];
    }

    /**
     * Invoice::factory()'s default 'student_id' => Student::factory() would
     * create the student under an unrelated, independently-factoried tenant
     * — fine for tests that never dereference $invoice->student, but wrong
     * wherever the response actually loads that relation (e.g. CSV export).
     */
    protected function createInvoiceForTenant(BusOperator $tenant, array $overrides = []): Invoice
    {
        [, $parent] = $this->createParent($tenant);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);

        return Invoice::factory()->create([...$overrides, 'tenant_id' => $tenant->id, 'student_id' => $student->id]);
    }
}
