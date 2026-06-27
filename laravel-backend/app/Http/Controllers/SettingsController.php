<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserSetting;
use Illuminate\Support\Facades\Session;

class SettingsController extends Controller
{
    private $allowedSettings = [
        'notify_bus_schedule', 'notify_bus_arrival', 'notify_seat_availability',
        'text_size', 'high_contrast_mode', 'screen_reader_support',
        'share_location', 'privacy_mode', 'location_services',
        'tracking_enabled', 'stolen_device_protection'
    ];

    private $defaultSettings = [
        'notify_bus_schedule' => 1,
        'notify_bus_arrival' => 1,
        'notify_seat_availability' => 1,
        'text_size' => 'medium',
        'high_contrast_mode' => 0,
        'screen_reader_support' => 0,
        'share_location' => 0,
        'privacy_mode' => 'public',
        'location_services' => 1,
        'tracking_enabled' => 0,
        'stolen_device_protection' => 0
    ];

    public function fetch(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $settings = UserSetting::where('user_id', $userId)->first();
        if ($settings) {
            return response()->json(['success' => true, 'settings' => $settings]);
        }

        // Insert defaults if not found
        $settings = UserSetting::firstOrCreate(
            ['user_id' => $userId],
            $this->defaultSettings
        );

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function update(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $name = $request->input('setting_name', $request->input('setting', ''));
        $val = $request->input('setting_value', $request->input('value', ''));

        if (!in_array($name, $this->allowedSettings, true)) {
            return response()->json(['success' => false, 'message' => 'Invalid setting name']);
        }

        $settings = UserSetting::firstOrCreate(
            ['user_id' => $userId],
            $this->defaultSettings
        );

        $settings->$name = $val;
        if ($settings->save()) {
            return response()->json(['success' => true, 'message' => 'Setting updated']);
        }

        return response()->json(['success' => false, 'message' => 'Update failed']);
    }

    public function getPrivacy(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $settings = UserSetting::where('user_id', $userId)->first();
        if ($settings) {
            return response()->json([
                'success' => true,
                'settings' => [
                    'location_services' => (int)$settings->location_services,
                    'share_location' => (int)$settings->share_location,
                    'tracking_enabled' => (int)$settings->tracking_enabled,
                    'stolen_device_protection' => (int)$settings->stolen_device_protection,
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'settings' => [
                'location_services' => 1,
                'share_location' => 0,
                'tracking_enabled' => 0,
                'stolen_device_protection' => 0,
            ]
        ]);
    }

    public function getShareLocation(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $settings = UserSetting::where('user_id', $userId)->first();
        return response()->json([
            'success' => true,
            'share_location' => (int)($settings->share_location ?? 0)
        ]);
    }

    public function submitFeedback(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'User not logged in'], 401);
        }

        $rating = $request->input('rating');
        $feedbackText = $request->input('feedback');

        if (empty($rating) || (int)$rating < 1) {
            return response()->json(['success' => false, 'message' => 'Please select at least 1 star rating']);
        }

        try {
            \App\Models\Feedback::create([
                'user_id' => $userId,
                'rating' => $rating,
                'feedback_text' => $feedbackText,
            ]);

            return response()->json(['success' => true, 'message' => 'Feedback submitted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to submit feedback: ' . $e->getMessage()]);
        }
    }
}
