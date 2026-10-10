<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\User;
use App\Support\ActivityLog;
use App\Support\PlatformAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * "Log in as operator": the platform member's browser session is switched to
 * the operator's owner login so they see exactly what the operator sees. The
 * original member is remembered in the session so they can switch back, and
 * every action taken meanwhile is still logged against them.
 */
class ImpersonationController extends Controller
{
    public function start(Request $request, BusOperator $operator)
    {
        abort_if($request->session()->has('impersonator_id'), 422, 'Return to admin first.');

        $owner = $operator->adminUser();
        abort_unless($owner, 422, 'This operator has no owner login.');

        ActivityLog::record('impersonation_started', $operator->id);

        $request->session()->put('impersonator_id', $request->user()->id);
        Auth::guard('web')->login($owner);

        return response()->json(['message' => 'Started']);
    }

    public function stop(Request $request)
    {
        $impersonatorId = $request->session()->get('impersonator_id');
        abort_unless($impersonatorId, 403, 'Not logged in as an operator.');

        $admin = User::find($impersonatorId);
        $tenantId = $request->user()->tenant_id;

        // The account may have been removed or downgraded while they were away.
        $stillAllowed = $admin
            && $admin->deactivated_at === null
            && $admin->hasAnyRole(PlatformAccess::roles());

        ActivityLog::record('impersonation_stopped', $tenantId);
        $request->session()->forget('impersonator_id');

        if (! $stillAllowed) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();

            return response()->json(['message' => 'Logged out']);
        }

        Auth::guard('web')->login($admin);

        return response()->json(['message' => 'Stopped', 'operator_id' => $tenantId]);
    }
}
