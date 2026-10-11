<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Announcement;

class AnnouncementController extends Controller
{
    /** Notices from the platform that are live right now, newest first. */
    public function active()
    {
        return Announcement::query()
            ->live()
            ->latest('id')
            ->get(['id', 'title', 'body', 'title_ms', 'body_ms'])
            // The date columns aren't selected, so a computed status would be meaningless here.
            ->makeHidden('status');
    }
}
