<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use App\Models\Conductor;
use App\Models\Driver;
use App\Models\Bus;
use App\Models\BusOperation;
use App\Models\PassengerEvent;
use App\Models\PassengerRide;

class ConductorController extends Controller
{
    private function checkAuth()
    {
        $userId = Session::get('user_id');
        $role = Session::get('user_role');

        if (empty($userId)) {
            $email = request()->input('email');
            if (!empty($email)) {
                $cleanEmail = strtolower(trim($email));
                $conductor = Conductor::where('email', $cleanEmail)->first();
                if ($conductor) {
                    $userId = $conductor->id;
                    $role = 'conductor';
                    Session::put('user_id', (int)$userId);
                    Session::put('user_role', $role);
                    Session::put('user_name', $conductor->name ?? $conductor->email);
                    Session::put('user_contacts', $conductor->contacts);
                    Session::put('user_profile_picture', $conductor->profile_picture);
                } else {
                    $driver = Driver::where('email', $cleanEmail)->first();
                    if ($driver) {
                        $userId = $driver->id;
                        $role = 'driver';
                        Session::put('user_id', (int)$userId);
                        Session::put('user_role', $role);
                        Session::put('user_name', $driver->name ?? $driver->email);
                        Session::put('user_contacts', $driver->contacts);
                        Session::put('user_profile_picture', $driver->profile_picture);
                    }
                }
            }
        }

        if (empty($userId) || !in_array($role, ['conductor', 'driver'])) {
            abort(response()->json(['success' => false, 'error' => 'Unauthorized'], 401));
        }
        return (int)$userId;
    }

    public function getProfile(Request $request)
    {
        $userId = $this->checkAuth();
        $role = Session::get('user_role');
        
        $model = $role === 'driver' ? Driver::find($userId) : Conductor::find($userId);
        if (!$model) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'name' => $model->name ?? '',
                'email' => $model->email ?? ''
            ]
        ]);
    }

    public function updateProfile(Request $request)
    {
        $userId = $this->checkAuth();
        $role = Session::get('user_role');
        
        $model = $role === 'driver' ? Driver::find($userId) : Conductor::find($userId);
        if (!$model) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        }

        $name = trim((string)$request->input('name', ''));
        $email = trim((string)$request->input('email', ''));
        $currentPassword = $request->input('current_password');
        $newPassword = $request->input('new_password');
        $confirmPassword = $request->input('confirm_password');

        $message = '';
        $error = '';

        if (!empty($newPassword)) {
            if (empty($currentPassword)) {
                $error = "Current password is required to change password.";
            } elseif (!Hash::check($currentPassword, $model->password)) {
                $error = "Current password is incorrect.";
            } elseif ($newPassword !== $confirmPassword) {
                $error = "New passwords do not match.";
            } elseif (strlen($newPassword) < 6) {
                $error = "Password must be at least 6 characters.";
            } else {
                $model->password = Hash::make($newPassword);
                $model->name = $name;
                $model->email = $email;
                if ($model->save()) {
                    $message = "Profile and password updated successfully!";
                } else {
                    $error = "Failed to update profile.";
                }
            }
        } else {
            $model->name = $name;
            $model->email = $email;
            if ($model->save()) {
                $message = "Profile updated successfully!";
            } else {
                $error = "Failed to update profile.";
            }
        }

        return response()->json([
            'success' => empty($error),
            'message' => $message,
            'error' => $error,
            'user' => [
                'name' => $model->name ?? '',
                'email' => $model->email ?? ''
            ]
        ]);
    }

    public function getStatus(Request $request)
    {
        $userId = $this->checkAuth();
        $userName = Session::get('user_name', 'User');

        if ($request->input('stopped') == '1') {
            Session::forget('current_bus');
        }

        $conductor = Conductor::find($userId);
        $currentBusId = $conductor ? (int)$conductor->current_bus_id : 0;

        $autoResume = false;
        if ($currentBusId > 0) {
            $autoResume = Bus::where('Bus_ID', $currentBusId)
                ->where('current_conductor_id', $userId)
                ->exists();
        }

        return response()->json([
            'success' => true,
            'user_id' => $userId,
            'user_name' => $userName,
            'current_bus_id' => $currentBusId,
            'auto_resume' => $autoResume
        ]);
    }

    public function claimBus(Request $request)
    {
        $userId = $this->checkAuth();
        $busId = (int)$request->input('bus_id');
        $code = $request->input('code', "BUS-" . $busId);
        $route = $request->input('route', '');
        $seatsTotal = (int)$request->input('seats_total', 25);
        $initialAvailableSeats = $request->has('initial_available_seats') ? (int)$request->input('initial_available_seats') : $seatsTotal;
        $preDepartureCount = (int)$request->input('pre_departure_count', 0);

        if (!$busId) {
            return response()->json(['success' => false, 'error' => 'Missing bus_id']);
        }

        $bus = Bus::where('Bus_ID', $busId)->first();
        $busOwner = $bus ? $bus->current_conductor_id : null;

        if ($busOwner !== null && (int)$busOwner !== $userId) {
            Session::forget('current_bus');
            return response()->json(['success' => false, 'error' => 'bus_taken']);
        }

        Bus::where('Bus_ID', $busId)->update(['current_conductor_id' => $userId]);
        Conductor::where('id', $userId)->update(['current_bus_id' => $busId]);

        $currentBus = [
            'id' => $busId,
            'code' => $code,
            'route' => $route,
            'seats_total' => $seatsTotal,
            'seats_available' => $initialAvailableSeats,
            'pre_departure_count' => $preDepartureCount,
            'is_new_session' => true
        ];
        Session::put('current_bus', $currentBus);

        return response()->json([
            'success' => true,
            'current_bus' => $currentBus
        ]);
    }

    public function getBuses(Request $request)
    {
        $userId = $this->checkAuth();

        $rows = Bus::whereNull('current_conductor_id')
            ->orWhere('current_conductor_id', $userId)
            ->orderBy('code')
            ->get();

        $out = [];
        $dir = base_path('../data/current_locations');

        foreach ($rows as $r) {
            $busId = $r->Bus_ID;
            $file = $dir . "/bus_{$busId}.geojson";
            
            if (File::exists($file)) {
                $geoText = File::get($file);
                $geo = json_decode($geoText, true);
                $r->current_location = $geoText;
                if ($geo && isset($geo['properties']['friendly_name'])) {
                    $r->current_location_name = $geo['properties']['friendly_name'];
                }
            } else {
                $r->current_location = null;
                $r->current_location_name = $r->current_location;
            }
            $out[] = $r;
        }

        return response()->json(['success' => true, 'buses' => $out]);
    }

    public function start(Request $request)
    {
        $userId = $this->checkAuth();
        $busId = (int)$request->input('bus_id');
        $route = trim((string)$request->input('route', ''));
        $preDep = (int)$request->input('pre_departure_count', 0);
        $startLoc = $request->input('start_location');

        if ($busId <= 0 || empty($route)) {
            return response()->json(['success' => false, 'error' => 'Missing bus_id or route'], 400);
        }

        $bus = Bus::where('Bus_ID', $busId)->first();
        $busOwner = $bus ? $bus->current_conductor_id : null;

        if ($busOwner !== null && (int)$busOwner !== $userId) {
            return response()->json(['success' => false, 'error' => 'bus_taken'], 403);
        }

        // Automatically assign conductor to this bus in the database
        $initialSeats = $bus ? (int)$bus->total_seats - $preDep : 25 - $preDep;
        if ($initialSeats < 0) $initialSeats = 0;

        Bus::where('Bus_ID', $busId)->update([
            'current_conductor_id' => $userId,
            'seat_availability' => $initialSeats,
            'status' => 'available',
        ]);
        Conductor::where('id', $userId)->update(['current_bus_id' => $busId]);

        // Close any dangling operations for this bus or conductor
        BusOperation::where('bus_id', $busId)
            ->where('status', 'active')
            ->update(['status' => 'completed', 'ended_at' => now()]);

        // Create new active bus operation
        $op = BusOperation::create([
            'bus_id' => $busId,
            'conductor_id' => $userId,
            'route' => $route,
            'pre_departure_count' => $preDep,
            'started_at' => now(),
            'start_location' => $startLoc,
            'status' => 'active',
            'total_boarded' => $preDep,
            'total_departed' => 0
        ]);

        return response()->json([
            'success' => true,
            'operation_id' => $op->id
        ]);
    }

    public function updateLocation(Request $request)
    {
        $userId = $this->checkAuth();
        $busId = (int)$request->input('bus_id');
        
        $bus = Bus::where('Bus_ID', $busId)->first();
        if (!$bus || (int)$bus->current_conductor_id !== $userId) {
            return response()->json(['success' => false, 'error' => 'Not assigned to this bus'], 403);
        }

        $geojson = $request->input('geojson');
        if (!$geojson && $request->has('lat') && $request->has('lng')) {
            $lat = (float)$request->input('lat');
            $lng = (float)$request->input('lng');
            $geojson = [
                'type' => 'Feature',
                'geometry' => ['type' => 'Point', 'coordinates' => [$lng, $lat]],
                'properties' => ['timestamp' => gmdate('c')]
            ];
        }

        if (empty($geojson)) {
            return response()->json(['success' => false, 'error' => 'Provide geojson or lat & lng'], 400);
        }

        $locationName = $request->input('current_location_name');
        if ($geojson && isset($geojson['properties']['friendly_name'])) {
            $locationName = $geojson['properties']['friendly_name'];
        }

        $dir = base_path('../data/current_locations');
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }
        $file = $dir . "/bus_{$busId}.geojson";
        File::put($file, json_encode($geojson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        // Update database properties
        $updateData = ['current_location' => $locationName];
        if (isset($geojson['geometry']['coordinates'])) {
            $updateData['lng'] = $geojson['geometry']['coordinates'][0];
            $updateData['lat'] = $geojson['geometry']['coordinates'][1];
        }
        if ($request->has('route')) {
            $updateData['route'] = $request->input('route');
        }
        if ($request->has('seats_available')) {
            $sa = (int)$request->input('seats_available');
            if ($sa >= 0) {
                $updateData['seat_availability'] = $sa;
            }
        }
        if ($request->has('status')) {
            $status = $request->input('status');
            if (in_array($status, ['available', 'on_stop', 'full', 'unavailable'])) {
                $updateData['status'] = $status;
            }
        }
        
        Bus::where('Bus_ID', $busId)->update($updateData);

        // Save telemetry data for ML Training
        if (isset($updateData['lat']) && isset($updateData['lng'])) {
            \App\Models\BusTelemetry::create([
                'bus_id' => $busId,
                'route' => $updateData['route'] ?? $bus->route ?? null,
                'latitude' => $updateData['lat'],
                'longitude' => $updateData['lng'],
                'speed' => $request->input('speed', 0), // Speed in m/s
                'status' => $updateData['status'] ?? $bus->status ?? null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Location updated successfully',
            'current_location_name' => $locationName
        ]);
    }

    public function stop(Request $request)
    {
        $userId = $this->checkAuth();
        $busId = (int)$request->input('bus_id');
        $endLoc = $request->input('end_location');

        if ($busId <= 0) {
            return response()->json(['success' => false, 'error' => 'Missing bus_id'], 400);
        }

        // 1) Cascade complete active passenger rides for this active operation
        PassengerRide::join('bus_operations', 'passenger_rides.operation_id', '=', 'bus_operations.id')
            ->where('bus_operations.bus_id', $busId)
            ->where('bus_operations.conductor_id', $userId)
            ->where('bus_operations.status', 'active')
            ->whereIn('passenger_rides.status', ['active', 'ongoing'])
            ->update([
                'passenger_rides.departed_at' => now(),
                'passenger_rides.status' => 'completed'
            ]);

        // 2) Complete the bus operation
        BusOperation::where('bus_id', $busId)
            ->where('conductor_id', $userId)
            ->where('status', 'active')
            ->update([
                'ended_at' => now(),
                'end_location' => $endLoc,
                'status' => 'completed'
            ]);

        // 3) Release bus and conductor
        Bus::where('Bus_ID', $busId)->where('current_conductor_id', $userId)->update([
            'current_location' => null,
            'status' => 'unavailable',
            'route' => null,
            'seat_availability' => null,
            'current_conductor_id' => null
        ]);

        Conductor::where('id', $userId)->where('current_bus_id', $busId)->update([
            'current_bus_id' => null
        ]);

        Session::forget('current_bus');

        // Remove GeoJSON file
        $file = base_path('../data/current_locations/bus_' . $busId . '.geojson');
        if (File::exists($file)) {
            File::delete($file);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stopped tracking for bus'
        ]);
    }

    public function logPassengerEvent(Request $request)
    {
        $userId = $this->checkAuth();
        $opId = (int)$request->input('operation_id');
        $eventType = $request->input('event_type'); // 'board' or 'depart'
        $count = (int)$request->input('count', 1);
        $locationName = $request->input('location_name');
        $lat = $request->input('lat');
        $lng = $request->input('lng');

        if (!$opId || !in_array($eventType, ['board', 'depart'])) {
            return response()->json(['success' => false, 'error' => 'Invalid parameters'], 400);
        }

        $op = BusOperation::find($opId);
        if (!$op || (int)$op->conductor_id !== $userId) {
            return response()->json(['success' => false, 'error' => 'Operation not found or unauthorized'], 403);
        }

        if ($eventType === 'board') {
            $op->increment('total_boarded', $count);
        } else {
            $op->increment('total_departed', $count);
        }

        PassengerEvent::create([
            'operation_id' => $opId,
            'event_type' => $eventType,
            'count' => $count,
            'location_name' => $locationName,
            'lat' => $lat,
            'lng' => $lng,
            'recorded_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Passenger event logged successfully'
        ]);
    }
    public function getWaitingPassengers(Request $request)
    {
        $this->checkAuth();

        $locations = DB::table('waiting_passengers')
            ->select('location_name', DB::raw('count(*) as count'))
            ->where('status', 'waiting')
            ->groupBy('location_name')
            ->orderBy('count', 'desc')
            ->get();

        $total = $locations->sum('count');

        return response()->json([
            'success' => true,
            'total' => $total,
            'locations' => $locations
        ]);
    }
}
