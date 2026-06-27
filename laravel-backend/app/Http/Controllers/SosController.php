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
        $userId = Session::get('user_id');
        $senderName = Session::get('user_name', 'A user');

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in']);
        }

        $recipients = $request->input('recipients', []);
        $locationText = trim($request->input('location_text', ''));

        // If recipients list is empty, fetch all members of the sender's circle
        if (empty($recipients) || !is_array($recipients)) {
            $recipients = [];
            $circle = Circle::where('owner_user_id', $userId)->first();
            if ($circle) {
                $recipients = CircleMember::where('circle_id', $circle->id)
                    ->pluck('user_id')
                    ->map(fn($id) => (int)$id)
                    ->toArray();
            }
        }

        if (empty($recipients)) {
            return response()->json(['success' => false, 'message' => 'No recipients provided.']);
        }

        $recipients = array_values(array_unique(array_map('intval', $recipients)));

        try {
            DB::beginTransaction();

            $validRecipients = [];
            foreach ($recipients as $recipientId) {
                if ($recipientId <= 0) continue;
                
                SosAlert::create([
                    'sender_user_id' => $userId,
                    'recipient_user_id' => $recipientId,
                    'location_text' => $locationText,
                    'status' => 'active'
                ]);
                $validRecipients[] = $recipientId;
            }

            // Look up FCM tokens for recipients
            $fcmTokens = UserFcmToken::whereIn('user_id', $validRecipients)
                ->where('fcm_token', '!=', '')
                ->pluck('fcm_token')
                ->toArray();

            DB::commit();

            // Generate self-signed JWT for FCM Bypass
            $clientEmail = env('FIREBASE_CLIENT_EMAIL', '');
            $privateKey = env('FIREBASE_PRIVATE_KEY', '');
            $projectId = env('FIREBASE_PROJECT_ID', '');

            // Decode private key if it contains literal \n characters
            $privateKey = str_replace('\n', "\n", $privateKey);

            $signedJwt = null;
            if (!empty($clientEmail) && !empty($privateKey)) {
                $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
                $now = time();
                $payload = json_encode([
                    'iss' => $clientEmail,
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => 'https://oauth2.googleapis.com/token',
                    'exp' => $now + 3600,
                    'iat' => $now
                ]);

                $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
                $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
                $signatureInput = $b64Header . "." . $b64Payload;

                @openssl_sign($signatureInput, $signature, $privateKey, "sha256WithRSAEncryption");
                $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
                $signedJwt = $signatureInput . "." . $b64Signature;
            }

            return response()->json([
                'success' => true,
                'sent_to' => $validRecipients,
                'fcm_tokens' => $fcmTokens,
                'jwt' => $signedJwt,
                'project_id' => $projectId,
                'sender_name' => $senderName,
                'location_text' => $locationText
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'System error: ' . $e->getMessage()]);
        }
    }

    public function getSosAlerts(Request $request)
    {
        $userId = Session::get('user_id');
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
