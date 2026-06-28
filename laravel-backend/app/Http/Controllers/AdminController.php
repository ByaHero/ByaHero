<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Driver;
use App\Models\Conductor;
use App\Models\Bus;
use App\Models\BusStopsTerminal;
use App\Models\BusSchedule;
use App\Models\Feedback;
use App\Models\Admin;

class AdminController extends Controller
{
    private function checkAuth()
    {
        $role = Session::get('user_role');
        if (empty($role) || $role !== 'admin') {
            abort(response()->json(['success' => false, 'error' => 'Admin role required'], 403));
        }
    }

    // --- STAFF MANAGEMENT ---
    public function listStaff(Request $request)
    {
        $this->checkAuth();

        $drivers = Driver::select('id', 'email', 'name', 'contacts')->get()->map(function ($d) {
            $d->role = 'driver';
            return $d;
        });

        $conductors = Conductor::select('id', 'email', 'name', 'contacts')->get()->map(function ($c) {
            $c->role = 'conductor';
            return $c;
        });

        return response()->json([
            'success' => true,
            'staff' => $drivers->concat($conductors)
        ]);
    }

    public function manageStaff(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        if ($action === 'add_user') {
            $email = trim((string)$request->input('email', ''));
            $password = (string)$request->input('password', '');
            $role = $request->input('role', 'conductor');

            if ($email === '' || $password === '') {
                return response()->json(['success' => false, 'error' => 'Email and password are required.']);
            }

            $exists = Driver::where('email', $email)->exists() || Conductor::where('email', $email)->exists();
            if ($exists) {
                return response()->json(['success' => false, 'error' => 'Email is already registered in the system.']);
            }

            $hash = Hash::make($password);
            if ($role === 'driver') {
                Driver::create([
                    'email' => $email,
                    'password' => $hash,
                ]);
            } else {
                Conductor::create([
                    'email' => $email,
                    'password' => $hash,
                ]);
            }

            return response()->json(['success' => true, 'message' => "New $role added successfully."]);
        } elseif ($action === 'delete_user') {
            $id = $request->input('id');
            $role = $request->input('role');

            if ($id && in_array($role, ['driver', 'conductor'])) {
                if ($role === 'driver') {
                    Driver::where('id', $id)->delete();
                } else {
                    Conductor::where('id', $id)->delete();
                }
                return response()->json(['success' => true, 'message' => ucfirst($role) . ' deleted successfully.']);
            }

            return response()->json(['success' => false, 'error' => 'Invalid delete request.']);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- BUS MANAGEMENT ---
    public function listBuses(Request $request)
    {
        $this->checkAuth();
        $buses = Bus::orderBy('code', 'asc')->get();
        return response()->json(['success' => true, 'buses' => $buses]);
    }

    public function manageBuses(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        if ($action === 'add_bus') {
            $code = trim((string)$request->input('code', ''));
            if ($code === '') {
                return response()->json(['success' => false, 'error' => 'Bus Code is required.']);
            }

            Bus::create([
                'code' => $code,
                'total_seats' => 25,
                'seat_availability' => 25,
                'status' => 'available'
            ]);

            return response()->json(['success' => true, 'message' => "Bus $code added successfully."]);
        } elseif ($action === 'update_bus') {
            $id = $request->input('id');
            $status = $request->input('status', 'unavailable');

            if (!$id) {
                return response()->json(['success' => false, 'error' => 'Bus ID is required.']);
            }

            Bus::where('Bus_ID', $id)->update(['status' => $status]);
            return response()->json(['success' => true, 'message' => 'Bus updated successfully.']);
        } elseif ($action === 'delete_bus') {
            $id = $request->input('id');
            if (!$id) {
                return response()->json(['success' => false, 'error' => 'Bus ID is required.']);
            }

            Bus::where('Bus_ID', $id)->delete();
            return response()->json(['success' => true, 'message' => 'Bus deleted successfully.']);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- STOPS & TERMINALS ---
    public function listStops(Request $request)
    {
        $this->checkAuth();
        $stops = BusStopsTerminal::orderBy('type', 'desc')->orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'stops' => $stops]);
    }

    public function manageStops(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        if ($action === 'add_stop' || $action === 'update_stop') {
            $id = $request->input('id');
            $data = [
                'name' => $request->input('name'),
                'type' => $request->input('type'),
                'location_name' => $request->input('location_name'),
                'location_landmark' => $request->input('location_landmark'),
                'lat' => $request->input('lat'),
                'lng' => $request->input('lng'),
                'route' => $request->input('route', 'LAUREL - TANAUAN'),
                'sort_order' => $request->input('sort_order', 0),
            ];

            if ($action === 'add_stop') {
                BusStopsTerminal::create($data);
                return response()->json(['success' => true, 'message' => 'Stop added successfully.']);
            } else {
                BusStopsTerminal::where('id', $id)->update($data);
                return response()->json(['success' => true, 'message' => 'Stop updated successfully.']);
            }
        } elseif ($action === 'delete_stop') {
            $id = $request->input('id');
            if (!$id) {
                return response()->json(['success' => false, 'error' => 'Stop ID is required.']);
            }

            BusStopsTerminal::where('id', $id)->delete();
            return response()->json(['success' => true, 'message' => 'Stop deleted successfully.']);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- SCHEDULES & ASSIGNMENTS ---
    public function listSchedules(Request $request)
    {
        $this->checkAuth();
        $schedules = BusSchedule::orderBy('terminal_name', 'asc')->get();
        return response()->json(['success' => true, 'schedules' => $schedules]);
    }

    public function manageSchedules(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        if ($action === 'save_routes') {
            $schedules = [
                'LAUREL - TANAUAN' => [
                    'time_open' => $request->input('lt_open'),
                    'time_close' => $request->input('lt_close'),
                    'is_suspended' => $request->input('lt_suspended') ? 1 : 0,
                    'suspend_message' => $request->input('lt_message'),
                ],
                'TANAUAN - LAUREL' => [
                    'time_open' => $request->input('tl_open'),
                    'time_close' => $request->input('tl_close'),
                    'is_suspended' => $request->input('tl_suspended') ? 1 : 0,
                    'suspend_message' => $request->input('tl_message'),
                ]
            ];

            foreach ($schedules as $terminal => $data) {
                BusSchedule::updateOrCreate(
                    ['terminal_name' => $terminal],
                    $data
                );
            }

            return response()->json(['success' => true, 'message' => 'Schedules updated successfully.']);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- FEEDBACKS LOG ---
    public function listFeedbacks(Request $request)
    {
        $this->checkAuth();
        $feedbacks = Feedback::select('feedbacks.*', 'users.name as passenger_name', 'users.email as passenger_email')
            ->leftJoin('users', 'feedbacks.user_id', '=', 'users.id')
            ->orderBy('feedbacks.created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'feedbacks' => $feedbacks]);
    }

    public function deleteFeedback(Request $request)
    {
        $this->checkAuth();
        $id = $request->input('id');
        if (!$id) {
            return response()->json(['success' => false, 'error' => 'Feedback ID is required.']);
        }

        Feedback::where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Feedback deleted permanently.']);
    }

    // --- ANALYTICS DASHBOARD ---
    public function getAnalytics(Request $request)
    {
        $this->checkAuth();
        $period = $request->input('period', 'today');
        $dateFilter = '';

        switch ($period) {
            case 'week':
                $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
                break;
            case 'month':
                $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                break;
            case 'custom':
                $start = $request->input('start');
                $end = $request->input('end');
                if ($start && $end) {
                    $dateFilter = "AND o.started_at >= '{$start} 00:00:00' AND o.started_at <= '{$end} 23:59:59'";
                } else {
                    $dateFilter = "AND DATE(o.started_at) = CURDATE()";
                }
                break;
            default:
                $dateFilter = "AND DATE(o.started_at) = CURDATE()";
                break;
        }

        // 1. Summary Stats
        $sum = DB::selectOne("SELECT
            COUNT(*) AS total_trips,
            COALESCE(SUM(o.total_boarded), 0) AS total_passengers,
            COALESCE(SUM(o.pre_departure_count), 0) AS total_pre_departure,
            COALESCE(SUM(o.total_departed), 0) AS total_departed,
            COALESCE(AVG(TIMESTAMPDIFF(MINUTE, o.started_at, o.ended_at)), 0) AS avg_trip_minutes
            FROM bus_operations o WHERE o.status='completed' {$dateFilter}");

        // 2. Route breakdown
        $routes = DB::select("SELECT o.route, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded), 0) AS passengers
            FROM bus_operations o WHERE 1=1 {$dateFilter} GROUP BY o.route ORDER BY passengers DESC");

        // 3. Buses performance
        $buses = DB::select("SELECT b.code, o.bus_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded), 0) AS passengers,
            GROUP_CONCAT(DISTINCT o.route SEPARATOR ', ') AS routes,
            GROUP_CONCAT(DISTINCT c.email SEPARATOR ', ') AS conductors
            FROM bus_operations o 
            JOIN busses b ON b.Bus_ID = o.bus_id
            JOIN conductors c ON c.id = o.conductor_id
            WHERE 1=1 {$dateFilter} GROUP BY o.bus_id, b.code ORDER BY passengers DESC");

        $busDepQueries = DB::select("SELECT o.bus_id, pe.location_name, SUM(pe.count) AS total
            FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
            WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
            GROUP BY o.bus_id, pe.location_name ORDER BY total DESC");

        foreach ($buses as &$bus) {
            $bus->hotspots = array_values(array_filter($busDepQueries, function ($h) use ($bus) {
                return (int)$h->bus_id === (int)$bus->bus_id;
            }));
        }

        // 4. Conductors activity
        $conductors = DB::select("SELECT c.email, o.conductor_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded), 0) AS passengers
            FROM bus_operations o JOIN conductors c ON c.id = o.conductor_id
            WHERE 1=1 {$dateFilter} GROUP BY o.conductor_id, c.email ORDER BY trips DESC");

        // 5. Hourly flow
        $hourly = DB::select("SELECT HOUR(pe.recorded_at) AS hr, SUM(pe.count) AS total
            FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
            WHERE pe.event_type='board' {$dateFilter}
            GROUP BY HOUR(pe.recorded_at) ORDER BY hr");

        // 6. Departures & boardings
        $departures = DB::select("SELECT pe.location_name, SUM(pe.count) AS total
            FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
            WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
            GROUP BY pe.location_name ORDER BY total DESC LIMIT 20");

        $boardings = DB::select("SELECT pe.location_name, SUM(pe.count) AS total
            FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
            WHERE pe.event_type='board' AND pe.location_name IS NOT NULL {$dateFilter}
            GROUP BY pe.location_name ORDER BY total DESC LIMIT 20");

        // 7. Recent Operations
        $recent = DB::select("SELECT o.*, b.code AS bus_code, c.email AS conductor_email,
            TIMESTAMPDIFF(MINUTE, o.started_at, COALESCE(o.ended_at, NOW())) AS duration_min
            FROM bus_operations o
            JOIN busses b ON b.Bus_ID = o.bus_id
            JOIN conductors c ON c.id = o.conductor_id
            WHERE 1=1 {$dateFilter}
            ORDER BY o.started_at DESC LIMIT 20");

        // 8. Location logs
        $locationLogs = DB::select("SELECT 
            pe.location_name, 
            pe.recorded_at, 
            b.code AS bus_code, 
            c.email AS conductor_email, 
            o.route,
            SUM(CASE WHEN pe.event_type = 'board' THEN pe.count ELSE 0 END) AS boarded,
            SUM(CASE WHEN pe.event_type = 'depart' THEN pe.count ELSE 0 END) AS departed
            FROM passenger_events pe
            JOIN bus_operations o ON o.id = pe.operation_id
            JOIN busses b ON b.Bus_ID = o.bus_id
            JOIN conductors c ON c.id = o.conductor_id
            WHERE 1=1 {$dateFilter}
            GROUP BY pe.operation_id, pe.location_name, pe.recorded_at
            ORDER BY pe.recorded_at DESC LIMIT 50");

        return response()->json([
            'success' => true,
            'period' => $period,
            'summary' => $sum,
            'routes' => $routes,
            'buses' => $buses,
            'conductors' => $conductors,
            'hourly_flow' => $hourly,
            'departure_locations' => $departures,
            'boarding_locations' => $boardings,
            'recent_operations' => $recent,
            'location_logs' => $locationLogs
        ]);
    }

    // --- ACTIVE BUSES MONITORING ---
    public function listActiveBuses(Request $request)
    {
        $this->checkAuth();

        $activeBuses = DB::select("
            SELECT b.*, c.email AS conductor_email
            FROM busses b
            LEFT JOIN conductors c ON b.current_conductor_id = c.id
            WHERE b.current_conductor_id IS NOT NULL
              AND b.status IN ('available', 'on_stop', 'full')
            ORDER BY b.code ASC
        ");

        return response()->json([
            'success' => true,
            'activeBuses' => $activeBuses
        ]);
    }

    // --- WAITING PASSENGERS MONITORING ---
    public function listWaitingPassengers(Request $request)
    {
        $this->checkAuth();

        $waitingList = DB::select("
            SELECT wp.id, wp.user_id, wp.user_name, wp.location_name, wp.created_at, wp.status,
                   u.name as registered_name, u.email as registered_email
            FROM waiting_passengers wp
            LEFT JOIN users u ON wp.user_id = u.id
            WHERE wp.status = 'waiting'
            ORDER BY wp.created_at DESC
        ");

        return response()->json([
            'success' => true,
            'waitingList' => $waitingList
        ]);
    }

    public function manageWaitingPassengers(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        if ($action === 'cancel_waiting') {
            $id = $request->input('id');
            if (!$id) {
                return response()->json(['success' => false, 'error' => 'ID is required.']);
            }

            DB::table('waiting_passengers')
                ->where('id', $id)
                ->update(['status' => 'cancelled', 'updated_at' => now()]);

            return response()->json(['success' => true, 'message' => 'Passenger waiting status cancelled successfully.']);
        } elseif ($action === 'cancel_location') {
            $location = $request->input('location');
            if (!$location) {
                return response()->json(['success' => false, 'error' => 'Location name is required.']);
            }

            DB::table('waiting_passengers')
                ->where('location_name', $location)
                ->where('status', 'waiting')
                ->update(['status' => 'cancelled', 'updated_at' => now()]);

            return response()->json(['success' => true, 'message' => 'All waiting signals for location cancelled successfully.']);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- ADMIN PROFILE SETTINGS ---
    public function getProfile(Request $request)
    {
        $this->checkAuth();
        $id = Session::get('user_id');
        
        $admin = Admin::find($id);
        if (!$admin) {
            return response()->json(['success' => false, 'error' => 'Admin not found'], 404);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'name' => $admin->name ?? $admin->email,
                'email' => $admin->email ?? ''
            ]
        ]);
    }

    public function updateProfile(Request $request)
    {
        $this->checkAuth();
        $id = Session::get('user_id');
        
        $admin = Admin::find($id);
        if (!$admin) {
            return response()->json(['success' => false, 'error' => 'Admin not found'], 404);
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
            } elseif (!Hash::check($currentPassword, $admin->password)) {
                $error = "Current password is incorrect.";
            } elseif ($newPassword !== $confirmPassword) {
                $error = "New passwords do not match.";
            } elseif (strlen($newPassword) < 6) {
                $error = "Password must be at least 6 characters.";
            } else {
                $admin->password = Hash::make($newPassword);
                $admin->name = $name;
                $admin->email = $email;
                if ($admin->save()) {
                    $message = "Profile and password updated successfully!";
                } else {
                    $error = "Failed to update profile.";
                }
            }
        } else {
            $admin->name = $name;
            $admin->email = $email;
            if ($admin->save()) {
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
                'name' => $admin->name ?? $admin->email,
                'email' => $admin->email ?? ''
            ]
        ]);
    }

    // --- BUS FARE MANAGEMENT ---
    public function listFares(Request $request)
    {
        $this->checkAuth();
        $fares = DB::table('bus_fares')->get();
        
        $snapshots = [];
        try {
            $snapshots = DB::table('bus_fare_snapshots')->orderBy('created_at', 'desc')->get();
        } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'fares' => $fares,
            'snapshots' => $snapshots
        ]);
    }

    public function manageFares(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        try {
            if ($action === 'update_fare') {
                $fareId = (int)$request->input('fare_id');
                $regular = $request->input('regular_fare');
                $discounted = $request->input('discounted_fare');

                if ($fareId <= 0) {
                    return response()->json(['success' => false, 'error' => 'Invalid fare selected.']);
                }
                if ($regular === null || $discounted === null || $regular < 0 || $discounted < 0) {
                    return response()->json(['success' => false, 'error' => 'Valid, non-negative fares are required.']);
                }
                if ($discounted > $regular) {
                    return response()->json(['success' => false, 'error' => 'Discounted fare cannot be higher than regular fare.']);
                }

                DB::table('bus_fares')
                    ->where('fare_id', $fareId)
                    ->update([
                        'regular_fare' => round((float)$regular, 2),
                        'discounted_fare' => round((float)$discounted, 2),
                        'updated_at' => now()
                    ]);

                return response()->json(['success' => true, 'message' => 'Fare updated successfully.']);
            } 
            
            elseif ($action === 'update_multiple_fares') {
                $regFares = $request->input('regular_fare', []);
                $discFares = $request->input('discounted_fare', []);

                $affected = 0;
                foreach ($regFares as $id => $reg) {
                    $id = (int)$id;
                    $regVal = $reg !== null ? round((float)$reg, 2) : null;
                    $discVal = isset($discFares[$id]) && $discFares[$id] !== null ? round((float)$discFares[$id], 2) : null;

                    if ($regVal !== null && $discVal !== null && $regVal >= 0 && $discVal >= 0 && $discVal <= $regVal) {
                        $upd = DB::table('bus_fares')
                            ->where('fare_id', $id)
                            ->update([
                                'regular_fare' => $regVal,
                                'discounted_fare' => $discVal,
                                'updated_at' => now()
                            ]);
                        if ($upd) $affected++;
                    }
                }
                return response()->json(['success' => true, 'message' => "Saved successfully. Fares updated: $affected"]);
            } 
            
            elseif ($action === 'generate_matrix') {
                $baseKm = (float)$request->input('base_km', 4.0);
                $regBase = (float)$request->input('reg_base', 14.00);
                $discBase = (float)$request->input('disc_base', 11.25);
                $regRate = (float)$request->input('reg_rate', 2.20);
                $discRate = (float)$request->input('disc_rate', 1.76);

                if ($baseKm < 0 || $regBase < 0 || $discBase < 0 || $regRate < 0 || $discRate < 0) {
                    return response()->json(['success' => false, 'error' => 'Values cannot be negative.']);
                }

                // Backup to base_* columns if null
                DB::table('bus_fares')
                    ->whereNull('base_regular_fare')
                    ->orWhereNull('base_discounted_fare')
                    ->update([
                        'base_regular_fare' => DB::raw('regular_fare'),
                        'base_discounted_fare' => DB::raw('discounted_fare')
                    ]);

                // Run formula
                DB::statement("
                    UPDATE bus_fares 
                    SET 
                        regular_fare = ROUND((? + GREATEST(0, distance_km - ?) * ?) * 4) / 4,
                        discounted_fare = ROUND((? + GREATEST(0, distance_km - ?) * ?) * 4) / 4,
                        updated_at = NOW()
                ", [
                    $regBase, $baseKm, $regRate,
                    $discBase, $baseKm, $discRate
                ]);

                // Ensure discounted <= regular
                DB::table('bus_fares')
                    ->whereRaw('discounted_fare > regular_fare')
                    ->update(['discounted_fare' => DB::raw('regular_fare')]);

                return response()->json(['success' => true, 'message' => 'LTFRB Matrix applied successfully.']);
            } 
            
            elseif ($action === 'reset_to_base') {
                DB::table('bus_fares')->update([
                    'regular_fare' => DB::raw('base_regular_fare'),
                    'discounted_fare' => DB::raw('LEAST(base_discounted_fare, base_regular_fare)'),
                    'updated_at' => now()
                ]);
                return response()->json(['success' => true, 'message' => 'Reverted to base fares.']);
            } 
            
            elseif ($action === 'snapshot_create') {
                $label = trim((string)$request->input('snapshot_label', ''));
                if ($label === '') {
                    $label = 'Snapshot ' . date('Y-m-d H:i:s');
                }

                DB::transaction(function () use ($label) {
                    $snapshotId = DB::table('bus_fare_snapshots')->insertGetId([
                        'label' => $label,
                        'created_at' => now()
                    ]);

                    $fares = DB::table('bus_fares')->get();
                    foreach ($fares as $fare) {
                        DB::table('bus_fare_snapshot_rows')->insert([
                            'snapshot_id' => $snapshotId,
                            'fare_id' => $fare->fare_id,
                            'regular_fare' => $fare->regular_fare,
                            'discounted_fare' => $fare->discounted_fare,
                            'base_regular_fare' => $fare->base_regular_fare,
                            'base_discounted_fare' => $fare->base_discounted_fare
                        ]);
                    }
                });

                return response()->json(['success' => true, 'message' => 'Snapshot created successfully.']);
            } 
            
            elseif ($action === 'snapshot_restore') {
                $snapshotId = (int)$request->input('snapshot_id');
                if ($snapshotId <= 0) {
                    return response()->json(['success' => false, 'error' => 'Invalid snapshot ID.']);
                }

                $rows = DB::table('bus_fare_snapshot_rows')->where('snapshot_id', $snapshotId)->get();
                if ($rows->isEmpty()) {
                    return response()->json(['success' => false, 'error' => 'Snapshot is empty or does not exist.']);
                }

                DB::transaction(function () use ($rows) {
                    foreach ($rows as $row) {
                        DB::table('bus_fares')
                            ->where('fare_id', $row->fare_id)
                            ->update([
                                'regular_fare' => $row->regular_fare,
                                'discounted_fare' => $row->discounted_fare,
                                'base_regular_fare' => $row->base_regular_fare,
                                'base_discounted_fare' => $row->base_discounted_fare,
                                'updated_at' => now()
                            ]);
                    }
                });

                return response()->json(['success' => true, 'message' => 'Snapshot restored successfully.']);
            } 
            
            elseif ($action === 'snapshot_delete') {
                $snapshotId = (int)$request->input('snapshot_id');
                if ($snapshotId <= 0) {
                    return response()->json(['success' => false, 'error' => 'Invalid snapshot ID.']);
                }

                DB::transaction(function () use ($snapshotId) {
                    DB::table('bus_fare_snapshot_rows')->where('snapshot_id', $snapshotId)->delete();
                    DB::table('bus_fare_snapshots')->where('id', $snapshotId)->delete();
                });

                return response()->json(['success' => true, 'message' => 'Snapshot deleted.']);
            }
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- LOST & FOUND MANAGEMENT ---
    public function listLostAndFound(Request $request)
    {
        $this->checkAuth();
        $tickets = DB::table('lost_and_found as lf')
            ->leftJoin('users as u', 'lf.user_id', '=', 'u.id')
            ->select('lf.*', 'u.name as reporter_name', 'u.contacts as reporter_contact')
            ->orderBy('lf.created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'tickets' => $tickets
        ]);
    }

    public function manageLostAndFound(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        try {
            if ($action === 'update_status') {
                $id = $request->input('id');
                $status = $request->input('status', 'open');

                if (!in_array($status, ['open', 'resolved', 'closed'])) {
                    $status = 'open';
                }

                if (!$id) {
                    return response()->json(['success' => false, 'error' => 'Invalid update request (empty ID).']);
                }

                DB::table('lost_and_found')->where('id', $id)->update(['status' => $status]);
                return response()->json(['success' => true, 'message' => 'Ticket updated successfully.']);
            } 
            
            elseif ($action === 'delete_ticket') {
                $id = $request->input('id');
                if (!$id) {
                    return response()->json(['success' => false, 'error' => 'Invalid delete request (empty ID).']);
                }

                DB::table('lost_and_found')->where('id', $id)->delete();
                return response()->json(['success' => true, 'message' => 'Ticket deleted forever.']);
            }
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }

    // --- REPORT MANAGEMENT ---
    public function listReports(Request $request)
    {
        $this->checkAuth();
        
        // Self-healing check (make sure bus_number exists)
        try {
            $hasBusNumber = \Illuminate\Support\Facades\Schema::hasColumn('reports', 'bus_number');
            if (!$hasBusNumber) {
                \Illuminate\Support\Facades\Schema::table('reports', function ($table) {
                    $table->string('bus_number', 50)->nullable()->after('user_id');
                });
            }
        } catch (\Exception $e) {}

        $reports = DB::table('reports as r')
            ->leftJoin('users as u', 'r.user_id', '=', 'u.id')
            ->select('r.*', 'u.name as reporter_name', 'u.email as reporter_email')
            ->orderBy('r.created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'reports' => $reports
        ]);
    }

    public function manageReports(Request $request)
    {
        $this->checkAuth();
        $action = $request->input('action');

        try {
            if ($action === 'update_status') {
                $id = $request->input('id');
                $status = $request->input('status', 'pending');

                if (!in_array($status, ['pending', 'resolved'])) {
                    $status = 'pending';
                }

                if (!$id) {
                    return response()->json(['success' => false, 'error' => 'Invalid update request (empty ID).']);
                }

                DB::table('reports')->where('id', $id)->update(['status' => $status]);
                return response()->json(['success' => true, 'message' => 'Report status updated successfully.']);
            } 
            
            elseif ($action === 'delete_report') {
                $id = $request->input('id');
                if (!$id) {
                    return response()->json(['success' => false, 'error' => 'Invalid delete request (empty ID).']);
                }

                DB::table('reports')->where('id', $id)->delete();
                return response()->json(['success' => true, 'message' => 'Report deleted permanently.']);
            }
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }

        return response()->json(['success' => false, 'error' => 'Unknown action.']);
    }
}
