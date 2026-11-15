<?php

namespace App\Http\Controllers\Api\Transit\Concerns;

use App\Models\TransitCenter;
use Illuminate\Http\Request;

trait ActsAsTransitCenter
{
    /** The logged-in center; a center that was switched off can't do anything. */
    protected function center(Request $request): TransitCenter
    {
        $center = $request->user()->transitCenter;
        abort_unless($center?->isActive(), 403, 'This transit center is not active.');

        return $center;
    }
}
