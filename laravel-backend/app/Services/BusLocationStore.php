<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class BusLocationStore
{
    public function get(int $busId): ?array
    {
        if (config('deployment.bus_locations') === 'database') {
            $json = DB::table('bus_live_locations')->where('bus_id', $busId)->value('geojson');
        } else {
            $path = $this->path($busId);
            $json = File::exists($path) ? File::get($path) : null;
        }

        $value = $json ? json_decode($json, true) : null;
        return is_array($value) ? $value : null;
    }

    public function put(int $busId, array $geojson): void
    {
        $json = json_encode($geojson, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        if (config('deployment.bus_locations') === 'database') {
            DB::table('bus_live_locations')->upsert([
                ['bus_id' => $busId, 'geojson' => $json, 'updated_at' => now()],
            ], ['bus_id'], ['geojson', 'updated_at']);
        } else {
            File::ensureDirectoryExists(dirname($this->path($busId)));
            File::put($this->path($busId), $json);
        }
    }

    public function forget(int $busId): void
    {
        if (config('deployment.bus_locations') === 'database') {
            DB::table('bus_live_locations')->where('bus_id', $busId)->delete();
        } else {
            File::delete($this->path($busId));
        }
    }

    private function path(int $busId): string
    {
        return base_path('../data/current_locations/bus_'.$busId.'.geojson');
    }
}
