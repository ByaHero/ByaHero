<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Bus;
use App\Models\BusStopsTerminal;
use App\Models\BusStop;
use App\Models\UserLocation;
use App\Models\UserSetting;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Exception;

class BusController extends Controller
{
    private function loadGeojsonFileForBus(int $busId): ?array
    {
        $file = base_path('../data/current_locations/bus_' . $busId . '.geojson');
        if (!is_file($file)) return null;
        $txt = @file_get_contents($file);
        if ($txt === false) return null;
        $j = json_decode($txt, true);
        if (!is_array($j)) return null;
        return $j;
    }

    private function extractFriendlyNameFromGeojson(array $geojson): ?string
    {
        if (isset($geojson['properties']) && is_array($geojson['properties'])) {
            $p = $geojson['properties'];
            if (!empty($p['current_location_name']) && is_string($p['current_location_name'])) return trim($p['current_location_name']);
            if (!empty($p['Current Location']) && is_string($p['Current Location'])) return trim($p['Current Location']);
            if (!empty($p['name']) && is_string($p['name'])) return trim($p['name']);
            foreach ($p as $k => $v) {
                if (is_string($v) && trim($v) !== '') return trim($v);
                if ($v === '') return $k;
            }
        }
        if (!empty($geojson['type']) && $geojson['type'] === 'FeatureCollection' && !empty($geojson['features']) && is_array($geojson['features'])) {
            $f = $geojson['features'][0];
            if (isset($f['properties']) && is_array($f['properties'])) {
                return $this->extractFriendlyNameFromGeojson(['properties' => $f['properties']]);
            }
        }
        return null;
    }

    public function getBuses(Request $request)
    {
        $buses = Bus::orderBy('code')->get();

        $out = [];
        foreach ($buses as $bus) {
            $r = $bus->toArray();
            $busId = (int)$bus->Bus_ID;

            $geo = $this->loadGeojsonFileForBus($busId);
            if ($geo !== null) {
                $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
                $friendly = $this->extractFriendlyNameFromGeojson($geo);
                if ($friendly) {
                    $r['current_location_name'] = $friendly;
                }
                if (isset($geo['geometry']['coordinates']) && is_array($geo['geometry']['coordinates']) && count($geo['geometry']['coordinates']) >= 2) {
                    $r['lng'] = $geo['geometry']['coordinates'][0];
                    $r['lat'] = $geo['geometry']['coordinates'][1];
                    $r['longitude'] = $geo['geometry']['coordinates'][0];
                    $r['latitude'] = $geo['geometry']['coordinates'][1];
                }
                // Prefer live seats_available from geojson properties over potentially stale DB value
                if (isset($geo['properties']['seats_available']) && is_numeric($geo['properties']['seats_available'])) {
                    $r['seat_availability'] = (int)$geo['properties']['seats_available'];
                }
                if (isset($geo['properties']['status']) && !empty($geo['properties']['status'])) {
                    $r['status'] = $geo['properties']['status'];
                }
            } else {
                $r['current_location'] = null;
            }

            if (isset($r['seat_availability']) && (int)$r['seat_availability'] < 0) {
                $r['seat_availability'] = 0;
            }

            // Map keys to match legacy API casing/naming expectations
            $currentOpId = DB::table('bus_operations')
                ->where('bus_id', $busId)
                ->where('status', 'active')
                ->orderBy('id', 'desc')
                ->value('id');

            if (empty($currentOpId)) {
                continue;
            }
            $r['current_operation_id'] = $currentOpId;

            $out[] = $r;
        }

        return response()->json(['success' => true, 'buses' => $out]);
    }

    public function getBusStopsTerminal(Request $request)
    {
        $stops = BusStopsTerminal::orderBy('name')->get();
        return response()->json([
            'success' => true,
            'data' => $stops
        ]);
    }

    public function getSyncData(Request $request)
    {
        $stopsTerminal = BusStopsTerminal::orderBy('name')->get();
        $busStops = BusStop::where('is_active', 1)->orderBy('km_marker')->get();
        $busFares = DB::table('bus_fares')->get();
        $busSchedule = DB::table('bus_schedule')->orderBy('terminal_name')->get();

        return response()->json([
            'success' => true,
            'stops_terminal' => $stopsTerminal,
            'bus_stops' => $busStops,
            'bus_fares' => $busFares,
            'bus_schedule' => $busSchedule
        ]);
    }

    public function getRideHistory(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $hasOperationId = Schema::hasColumn('passenger_rides', 'operation_id');

        if ($hasOperationId) {
            $history = DB::table('passenger_rides as pr')
                ->join('bus_operations as bo', 'pr.operation_id', '=', 'bo.id')
                ->join('busses as b', 'bo.bus_id', '=', 'b.Bus_ID')
                ->select('pr.id', 'pr.boarded_at', 'pr.departed_at', 'pr.status', 'bo.route', 'b.code as bus_code')
                ->where('pr.user_id', $userId)
                ->orderBy('pr.boarded_at', 'desc')
                ->get();
        } else {
            $history = DB::table('passenger_rides as pr')
                ->join('busses as b', 'pr.bus_id', '=', 'b.Bus_ID')
                ->select('pr.id', 'pr.boarded_at', 'pr.departed_at', 'pr.status', 'pr.route', 'b.code as bus_code')
                ->where('pr.user_id', $userId)
                ->orderBy('pr.boarded_at', 'desc')
                ->get();
        }

        return response()->json(['success' => true, 'history' => $history]);
    }

    public function updateUserLocation(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $lat = $request->input('latitude');
        $lng = $request->input('longitude');
        $accuracy = $request->input('accuracy');

        if ($lat === null || $lng === null) {
            return response()->json(['success' => false, 'message' => 'Latitude/longitude required']);
        }

        $setting = UserSetting::where('user_id', $userId)->first();
        $isLocationEnabled = true; // Default if settings row doesn't exist
        if ($setting) {
            $isLocationEnabled = ((int)$setting->location_services === 1 || (int)$setting->share_location === 1);
        }

        if (!$isLocationEnabled) {
            return response()->json(['success' => false, 'message' => 'Location services disabled']);
        }

        try {
            UserLocation::updateOrCreate(
                ['user_id' => $userId],
                [
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'accuracy' => $accuracy,
                ]
            );

            return response()->json(['success' => true]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update location']);
        }
    }

    public function getMyWaitingStatus(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = DB::table('users')->where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        // Check if boarded
        $activeRide = DB::table('passenger_rides as pr')
            ->join('busses as b', 'pr.bus_id', '=', 'b.Bus_ID')
            ->where('pr.user_id', $userId)
            ->where('pr.status', 'active')
            ->select('pr.id', 'b.code as bus_code', 'b.route')
            ->orderBy('pr.id', 'desc')
            ->first();

        if ($activeRide) {
            return response()->json([
                'success' => true,
                'is_waiting' => false,
                'is_boarded' => true,
                'bus_code' => $activeRide->bus_code,
                'route' => $activeRide->route,
                'location_name' => null
            ]);
        }

        $waiting = DB::table('waiting_passengers')
            ->where('user_id', $userId)
            ->where('status', 'waiting')
            ->orderBy('id', 'desc')
            ->first();

        if ($waiting) {
            return response()->json([
                'success' => true,
                'is_waiting' => true,
                'is_boarded' => false,
                'location_name' => $waiting->location_name
            ]);
        }

        return response()->json([
            'success' => true,
            'is_waiting' => false,
            'is_boarded' => false,
            'location_name' => null
        ]);
    }

    public function setWaitingStatus(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = DB::table('users')->where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        $locationName = $request->input('location_name');
        if (empty($locationName)) {
            return response()->json(['success' => false, 'message' => 'Location name is required'], 400);
        }

        // Get user name
        $userName = DB::table('users')->where('id', $userId)->value('name') ?? 'Passenger';

        // Check if there is already an active waiting entry
        $existing = DB::table('waiting_passengers')
            ->where('user_id', $userId)
            ->where('status', 'waiting')
            ->first();

        if ($existing) {
            DB::table('waiting_passengers')
                ->where('id', $existing->id)
                ->update([
                    'location_name' => $locationName,
                    'updated_at' => now()
                ]);
        } else {
            DB::table('waiting_passengers')->insert([
                'user_id' => $userId,
                'user_name' => $userName,
                'location_name' => $locationName,
                'status' => 'waiting',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Waiting status updated',
            'location_name' => $locationName,
            'status' => 'waiting'
        ]);
    }

    public function cancelWaitingStatus(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = DB::table('users')->where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        DB::table('waiting_passengers')
            ->where('user_id', $userId)
            ->where('status', 'waiting')
            ->update([
                'status' => 'cancelled',
                'updated_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Waiting status cancelled'
        ]);
    }

    public function autoBoard(Request $request)
    {
        try {
            $userId = Session::get('user_id');
            $email = $request->input('email');
            if (empty($userId) && !empty($email)) {
                $userId = DB::table('users')->where('email', strtolower(trim($email)))->value('id');
            }

            if (empty($userId)) {
                return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
            }

            $busId = $request->input('bus_id');
            $operationId = $request->input('operation_id');

            if (empty($busId) || empty($operationId)) {
                return response()->json(['success' => false, 'message' => 'bus_id and operation_id are required'], 400);
            }

            // Cancel waiting status
            DB::table('waiting_passengers')
                ->where('user_id', $userId)
                ->where('status', 'waiting')
                ->update([
                    'status' => 'boarded',
                    'updated_at' => now()
                ]);

            $rideData = [
                'user_id' => $userId,
                'status' => 'active',
                'boarded_at' => now()
            ];

            if (Schema::hasColumn('passenger_rides', 'operation_id')) {
                $rideData['operation_id'] = $operationId;
            }
            
            if (Schema::hasColumn('passenger_rides', 'bus_id')) {
                $rideData['bus_id'] = $busId;
            }

            if (!Schema::hasColumn('passenger_rides', 'operation_id')) {
                // If operation_id doesn't exist on passenger_rides, grab the route from the bus or operation
                $opRoute = DB::table('bus_operations')->where('id', $operationId)->value('route');
                if ($opRoute && Schema::hasColumn('passenger_rides', 'route')) {
                    $rideData['route'] = $opRoute;
                }
            }

            // Create passenger ride
            $rideId = DB::table('passenger_rides')->insertGetId($rideData);

            // Increment boarded count in bus_operations
            DB::table('bus_operations')
                ->where('id', $operationId)
                ->increment('total_boarded');

            return response()->json([
                'success' => true,
                'message' => 'Boarded successfully',
                'ride_id' => $rideId
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('autoBoard crash: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function autoDepart(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = DB::table('users')->where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        // Find active ride
        $activeRide = DB::table('passenger_rides')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->orderBy('id', 'desc')
            ->first();

        if (!$activeRide) {
            return response()->json(['success' => false, 'message' => 'No active ride found'], 404);
        }

        // Update ride status to completed
        DB::table('passenger_rides')
            ->where('id', $activeRide->id)
            ->update([
                'status' => 'completed',
                'departed_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Departed successfully'
        ]);
    }

    public function getMapData(Request $request)
    {
        $files = [];

        // 1. public/routes
        $publicRoutes = public_path('routes');
        if (is_dir($publicRoutes)) {
            foreach (glob($publicRoutes . '/*.geojson') as $f) {
                $files[] = $f;
            }
        }

        // 2. data/routes (project data folder)
        $dataRoutes = base_path('../data/routes');
        if (is_dir($dataRoutes)) {
            foreach (glob($dataRoutes . '/*.geojson') as $f) {
                $files[] = $f;
            }
        }

        // 3. resources/routes
        $resourceRoutes = resource_path('routes');
        if (is_dir($resourceRoutes)) {
            foreach (glob($resourceRoutes . '/*.geojson') as $f) {
                $files[] = $f;
            }
        }

        // 4. storage/app/routes
        $storageRoutes = storage_path('app/routes');
        if (is_dir($storageRoutes)) {
            foreach (glob($storageRoutes . '/*.geojson') as $f) {
                $files[] = $f;
            }
        }

        $files = array_unique($files);
        $features = [];

        foreach ($files as $file) {
            $txt = @file_get_contents($file);
            if ($txt === false) continue;
            $json = json_decode($txt, true);
            if (!$json) continue;
            if (isset($json['type']) && $json['type'] === 'FeatureCollection' && !empty($json['features']) && is_array($json['features'])) {
                foreach ($json['features'] as $f) {
                    $features[] = $f;
                }
            } elseif (isset($json['type']) && $json['type'] === 'Feature') {
                $features[] = $json;
            } elseif (isset($json[0]) && is_array($json)) {
                foreach ($json as $f) {
                    if (isset($f['type']) && $f['type'] === 'Feature') {
                        $features[] = $f;
                    }
                }
            }
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features
        ]);
    }
}
