<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserFcmToken;
use App\Models\Notification;
use App\Models\SosAlert;
use App\Models\User;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\Conductor;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Exception;

class NotificationController extends Controller
{
    private $roleTables = [
        'admin'     => Admin::class,
        'driver'    => Driver::class,
        'conductor' => Conductor::class,
        'passenger' => User::class,
    ];

    public function registerFcmToken(Request $request)
    {
        $userId = Session::get('user_id');
        $email = trim($request->input('email', ''));

        // Fallback for hydrating session if not logged in but email is provided
        if (empty($userId) && !empty($email)) {
            foreach ($this->roleTables as $role => $modelClass) {
                $user = $modelClass::where('email', $email)->first();
                if ($user) {
                    $userId = (int)$user->id;
                    Session::put('user_id', $userId);
                    Session::put('user_role', $role);
                    Session::put('user_email', $email);
                    break;
                }
            }
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $fcmToken = trim($request->input('fcm_token', ''));
        if (empty($fcmToken)) {
            return response()->json(['success' => false, 'message' => 'fcm_token required'], 400);
        }

        try {
            // Remove token if it was previously attached to a different user
            UserFcmToken::where('fcm_token', $fcmToken)->where('user_id', '!=', $userId)->delete();

            // Insert or update token assignment
            DB::statement(
                "INSERT INTO user_fcm_tokens (user_id, fcm_token) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)",
                [$userId, $fcmToken]
            );

            return response()->json([
                'success' => true,
                'user_id' => $userId,
                'fcm_token' => $fcmToken,
            ]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Internal server error occurred.'], 500);
        }
    }

    public function getUnreadCount(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $count = Notification::where('user_id', $userId)->whereNull('read_at')->count();
        return response()->json(['success' => true, 'unread' => $count]);
    }

    public function getUnreadStatus(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $hasUnread = Notification::where('user_id', $userId)->whereNull('read_at')->exists();

        if (!$hasUnread) {
            $hasUnread = SosAlert::where('recipient_user_id', $userId)->where('status', 'active')->exists();
        }

        return response()->json(['success' => true, 'has_unread' => $hasUnread]);
    }

    public function getNotifications(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $notifications = Notification::where('user_id', $userId)
            ->orderBy('id', 'desc') // Using primary key instead of created_at timestamp for solid order
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'notifications' => $notifications]);
    }

    public function markRead(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $notifId = (int)$request->input('id', 0);
        if ($notifId > 0) {
            Notification::where('id', $notifId)->where('user_id', $userId)->update(['read_at' => now()]);
        } else {
            Notification::where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);
        }

        return response()->json(['success' => true, 'message' => 'Marked as read']);
    }

    public function createNotification(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $type = trim($request->input('type', ''));
        $title = trim($request->input('title', ''));
        $message = trim($request->input('message', ''));
        $dedupeKey = trim($request->input('dedupe_key', ''));
        $meta = $request->input('meta');

        if ($type === '' || $title === '' || $message === '' || $dedupeKey === '') {
            return response()->json(['success' => false, 'message' => 'Missing required fields']);
        }

        try {
            // Check if notification with dedupeKey already exists
            if (Notification::where('dedupe_key', $dedupeKey)->exists()) {
                return response()->json(['success' => true, 'message' => 'Notification already exists']);
            }

            Notification::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'meta' => $meta,
                'dedupe_key' => $dedupeKey,
            ]);

            return response()->json(['success' => true, 'message' => 'Notification created']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create']);
        }
    }

    public function notificationsIndex(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        try {
            // 1. Mark unread notifications as read
            Notification::where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);

            // 2. Mark active SOS alerts as seen
            SosAlert::where('recipient_user_id', $userId)->where('status', 'active')->update(['status' => 'seen']);

            // 3. Fetch user settings
            $settings = \App\Models\UserSetting::where('user_id', $userId)->first();
            $notifySchedule = (int)($settings->notify_bus_schedule ?? 0);
            $notifyArrival = (int)($settings->notify_bus_arrival ?? 0);
            $notifySeat = (int)($settings->notify_seat_availability ?? 0);

            // 4. Fetch SOS alerts
            $sosAlerts = DB::table('sos_alerts as sa')
                ->join('users as u', 'u.id', '=', 'sa.sender_user_id')
                ->select('sa.id', 'sa.location_text', 'sa.status', 'sa.created_at', 'u.name as sender_name', 'u.email as sender_email')
                ->where('sa.recipient_user_id', $userId)
                ->orderBy('sa.created_at', 'desc')
                ->limit(50)
                ->get();

            // 5. Fetch Notifications
            $notifications = Notification::where('user_id', $userId)
                ->orderBy('id', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'sos_alerts' => $sosAlerts,
                'notifications' => $notifications,
                'notify_bus_schedule' => $notifySchedule,
                'notify_bus_arrival' => $notifyArrival,
                'notify_seat_availability' => $notifySeat
            ]);

        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to load notifications']);
        }
    }
}
