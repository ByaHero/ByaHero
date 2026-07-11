<?php

namespace App\Services;

use App\Models\BusTelemetry;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AIEtaService
{
    /**
     * Train the "model" by calling the Python ML API.
     */
    public function trainModel()
    {
        try {
            $apiUrl = config('services.python_ml_api.url');
            $response = \Illuminate\Support\Facades\Http::timeout(60)->post("{$apiUrl}/train");
            
            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['success']) && $data['success']) {
                    Cache::put('ai_model_last_trained', now()->toDateTimeString());
                    return true;
                }
            }
            \Illuminate\Support\Facades\Log::error('Python ML API Training Failed', ['response' => $response->body()]);
            return false;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Python ML API Connection Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Predict ETA and optimal speed by calling the Python ML API.
     */
    public function predictEtaAndSpeed($route, $currentSpeed, $distanceMeters = null)
    {
        try {
            $apiUrl = config('services.python_ml_api.url');
            $response = \Illuminate\Support\Facades\Http::timeout(5)->post("{$apiUrl}/predict", [
                'route' => $route ?? '',
                'current_speed' => (float)($currentSpeed ?? 0),
                'distance_meters' => (float)($distanceMeters ?? 0)
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                return [
                    'predicted_speed_ms' => $data['predicted_speed_ms'] ?? 10.0,
                    'predicted_speed_kmh' => $data['predicted_speed_kmh'] ?? 36.0,
                    'eta_minutes' => $data['eta_minutes'] ?? 0
                ];
            }
            
            \Illuminate\Support\Facades\Log::error('Python ML API Predict Failed', ['response' => $response->body()]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Python ML API Connection Error: ' . $e->getMessage());
        }

        // Fallback calculation if Python API fails
        $predictedSpeed = max(1.0, (float)$currentSpeed > 0 ? $currentSpeed : 10.0);
        $etaMinutes = 0;
        if ($distanceMeters !== null && $distanceMeters > 0) {
            $etaMinutes = ceil(($distanceMeters / $predictedSpeed) / 60);
        }

        return [
            'predicted_speed_ms' => round($predictedSpeed, 2),
            'predicted_speed_kmh' => round($predictedSpeed * 3.6, 1),
            'eta_minutes' => $etaMinutes
        ];
    }
}
