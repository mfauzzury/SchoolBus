<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->tenant_id) {
            abort(403, 'No tenant context.');
        }

        // A suspended operator locks out everyone under it (staff, drivers, parents) —
        // except a platform-team member who is logged in as them to help.
        // (Bearer-token mobile requests have no session, hence the hasSession guard.)
        $impersonating = $request->hasSession() && $request->session()->has('impersonator_id');

        if ($user->busOperator?->isSuspended() && ! $impersonating) {
            return response()->json([
                'message' => 'This account is suspended.',
                'code' => 'operator_suspended',
            ], 403);
        }

        app(TenantContext::class)->set($user->tenant_id);

        return $next($request);
    }
}
