<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SosAlert;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\UserFcmToken;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Exception;

class SosController extends Controller
{
    public function sendSosAlert(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        $senderName = Session::get('user_name');
        if (empty($senderName) && !empty($userId)) {
            $senderName = DB::table('users')->where('id', $userId)->value('name') ?: 'A user';
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $locationText = trim($request->input('location_text', ''));

        // Resolve the audience using the sender's circle on the server.
        $circleId = Circle::where('owner_user_id', $userId)->value('id');
        $recipients = $circleId === null ? [] : CircleMember::where('circle_id', $circleId)
            ->where('user_id', '>', 0)
            ->where('user_id', '!=', $userId)
            ->distinct()
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (empty($recipients)) {
            return response()->json([
                'success' => false,
                'message' => 'Your circle is empty. Add someone to your circle before sending an SOS.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($recipients as $recipientId) {
                SosAlert::create([
                    'sender_user_id' => $userId,
                    'recipient_user_id' => $recipientId,
                    'location_text' => $locationText,
                    'status' => 'active'
                ]);
            }

            // Look up FCM tokens for recipients
            $fcmTokens = UserFcmToken::whereIn('user_id', $recipients)
                ->where('fcm_token', '!=', '')
                ->pluck('fcm_token')
                ->toArray();

            DB::commit();

            // Dispatch on the server; client responses must never contain FCM credentials or recipient tokens.
            $fcmService = app(\App\Services\FirebaseNotificationService::class);
            $delivery = $fcmService->sendNotification($fcmTokens, 'ByaHero SOS Alert',
                ($senderName ?: 'A user').' needs help. '.$locationText,
                ['type' => 'sos', 'sender_id' => (string)$userId, 'location_text' => $locationText], 'sos_alerts');

            return response()->json([
                'success' => true,
                'sent_to' => $recipients,
                'push_sent_count' => $delivery['sent_count'] ?? 0,
                'sender_name' => $senderName ?: 'A user',
                'location_text' => $locationText
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'System error: ' . $e->getMessage()]);
        }
    }

    public function getSosAlerts(Request $request)
    {
        $userId = $this->getAuthUserId($request);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $sinceId = (int)$request->input('since_id', 0);
        $limit = 20;

        try {
            $alerts = DB::table('sos_alerts as sa')
                ->join('users as u', 'u.id', '=', 'sa.sender_user_id')
                ->select('sa.id', 'sa.location_text', 'sa.status', 'sa.created_at', 'u.name as sender_name', 'u.email as sender_email')
                ->where('sa.recipient_user_id', $userId)
                ->where('sa.id', '>', $sinceId)
                ->orderBy('sa.id', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'alerts' => $alerts
            ]);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to fetch alerts']);
        }
    }
}
