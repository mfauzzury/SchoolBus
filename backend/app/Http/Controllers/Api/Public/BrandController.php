<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Support\Brand;
use Illuminate\Http\Request;

/** The brand every client shows, before anyone logs in (login page, mobile app start-up). */
class BrandController extends Controller
{
    public function show(Request $request)
    {
        $brand = Brand::toArray();

        // Browsers and apps must ask every time (a change has to show at once, even in the Owner's own
        // browser), but an unchanged brand is answered with a tiny "304 Not Modified".
        $response = response()->json($brand)
            ->setEtag(md5((string) json_encode($brand)))
            ->header('Cache-Control', 'no-cache, public');
        $response->isNotModified($request);

        return $response;
    }
}
