<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLog;
use App\Support\PlatformAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The platform team: people who log in to the admin screens. Owner-only
 * (team.manage). Because an Owner can't change or remove themselves, at least
 * one active Owner always remains.
 */
class TeamController extends Controller
{
    public function index()
    {
        return User::role(PlatformAccess::roles())
            ->with('roles:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->present($user));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'level' => ['required', Rule::in(array_keys(PlatformAccess::LEVELS))],
        ]);

        $user = DB::transaction(function () use ($data) {
            // Nobody knows this password; the person sets their own from the emailed link.
            $user = User::create([
                'tenant_id' => null,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Str::random(40),
            ]);
            $user->assignRole(PlatformAccess::LEVELS[$data['level']]);

            return $user;
        });

        Password::sendResetLink(['email' => $user->email]);

        ActivityLog::record('team_member_created', properties: [
            'member' => $user->name,
            'level' => $data['level'],
        ]);

        return response()->json($this->present($user->fresh('roles')), 201);
    }

    public function update(Request $request, User $user)
    {
        $this->ensurePlatformMember($user);
        $this->ensureNotSelf($request, $user);

        $data = $request->validate([
            'level' => ['required', Rule::in(array_keys(PlatformAccess::LEVELS))],
        ]);

        $user->syncRoles([PlatformAccess::LEVELS[$data['level']]]);

        ActivityLog::record('team_member_level_changed', properties: [
            'member' => $user->name,
            'level' => $data['level'],
        ]);

        return $this->present($user->fresh('roles'));
    }

    public function deactivate(Request $request, User $user)
    {
        $this->ensurePlatformMember($user);
        $this->ensureNotSelf($request, $user);

        $user->forceFill(['deactivated_at' => now()])->save();

        // Kick them out right now: open browser sessions and any API tokens.
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->tokens()->delete();

        ActivityLog::record('team_member_deactivated', properties: ['member' => $user->name]);

        return $this->present($user->fresh('roles'));
    }

    public function reactivate(Request $request, User $user)
    {
        $this->ensurePlatformMember($user);

        $user->forceFill(['deactivated_at' => null])->save();

        ActivityLog::record('team_member_reactivated', properties: ['member' => $user->name]);

        return $this->present($user->fresh('roles'));
    }

    /** Route binding resolves any user; this screen only ever deals with the platform team. */
    private function ensurePlatformMember(User $user): void
    {
        abort_unless($user->hasAnyRole(PlatformAccess::roles()), 404);
    }

    private function ensureNotSelf(Request $request, User $user): void
    {
        abort_if($request->user()->is($user), 422, 'You cannot change your own access.');
    }

    private function present(User $user): array
    {
        $role = $user->roles->pluck('name')->first(fn ($name) => in_array($name, PlatformAccess::roles(), true));

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'level' => PlatformAccess::levelForRole((string) $role),
            'last_login_at' => $user->last_login_at,
            'deactivated_at' => $user->deactivated_at,
            'created_at' => $user->created_at,
        ];
    }
}
