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
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
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
        $userId = $this->getAuthUserId($request);
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

    private function ensureNotificationSchema(): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        try {
            if (!Schema::hasColumn('notifications', 'is_cleared')) {
                DB::statement("ALTER TABLE notifications ADD COLUMN is_cleared TINYINT(1) NOT NULL DEFAULT 0");
            }
        } catch (\Throwable $e) {}

        try {
            if (!Schema::hasColumn('sos_alerts', 'is_cleared')) {
                DB::statement("ALTER TABLE sos_alerts ADD COLUMN is_cleared TINYINT(1) NOT NULL DEFAULT 0");
            }
        } catch (\Throwable $e) {}

        try {
            DB::statement("ALTER TABLE sos_alerts MODIFY COLUMN status ENUM('active','resolved','seen','cleared') DEFAULT 'active'");
        } catch (\Throwable $e) {}

        $ensured = true;
    }

    public function getUnreadCount(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $this->ensureNotificationSchema();

        $count = 0;
        try {
            $count = Notification::where('user_id', $userId)->whereNull('read_at')->where('is_cleared', false)->count();
        } catch (\Throwable $e) {
            $count = Notification::where('user_id', $userId)->whereNull('read_at')->count();
        }

        return response()->json(['success' => true, 'unread' => $count]);
    }

    public function getUnreadStatus(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $this->ensureNotificationSchema();

        $hasUnread = false;
        try {
            $hasUnread = Notification::where('user_id', $userId)->whereNull('read_at')->where('is_cleared', false)->exists();
        } catch (\Throwable $e) {
            $hasUnread = Notification::where('user_id', $userId)->whereNull('read_at')->exists();
        }

        if (!$hasUnread) {
            try {
                $hasUnread = SosAlert::where('recipient_user_id', $userId)
                    ->where('status', 'active')
                    ->where(function ($q) {
                        $q->where('is_cleared', 0)->orWhereNull('is_cleared');
                    })
                    ->exists();
            } catch (\Throwable $e) {
                $hasUnread = SosAlert::where('recipient_user_id', $userId)->where('status', 'active')->exists();
            }
        }

        return response()->json(['success' => true, 'has_unread' => $hasUnread]);
    }

    public function getNotifications(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $this->ensureNotificationSchema();

        try {
            $notifications = Notification::where('user_id', $userId)
                ->where('is_cleared', false)
                ->orderBy('id', 'desc')
                ->limit(50)
                ->get();
        } catch (\Throwable $e) {
            $notifications = Notification::where('user_id', $userId)
                ->orderBy('id', 'desc')
                ->limit(50)
                ->get();
        }

        return response()->json(['success' => true, 'notifications' => $notifications]);
    }

    public function markRead(Request $request)
    {
        $userId = $this->getAuthUserId($request);
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
        $userId = $this->getAuthUserId($request);
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
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        try {
            $this->ensureNotificationSchema();

            $markRead = $request->boolean('mark_read', false);

            // 1. Fetch user settings (default enabled 1)
            $settings = \App\Models\UserSetting::where('user_id', $userId)->first();
            $notifySchedule = (int)($settings->notify_bus_schedule ?? 1);
            $notifyArrival = (int)($settings->notify_bus_arrival ?? 1);
            $notifySeat = (int)($settings->notify_seat_availability ?? 1);

            // 2. Fetch SOS alerts BEFORE modifying status so active alerts are returned.
            // Exclude alerts that are cleared or have empty status (from legacy truncation).
            $hasSosIsCleared = false;
            try {
                $hasSosIsCleared = Schema::hasColumn('sos_alerts', 'is_cleared');
            } catch (\Throwable $e) {}

            $sosQuery = DB::table('sos_alerts as sa')
                ->join('users as u', 'u.id', '=', 'sa.sender_user_id')
                ->select('sa.id', 'sa.location_text', 'sa.status', 'sa.created_at', 'u.name as sender_name', 'u.email as sender_email')
                ->where('sa.recipient_user_id', $userId)
                ->whereNotIn('sa.status', ['cleared', 'resolved', '']);

            if ($hasSosIsCleared) {
                $sosQuery->where(function ($q) {
                    $q->where('sa.is_cleared', 0)->orWhereNull('sa.is_cleared');
                });
            }

            $sosAlerts = $sosQuery->orderBy('sa.created_at', 'desc')
                ->limit(50)
                ->get();

            // 3. Fetch Notifications BEFORE marking as read
            try {
                $notifications = Notification::where('user_id', $userId)
                    ->where('is_cleared', false)
                    ->orderBy('id', 'desc')
                    ->limit(50)
                    ->get();
            } catch (\Throwable $e) {
                $notifications = Notification::where('user_id', $userId)
                    ->orderBy('id', 'desc')
                    ->limit(50)
                    ->get();
            }

            // 4. Only mark unread as read and active SOS as seen if explicitly requested
            if ($markRead) {
                try {
                    Notification::where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);
                } catch (\Throwable $e) {}

                try {
                    SosAlert::where('recipient_user_id', $userId)->where('status', 'active')->update(['status' => 'seen']);
                } catch (\Throwable $e) {}
            }

            return response()->json([
                'success' => true,
                'sos_alerts' => $sosAlerts,
                'notifications' => $notifications,
                'notify_bus_schedule' => $notifySchedule,
                'notify_bus_arrival' => $notifyArrival,
                'notify_seat_availability' => $notifySeat
            ]);

        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to load notifications: ' . $e->getMessage()], 500);
        }
    }

    public function clearAll(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        try {
            $this->ensureNotificationSchema();

            // 1. Clear regular notifications
            try {
                Notification::where('user_id', $userId)->update(['is_cleared' => true]);
            } catch (\Throwable $e) {
                Notification::where('user_id', $userId)->delete();
            }

            // 2. Clear SOS alerts for this recipient
            $sosCleared = false;

            // Attempt A: update both status to 'cleared' and is_cleared to 1
            try {
                DB::table('sos_alerts')
                    ->where('recipient_user_id', $userId)
                    ->update([
                        'status' => 'cleared',
                        'is_cleared' => 1,
                    ]);
                $sosCleared = true;
            } catch (\Throwable $e) {}

            // Attempt B: if status enum does not yet permit 'cleared', set status to 'seen' + is_cleared = 1
            if (!$sosCleared) {
                try {
                    DB::table('sos_alerts')
                        ->where('recipient_user_id', $userId)
                        ->update([
                            'status' => 'seen',
                            'is_cleared' => 1,
                        ]);
                    $sosCleared = true;
                } catch (\Throwable $e) {}
            }

            // Attempt C: update only is_cleared
            if (!$sosCleared) {
                try {
                    DB::table('sos_alerts')
                        ->where('recipient_user_id', $userId)
                        ->update(['is_cleared' => 1]);
                    $sosCleared = true;
                } catch (\Throwable $e) {}
            }

            // Attempt D: update status to 'cleared' alone
            if (!$sosCleared) {
                try {
                    DB::table('sos_alerts')
                        ->where('recipient_user_id', $userId)
                        ->update(['status' => 'cleared']);
                    $sosCleared = true;
                } catch (\Throwable $e) {}
            }

            // Attempt E: if nothing else works, mark as resolved
            if (!$sosCleared) {
                try {
                    DB::table('sos_alerts')
                        ->where('recipient_user_id', $userId)
                        ->update(['status' => 'resolved']);
                } catch (\Throwable $e) {}
            }
            
            return response()->json(['success' => true, 'message' => 'Notifications cleared']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to clear notifications: ' . $e->getMessage()], 500);
        }
    }
}
