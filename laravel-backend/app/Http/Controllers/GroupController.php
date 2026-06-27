<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\User;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Exception;

class GroupController extends Controller
{
    public function groupView(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        // Find user’s circle
        $circle = Circle::where('owner_user_id', $userId)->first();
        if (!$circle) {
            return response()->json(['success' => true, 'friends' => []]);
        }

        // Check if operation_id exists on passenger_rides to maintain compatibility
        $hasOperationId = SchemaHasColumn('passenger_rides', 'operation_id');

        $query = DB::table('circle_members as cm')
            ->join('users as u', 'u.id', '=', 'cm.user_id')
            ->leftJoin('user_locations as ul', 'ul.user_id', '=', 'u.id')
            ->leftJoin('waiting_passengers as wp', function ($join) {
                $join->on('wp.user_id', '=', 'u.id')->where('wp.status', '=', 'waiting');
            });

        if ($hasOperationId) {
            $query->leftJoin('passenger_rides as pr', function ($join) {
                $join->on('pr.user_id', '=', 'u.id')->where('pr.status', '=', 'active');
            })
            ->leftJoin('bus_operations as bo', 'bo.id', '=', 'pr.operation_id')
            ->leftJoin('busses as b', 'b.Bus_ID', '=', 'bo.bus_id');
        } else {
            $query->leftJoin('passenger_rides as pr', function ($join) {
                $join->on('pr.user_id', '=', 'u.id')->where('pr.status', '=', 'ongoing');
            })
            ->leftJoin('busses as b', 'b.Bus_ID', '=', 'pr.bus_id');
        }

        $results = $query->select(
            'u.id',
            'u.name',
            'u.email',
            'u.profile_picture',
            'ul.latitude',
            'ul.longitude',
            'ul.accuracy',
            'ul.updated_at',
            'wp.location_name as waiting_location',
            'wp.status as waiting_status',
            'pr.status as ride_status',
            'b.code as boarded_bus_code'
        )
        ->where('cm.circle_id', $circle->id)
        ->where('u.id', '!=', $userId)
        ->orderBy('u.name', 'asc')
        ->get();

        $friends = [];
        foreach ($results as $row) {
            $rideStatus = $row->ride_status;
            if ($rideStatus === 'ongoing') {
                $rideStatus = 'active';
            }

            $friends[] = [
                'id' => (int)$row->id,
                'name' => $row->name,
                'email' => $row->email,
                'profile_picture' => $row->profile_picture,
                'latitude' => $row->latitude,
                'longitude' => $row->longitude,
                'accuracy' => $row->accuracy,
                'updated_at' => $row->updated_at,
                'waiting_location' => $row->waiting_location,
                'waiting_status' => $row->waiting_status,
                'ride_status' => $rideStatus,
                'boarded_bus_code' => $row->boarded_bus_code
            ];
        }

        return response()->json(['success' => true, 'friends' => $friends]);
    }

    public function joinCircle(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $code = trim($request->input('invite_code', ''));
        if (empty($code)) {
            return response()->json(['success' => false, 'message' => 'Invite code required']);
        }

        $circle = Circle::where('invite_code', $code)->first();
        if (!$circle) {
            return response()->json(['success' => false, 'message' => 'Invalid invite code']);
        }

        if ((int)$circle->owner_user_id === (int)$userId) {
            return response()->json(['success' => false, 'message' => 'You cannot add yourself']);
        }

        $already = CircleMember::where('circle_id', $circle->id)->where('user_id', $userId)->exists();
        if ($already) {
            return response()->json(['success' => false, 'message' => 'Already in circle']);
        }

        DB::transaction(function () use ($circle, $userId) {
            // Join the scanned owner's circle
            CircleMember::create([
                'circle_id' => $circle->id,
                'user_id' => $userId
            ]);

            // Two-way circle setup: ensure scanning user owns a circle
            $myCircle = Circle::firstOrCreate(
                ['owner_user_id' => $userId],
                ['name' => 'My Circle']
            );

            // Add owner of scanned code into scanning user's circle
            CircleMember::firstOrCreate([
                'circle_id' => $myCircle->id,
                'user_id' => $circle->owner_user_id
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Joined circle successfully']);
    }

    public function removeFriend(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $friendId = (int)$request->input('friend_id', 0);
        if ($friendId <= 0) {
            return response()->json(['success' => false, 'message' => 'Invalid friend ID']);
        }

        $circle = Circle::where('owner_user_id', $userId)->first();
        if (!$circle) {
            return response()->json(['success' => false, 'message' => 'You do not own a circle']);
        }

        $affected = 0;
        DB::transaction(function () use ($circle, $userId, $friendId, &$affected) {
            // Delete friend from user's circle
            $affected = CircleMember::where('circle_id', $circle->id)
                ->where('user_id', $friendId)
                ->delete();

            // Delete user from friend's circle (two-way remove)
            $friendCircle = Circle::where('owner_user_id', $friendId)->first();
            if ($friendCircle) {
                CircleMember::where('circle_id', $friendCircle->id)
                    ->where('user_id', $userId)
                    ->delete();
            }
        });

        if ($affected > 0) {
            return response()->json(['success' => true, 'message' => 'Friend removed successfully']);
        } else {
            return response()->json(['success' => true, 'message' => 'Friend was already removed']);
        }
    }

    public function getInviteCode(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $circle = Circle::firstOrCreate(
            ['owner_user_id' => $userId],
            ['name' => 'My Circle']
        );

        $isReset = $request->input('reset') == '1';
        $inviteCode = $circle->invite_code;

        if (empty($inviteCode) || $isReset) {
            $inviteCode = (string)random_int(100000, 999999);
            $circle->invite_code = $inviteCode;
            $circle->save();
        }

        return response()->json(['success' => true, 'invite_code' => $inviteCode]);
    }
}

// Helper function to check column existence in Laravel without crashing
function SchemaHasColumn(string $table, string $column): bool {
    try {
        return \Illuminate\Support\Facades\Schema::hasColumn($table, $column);
    } catch (\Throwable $e) {
        return false;
    }
}
