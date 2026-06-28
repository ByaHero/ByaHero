<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class ProfileController extends Controller
{
    private function checkAuth()
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            abort(response()->json(['success' => false, 'message' => 'Not logged in'], 401));
        }
        return (int)$userId;
    }

    public function getAccountSettings(Request $request)
    {
        $userId = $this->checkAuth();
        $user = User::find($userId);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'name' => $user->name ?? '',
                'email' => $user->email ?? '',
                'profile_picture' => $user->profile_picture ?? ''
            ]
        ]);
    }

    public function updateAccountSettings(Request $request)
    {
        $userId = $this->checkAuth();
        $user = User::find($userId);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $name = trim((string)$request->input('name', ''));
        $email = trim((string)$request->input('email', ''));

        if (empty($name)) {
            return response()->json(['success' => false, 'error' => 'Name is required.']);
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['success' => false, 'error' => 'Valid email is required.']);
        }

        // Email duplicate check
        $exists = User::where('email', $email)->where('id', '!=', $userId)->exists();
        if ($exists) {
            return response()->json(['success' => false, 'error' => 'Email is already in use by another account.']);
        }

        try {
            DB::beginTransaction();

            $user->name = $name;
            $user->email = $email;

            if ($request->input('remove_image') === '1') {
                $user->profile_picture = null;
            } elseif ($request->has('profile_image_data')) {
                $imgData = $request->input('profile_image_data');
                if (strpos($imgData, 'data:image/') === 0) {
                    $user->profile_picture = $imgData;
                } else {
                    throw new \Exception("Invalid image data format.");
                }
            }

            $user->save();
            DB::commit();

            Session::put('user_name', $name);
            Session::put('user_email', $email);
            Session::put('user_profile_picture', $user->profile_picture);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully!',
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_picture' => $user->profile_picture
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function getLoginActivity(Request $request)
    {
        $userId = $this->checkAuth();

        try {
            $activities = DB::table('analytics_events')
                ->where('user_id', $userId)
                ->whereIn('event_type', ['login', 'logout', 'session_expired'])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'activities' => $activities
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function changePassword(Request $request)
    {
        $userId = $this->checkAuth();
        $user = User::find($userId);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $hasPassword = !empty($user->password);

        if ($request->isMethod('post')) {
            $currentPassword = $request->input('current_password', '');
            $newPassword = $request->input('new_password', '');
            $confirmPassword = $request->input('confirm_password', '');

            if ($hasPassword && empty($currentPassword)) {
                return response()->json(['success' => false, 'error' => 'Current password is required.']);
            }
            if (empty($newPassword) || empty($confirmPassword)) {
                return response()->json(['success' => false, 'error' => 'New password fields are required.']);
            }
            if (strlen($newPassword) < 6) {
                return response()->json(['success' => false, 'error' => 'New password must be at least 6 characters long.']);
            }
            if ($newPassword !== $confirmPassword) {
                return response()->json(['success' => false, 'error' => 'New passwords do not match.']);
            }

            if ($hasPassword && !Hash::check($currentPassword, $user->password)) {
                return response()->json(['success' => false, 'error' => 'Current password is incorrect.']);
            }

            try {
                $user->password = Hash::make($newPassword);
                $user->save();

                // Log change settings event to analytics
                DB::table('analytics_events')->insert([
                    'user_id' => $userId,
                    'event_type' => 'setting_changed',
                    'event_data' => json_encode(['setting' => 'Password', 'value' => 'Changed/Set']),
                    'page' => '/profile/changePassword',
                    'created_at' => now()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => $hasPassword ? 'Password changed successfully!' : 'Password set successfully!',
                    'hasPassword' => true
                ]);
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'error' => 'Failed to update password. Please try again.']);
            }
        }

        return response()->json([
            'success' => true,
            'hasPassword' => $hasPassword
        ]);
    }

    public function updatePhone(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = User::where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        $phone = $request->input('phone');
        if (empty($phone)) {
            return response()->json(['success' => false, 'message' => 'Phone number is required.'], 400);
        }

        try {
            User::where('id', $userId)->update([
                'contacts' => $phone,
                'updated_at' => now()
            ]);

            Session::put('user_contacts', $phone);

            return response()->json(['success' => true, 'message' => 'Phone number updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update phone number.']);
        }
    }

    public function deleteAccount(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = User::where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        $confirmText = $request->input('confirmText');
        if (strtolower(trim((string)$confirmText)) !== 'delete') {
            return response()->json(['success' => false, 'message' => 'Confirmation text does not match.'], 400);
        }

        try {
            DB::beginTransaction();

            // Delete associated user data first to respect foreign keys if any
            DB::table('user_locations')->where('user_id', $userId)->delete();
            DB::table('user_settings')->where('user_id', $userId)->delete();
            DB::table('waiting_passengers')->where('user_id', $userId)->delete();
            DB::table('circle_members')->where('user_id', $userId)->delete();
            DB::table('circles')->where('owner_user_id', $userId)->delete();
            
            // Delete user
            User::where('id', $userId)->delete();

            DB::commit();

            Session::flush();

            return response()->json(['success' => true, 'message' => 'Account permanently deleted.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to delete account: ' . $e->getMessage()]);
        }
    }

    public function submitReport(Request $request)
    {
        $userId = Session::get('user_id');
        $email = $request->input('email');
        if (empty($userId) && !empty($email)) {
            $userId = User::where('email', strtolower(trim($email)))->value('id');
        }

        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Please login.'], 401);
        }

        $busNumber = $request->input('bus_number');
        $reportReason = $request->input('report_reason');
        $othersDetails = $request->input('others_details');
        $contactNumber = $request->input('contact_number');

        if (empty($busNumber)) {
            return response()->json(['success' => false, 'message' => 'Bus number is required.'], 400);
        }

        if (empty($reportReason) && !empty($othersDetails)) {
            $reportReason = 'Others';
        }

        if (empty($reportReason)) {
            return response()->json(['success' => false, 'message' => 'Please select a reason for your report.'], 400);
        }

        try {
            \App\Models\Report::create([
                'user_id' => $userId,
                'bus_number' => $busNumber,
                'report_reason' => $reportReason,
                'others_details' => $othersDetails,
                'contact_number' => $contactNumber,
                'status' => 'pending'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Thank you for letting us know! Your report has been submitted and will be reviewed by our team.'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to submit report: ' . $e->getMessage()]);
        }
    }
}
