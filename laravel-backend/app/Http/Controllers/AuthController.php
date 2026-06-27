<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\Conductor;
use App\Models\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    private $roleTables = [
        'admin'     => Admin::class,
        'driver'    => Driver::class,
        'conductor' => Conductor::class,
        'passenger' => User::class,
    ];

    private $roleRedirects = [
        'admin'     => 'admin/admin.php',
        'driver'    => 'driver/driver.php',
        'conductor' => 'conductor/conductor.php',
        'passenger' => 'passenger/index.php',
    ];

    public function handle(Request $request)
    {
        $action = $request->input('action');

        switch ($action) {
            case 'login':
                return $this->login($request);
            case 'signup_request_otp':
                return $this->signupRequestOtp($request);
            case 'signup_verify_otp':
                return $this->signupVerifyOtp($request);
            case 'request_otp':
                return $this->requestOtp($request);
            case 'verify_otp':
                return $this->verifyOtp($request);
            case 'reset_password':
                return $this->resetPassword($request);
            case 'google_auth':
                return $this->googleAuth($request);
            case 'complete_profile':
                return $this->completeProfile($request);
            case 'change_password':
                return $this->changePassword($request);
            case 'delete_account':
                return $this->deleteAccount($request);
            default:
                return response()->json(['success' => false, 'message' => 'Invalid action: ' . $action]);
        }
    }

    public function login(Request $request)
    {
        $identifier = strtolower(trim($request->input('email', '')));
        $password = $request->input('password', '');

        if (empty($identifier) || empty($password)) {
            return response()->json(['success' => false, 'message' => 'Email/contact and password required']);
        }

        foreach ($this->roleTables as $role => $modelClass) {
            $user = null;
            if ($role === 'passenger') {
                $user = User::where('email', $identifier)->orWhere('contacts', $identifier)->first();
            } elseif ($role === 'conductor') {
                $user = Conductor::where('email', $identifier)->orWhere('contacts', $identifier)->first();
            } elseif ($role === 'driver') {
                $user = Driver::where('email', $identifier)->orWhere('contacts', $identifier)->first();
            } else {
                $user = Admin::where('email', $identifier)->orWhere('contacts', $identifier)->first();
            }

            if (!$user) {
                continue;
            }

            if (Hash::check($password, $user->password)) {
                // Password match (Hashed)
            } elseif ($user->password === $password) {
                // Legacy plain text match, update hash
                $user->password = Hash::make($password);
                $user->save();
            } else {
                continue;
            }

            // Hydrate Laravel session
            Session::put('user_id', (int)$user->id);
            Session::put('user_email', $user->email);
            Session::put('user_role', $role);
            Session::put('user_name', $user->name ?? $user->email);
            Session::put('user_contacts', $user->contacts);
            Session::put('user_profile_picture', $user->profile_picture);

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'redirect' => $this->roleRedirects[$role],
                'user' => [
                    'id' => (int)$user->id,
                    'email' => $user->email,
                    'name' => $user->name ?? $user->email,
                    'contacts' => $user->contacts,
                    'profile_picture' => $user->profile_picture,
                ]
            ]);
        }

        return response()->json(['success' => false, 'message' => 'Invalid email/contact or password']);
    }

    public function signupRequestOtp(Request $request)
    {
        $name = trim($request->input('name', ''));
        $email = strtolower(trim($request->input('email', '')));
        $contact = trim($request->input('contacts', ''));
        $password = $request->input('password', '');
        $confirm = $request->input('confirm_password', '');

        if (empty($email) || empty($password) || empty($confirm)) {
            return response()->json(['success' => false, 'message' => 'Email and password required']);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['success' => false, 'message' => 'Invalid email address']);
        }

        $cleanContact = preg_replace('/[^0-9]/', '', $contact);
        if (!preg_match('/^(09|639)\d{9}$/', $cleanContact)) {
            return response()->json(['success' => false, 'message' => 'Please enter a valid Philippine mobile number (e.g., 09123456789)']);
        }
        $contact = $cleanContact;

        if ($password !== $confirm) {
            return response()->json(['success' => false, 'message' => 'Passwords do not match']);
        }

        if (strlen($password) < 6) {
            return response()->json(['success' => false, 'message' => 'Password must be at least 6 characters']);
        }

        foreach ($this->roleTables as $modelClass) {
            if ($modelClass::where('email', $email)->exists()) {
                return response()->json(['success' => false, 'message' => 'Email is already registered']);
            }
        }

        Session::put('pending_signup', [
            'name' => $name,
            'email' => $email,
            'contact' => $contact,
            'password' => Hash::make($password),
        ]);

        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = now()->addMinutes(10);

        PasswordReset::where('email', $email)->where('role', 'signup_otp')->delete();
        PasswordReset::create([
            'email' => $email,
            'otp_code' => $otp,
            'expires_at' => $expires,
            'role' => 'signup_otp',
        ]);

        // Simulating standard local developer mode or mail send
        return response()->json([
            'success' => true,
            'message' => 'Dev mode: OTP created.',
            'dev_otp' => $otp,
        ]);
    }

    public function signupVerifyOtp(Request $request)
    {
        $email = strtolower(trim($request->input('email', '')));
        $otp = trim($request->input('otp', ''));

        if (empty($email) || empty($otp)) {
            return response()->json(['success' => false, 'message' => 'Email and OTP are required']);
        }

        $reset = PasswordReset::where('email', $email)
            ->where('otp_code', $otp)
            ->where('role', 'signup_otp')
            ->where('expires_at', '>', now())
            ->first();

        if (!$reset) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired verification code']);
        }

        $pending = Session::get('pending_signup');
        if (!$pending || $pending['email'] !== $email) {
            return response()->json(['success' => false, 'message' => 'Session expired. Please start the signup process again.']);
        }

        $user = User::create([
            'email' => $email,
            'contacts' => $pending['contact'],
            'password' => $pending['password'],
            'name' => $pending['name'],
        ]);

        PasswordReset::where('email', $email)->where('role', 'signup_otp')->delete();
        Session::forget('pending_signup');

        Session::put('user_id', (int)$user->id);
        Session::put('user_email', $email);
        Session::put('user_role', 'passenger');
        Session::put('user_name', $user->name ?: $email);
        Session::put('user_contacts', $user->contacts);

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully!',
            'redirect' => 'passenger/showGuide/showGuide.php',
        ]);
    }

    public function requestOtp(Request $request)
    {
        $email = strtolower(trim($request->input('email', '')));
        if (empty($email)) {
            return response()->json(['success' => false, 'message' => 'Email address is required']);
        }

        $foundRole = null;
        foreach ($this->roleTables as $role => $modelClass) {
            if ($modelClass::where('email', $email)->exists()) {
                $foundRole = $role;
                break;
            }
        }

        if (!$foundRole) {
            return response()->json(['success' => false, 'message' => 'No account associated with that email']);
        }

        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = now()->addMinutes(10);

        PasswordReset::where('email', $email)->where('role', 'password_reset')->delete();
        PasswordReset::create([
            'email' => $email,
            'otp_code' => $otp,
            'expires_at' => $expires,
            'role' => 'password_reset',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dev mode: OTP created.',
            'dev_otp' => $otp,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $email = strtolower(trim($request->input('email', '')));
        $otp = trim($request->input('otp', ''));

        if (empty($email) || empty($otp)) {
            return response()->json(['success' => false, 'message' => 'Email and OTP are required']);
        }

        $reset = PasswordReset::where('email', $email)
            ->where('otp_code', $otp)
            ->where('role', 'password_reset')
            ->where('expires_at', '>', now())
            ->first();

        if (!$reset) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired verification code']);
        }

        return response()->json(['success' => true, 'message' => 'OTP verified successfully']);
    }

    public function resetPassword(Request $request)
    {
        $email = strtolower(trim($request->input('email', '')));
        $otp = trim($request->input('otp', ''));
        $newPassword = $request->input('new_password', '');

        if (empty($email) || empty($otp) || empty($newPassword)) {
            return response()->json(['success' => false, 'message' => 'All fields are required']);
        }

        $reset = PasswordReset::where('email', $email)
            ->where('otp_code', $otp)
            ->where('role', 'password_reset')
            ->where('expires_at', '>', now())
            ->first();

        if (!$reset) {
            return response()->json(['success' => false, 'message' => 'Verification code expired or invalid']);
        }

        $foundUser = null;
        $foundRoleClass = null;

        foreach ($this->roleTables as $modelClass) {
            $foundUser = $modelClass::where('email', $email)->first();
            if ($foundUser) {
                $foundRoleClass = $modelClass;
                break;
            }
        }

        if (!$foundUser) {
            return response()->json(['success' => false, 'message' => 'Account not found']);
        }

        $foundUser->password = Hash::make($newPassword);
        $foundUser->save();

        PasswordReset::where('email', $email)->where('role', 'password_reset')->delete();

        return response()->json(['success' => true, 'message' => 'Password reset successful']);
    }

    public function googleAuth(Request $request)
    {
        $credential = $request->input('credential');
        if (empty($credential)) {
            return response()->json(['success' => false, 'message' => 'Credential token missing']);
        }

        // Mock Google Verification (corresponds to legacy google auth check)
        $email = 'timothybibat654@gmail.com';
        $name = 'Timothy Irwin';
        $googleId = 'google-id-123456';

        $user = User::where('email', $email)->first();
        if (!$user) {
            $user = User::create([
                'email' => $email,
                'name' => $name,
                'password' => Hash::make(\Illuminate\Support\Str::random(16)),
                'google_id' => $googleId,
                'auth_provider' => 'google',
            ]);
        }

        Session::put('user_id', (int)$user->id);
        Session::put('user_email', $user->email);
        Session::put('user_role', 'passenger');
        Session::put('user_name', $user->name);
        Session::put('user_profile_picture', $user->profile_picture);

        return response()->json([
            'success' => true,
            'message' => 'Google Login Successful',
            'redirect' => 'passenger/index.php',
            'user' => [
                'id' => (int)$user->id,
                'email' => $user->email,
                'name' => $user->name,
                'contacts' => $user->contacts,
                'profile_picture' => $user->profile_picture,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        Session::flush();
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    public function completeProfile(Request $request)
    {
        $userId = Session::get('user_id');
        $role = Session::get('user_role');

        if (empty($userId) || empty($role)) {
            return response()->json(['success' => false, 'message' => 'Not authenticated']);
        }

        $contact = trim($request->input('contacts', ''));
        if (empty($contact)) {
            return response()->json(['success' => false, 'message' => 'Contact number is required']);
        }

        $cleanContact = preg_replace('/[^0-9]/', '', $contact);
        if (!preg_match('/^(09|639)\d{9}$/', $cleanContact)) {
            return response()->json(['success' => false, 'message' => 'Please enter a valid Philippine mobile number (e.g., 09123456789)']);
        }
        $contact = $cleanContact;

        $modelClass = $this->roleTables[$role] ?? User::class;

        // Check uniqueness
        if ($modelClass::where('contacts', $contact)->where('id', '!=', $userId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Contact number is already registered']);
        }

        $user = $modelClass::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found']);
        }

        $user->contacts = $contact;
        $user->save();

        Session::put('user_contacts', $contact);

        return response()->json([
            'success' => true,
            'message' => 'Profile completed',
            'redirect' => $this->roleRedirects[$role] ?? 'passenger/index.php'
        ]);
    }

    public function changePassword(Request $request)
    {
        $userId = Session::get('user_id');
        $role = Session::get('user_role');

        if (empty($userId) || empty($role)) {
            return response()->json(['success' => false, 'message' => 'Not authenticated']);
        }

        $current = $request->input('current_password', '');
        $new = $request->input('new_password', '');
        $confirm = $request->input('confirm_password', '');

        if (empty($new) || $new !== $confirm) {
            return response()->json(['success' => false, 'message' => 'New passwords do not match']);
        }

        if (strlen($new) < 6) {
            return response()->json(['success' => false, 'message' => 'Password must be at least 6 characters']);
        }

        $modelClass = $this->roleTables[$role] ?? User::class;
        $user = $modelClass::find($userId);

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Account not found']);
        }

        if (!Hash::check($current, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Incorrect current password']);
        }

        $user->password = Hash::make($new);
        $user->save();

        return response()->json(['success' => true, 'message' => 'Password changed']);
    }

    public function deleteAccount(Request $request)
    {
        $userId = Session::get('user_id');
        $role = Session::get('user_role');

        if (empty($userId) || empty($role)) {
            return response()->json(['success' => false, 'message' => 'Not authenticated']);
        }

        if (strtolower(trim($request->input('confirmText', ''))) !== 'delete my account') {
            return response()->json(['success' => false, 'message' => "Please type 'delete my account' exactly to confirm."]);
        }

        $modelClass = $this->roleTables[$role] ?? User::class;
        $table = (new $modelClass)->getTable();

        DB::transaction(function () use ($userId, $table) {
            DB::table('user_fcm_tokens')->where('user_id', $userId)->delete();
            DB::table('user_settings')->where('user_id', $userId)->delete();
            DB::table('user_locations')->where('user_id', $userId)->delete();
            DB::table('circle_members')->where('user_id', $userId)->delete();
            DB::table('notifications')->where('user_id', $userId)->delete();
            DB::table('feedbacks')->where('user_id', $userId)->delete();
            DB::table('reports')->where('user_id', $userId)->delete();
            DB::table('passenger_rides')->where('user_id', $userId)->delete();
            DB::table('sos_alerts')->where('sender_user_id', $userId)->orWhere('recipient_user_id', $userId)->delete();
            DB::table($table)->where('id', $userId)->delete();
        });

        Session::flush();

        return response()->json(['success' => true, 'message' => 'Account deleted successfully']);
    }
}
