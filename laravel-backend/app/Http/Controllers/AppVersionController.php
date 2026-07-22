<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AppVersionController extends Controller
{
    /**
     * Get the latest mobile app version metadata.
     */
    public function getVersion(Request $request)
    {
        return response()->json([
            'success' => true,
            'latest_version' => '1.0.1',
            'min_required_version' => '1.0.0',
            'download_url' => 'https://byahero.app/byahero.apk',
            'release_notes' => 'Bug fixes and performance improvements.',
            'force_update' => false
        ]);
    }
}
