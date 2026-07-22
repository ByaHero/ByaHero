<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class AppVersionController extends Controller
{
    /**
     * Get the latest mobile app version metadata dynamically from GitHub Releases.
     */
    public function getVersion(Request $request)
    {
        $versionData = Cache::remember('byahero_latest_github_release', 300, function () {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'ByaHero-Backend-App'
                ])->timeout(5)->get('https://api.github.com/repos/ByaHero/ByaHero/releases/latest');

                if ($response->successful()) {
                    $json = $response->json();
                    $rawTag = $json['tag_name'] ?? '1.0.0';
                    $version = ltrim($rawTag, 'vV');
                    $notes = !empty($json['body']) ? $json['body'] : 'Bug fixes and performance improvements.';
                    $downloadUrl = $json['assets'][0]['browser_download_url'] ?? 'https://github.com/ByaHero/ByaHero/releases/latest/download/byahero.apk';

                    return [
                        'latest_version' => $version,
                        'download_url' => $downloadUrl,
                        'release_notes' => $notes,
                    ];
                }
            } catch (\Exception $e) {
                // Fallback on network timeout or GitHub rate limits
            }

            return [
                'latest_version' => '1.0.1',
                'download_url' => 'https://github.com/ByaHero/ByaHero/releases/latest/download/byahero.apk',
                'release_notes' => 'Bug fixes and performance improvements.',
            ];
        });

        return response()->json([
            'success' => true,
            'latest_version' => $versionData['latest_version'],
            'min_required_version' => '1.0.0',
            'download_url' => $versionData['download_url'],
            'release_notes' => $versionData['release_notes'],
            'force_update' => false
        ]);
    }
}
