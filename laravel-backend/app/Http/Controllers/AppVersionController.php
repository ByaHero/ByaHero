<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class AppVersionController extends Controller
{
    /**
     * Get the latest mobile app version metadata dynamically per app (passenger, conductor, admin).
     */
    public function getVersion(Request $request)
    {
        $appName = strtolower($request->query('app', 'passenger'));
        $cacheKey = 'byahero_github_release_' . $appName;

        $versionData = Cache::remember($cacheKey, 300, function () use ($appName) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'ByaHero-Backend-App'
                ])->timeout(5)->get('https://api.github.com/repos/ByaHero/ByaHero/releases');

                if ($response->successful()) {
                    $releases = $response->json();
                    $highestVersion = '1.0.0';
                    $highestData = null;

                    foreach ($releases as $release) {
                        $tagName = $release['tag_name'] ?? '';
                        $assets = $release['assets'] ?? [];

                        $isMatch = false;
                        $matchedAssetUrl = null;

                        if ($appName === 'conductor') {
                            if (str_contains(strtolower($tagName), 'conductor')) {
                                $isMatch = true;
                            } else {
                                foreach ($assets as $asset) {
                                    if (str_contains(strtolower($asset['name']), 'conductor')) {
                                        $isMatch = true;
                                        $matchedAssetUrl = $asset['browser_download_url'];
                                        break;
                                    }
                                }
                            }
                        } elseif ($appName === 'admin') {
                            if (str_contains(strtolower($tagName), 'admin')) {
                                $isMatch = true;
                            } else {
                                foreach ($assets as $asset) {
                                    if (str_contains(strtolower($asset['name']), 'admin')) {
                                        $isMatch = true;
                                        $matchedAssetUrl = $asset['browser_download_url'];
                                        break;
                                    }
                                }
                            }
                        } else { // passenger / default
                            if (!str_contains(strtolower($tagName), 'conductor') && !str_contains(strtolower($tagName), 'admin')) {
                                $isMatch = true;
                            } else {
                                foreach ($assets as $asset) {
                                    if ($asset['name'] === 'byahero.apk' || str_contains(strtolower($asset['name']), 'passenger')) {
                                        $isMatch = true;
                                        $matchedAssetUrl = $asset['browser_download_url'];
                                        break;
                                    }
                                }
                            }
                        }

                        if ($isMatch) {
                            preg_match('/(\d+\.\d+\.\d+)/', $tagName, $matches);
                            $version = $matches[1] ?? ltrim($tagName, 'vV');

                            if (version_compare($version, $highestVersion, '>')) {
                                $highestVersion = $version;
                                $notes = !empty($release['body']) ? $release['body'] : 'Bug fixes and performance improvements.';
                                $downloadUrl = $matchedAssetUrl ?? ($assets[0]['browser_download_url'] ?? "https://github.com/ByaHero/ByaHero/releases/latest/download/byahero-{$appName}.apk");

                                $highestData = [
                                    'latest_version' => $version,
                                    'download_url' => $downloadUrl,
                                    'release_notes' => $notes,
                                ];
                            }
                        }
                    }

                    if ($highestData) {
                        return $highestData;
                    }
                }
            } catch (\Exception $e) {
                // Fallback on timeout
            }

            return [
                'latest_version' => '1.0.1',
                'download_url' => 'https://github.com/ByaHero/ByaHero/releases/latest/download/byahero.apk',
                'release_notes' => 'Bug fixes and performance improvements.',
            ];
        });

        return response()->json([
            'success' => true,
            'app' => $appName,
            'latest_version' => $versionData['latest_version'],
            'min_required_version' => '1.0.0',
            'download_url' => $versionData['download_url'],
            'release_notes' => $versionData['release_notes'],
            'force_update' => false
        ]);
    }
}
