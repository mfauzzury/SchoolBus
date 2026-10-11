<?php

namespace Tests\Concerns;

use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\ParentProfile;
use App\Models\Route;
use App\Models\Staff;
use App\Models\Student;
use App\Models\User;
use App\Support\EmailOtp;
use App\Support\PlatformAccess;
use Spatie\Permission\Models\Role;

/**
 * Shared tenant/user wiring for feature tests. Kept explicit (no magic
 * cross-factory linking) so it's always obvious which tenant a user belongs to.
 */
trait CreatesTestData
{
    /**
     * Proves an email the way a person does (ask for a code, type it in) and
     * returns the proof token to send as `email_token` with the sign-up or
     * password-reset request.
     */
    protected function verifyEmail(string $email, string $purpose = EmailOtp::REGISTRATION): string
    {
        $otp = app(EmailOtp::class);
        $code = $otp->issue($purpose, $email);
        [$result, $token] = $otp->verify($purpose, $email, $code);
        $this->assertSame(EmailOtp::OK, $result);

        return $token;
    }

    protected function createTenant(array $attributes = []): BusOperator
    {
        return BusOperator::factory()->create($attributes);
    }

    protected function ensureRole(string $name): Role
    {
        return Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
    }

    protected function createSaasAdmin(array $attributes = []): User
    {
        $this->ensureRole('saas_admin');
        $user = User::factory()->create([...$attributes, 'tenant_id' => null]);
        $user->assignRole('saas_admin');

        return $user;
    }

    /**
     * A platform-team member at the given level ('owner' | 'finance' | 'support'),
     * with the real role/permission table applied.
     */
    protected function createPlatformUser(string $level, array $attributes = []): User
    {
        PlatformAccess::sync();
        $user = User::factory()->create([...$attributes, 'tenant_id' => null]);
        $user->assignRole(PlatformAccess::LEVELS[$level]);

        return $user;
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
     * @return array{0: User, 1: Staff}
     */
    protected function createDriver(BusOperator $tenant, array $userAttributes = [], array $staffAttributes = []): array
    {
        $this->ensureRole('driver');
        $user = User::factory()->create([...$userAttributes, 'tenant_id' => $tenant->id]);
        $user->assignRole('driver');

        $staff = Staff::factory()->driver()->create([
            ...$staffAttributes,
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
        ]);

        return [$user, $staff];
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
     * An active student on a priced route — everything a bill needs.
     * Pass 'parent_id' to add a sibling under an existing parent.
     */
    protected function createBillableStudent(BusOperator $tenant, array $studentOverrides = [], array $routeOverrides = []): Student
    {
        if (! isset($studentOverrides['parent_id'])) {
            [, $parent] = $this->createParent($tenant);
            $studentOverrides['parent_id'] = $parent->id;
        }

        $route = Route::factory()->create(['base_monthly_fee' => 150, ...$routeOverrides, 'tenant_id' => $tenant->id]);

        return Student::factory()->create(['route_id' => $route->id, ...$studentOverrides, 'tenant_id' => $tenant->id]);
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
