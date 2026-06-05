<?php
declare(strict_types=1);
$configPaths = [
    __DIR__ . '/config/db.php',
    __DIR__ . '/../config/db.php',
    __DIR__ . '/../../config/db.php',
];

$loaded = false;
foreach ($configPaths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Configuration error: db.php not found']);
    exit;
}

@session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: same-origin');

// Load mail configuration
$mailConfigPath = __DIR__ . '/../config/mail.php';
if (file_exists($mailConfigPath)) {
    require_once $mailConfigPath;
}

function respond(bool $ok, string $msg = '', array $extra = []): void {
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit;
}

function tableHasColumn(mysqli $conn, string $table, string $column): bool {
    $stmt = $conn->prepare(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1"
    );
    $stmt->bind_param("ss", $table, $column);
    $stmt->execute();
    return (bool)$stmt->get_result()->fetch_row();
}

// Standardized role tables mapping: role_key => table_name
$roleTables = [
    'admin'     => 'admins',
    'driver'    => 'drivers',
    'conductor' => 'conductors',
    'passenger' => 'users',
];

// Helper to get role from table name (reverse lookup)
function getRoleFromTable(string $table): string {
    global $roleTables;
    return array_search($table, $roleTables) ?: 'passenger';
}

$roleRedirects = [
    'admin'     => 'admin/admin.php',
    'driver'    => 'driver/driver.php',
    'conductor' => 'conductor/conductor.php',
    'passenger' => 'passenger/index.php',
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Invalid request method');

$action = (string)($_POST['action'] ?? '');

try {
    $conn = db();

    // LOGIN (allow email OR contact number in the same field)
    if ($action === 'login') {
        $identifierRaw = trim((string)($_POST['email'] ?? ''));
        $identifierLower = mb_strtolower($identifierRaw);
        $password = (string)($_POST['password'] ?? '');

        if ($identifierRaw === '' || $password === '') respond(false, 'Email/contact and password required');

        foreach ($roleTables as $role => $table) {
            try {
                $hasContacts = tableHasColumn($conn, $table, 'contacts');

                if ($hasContacts) {
                    $stmt = $conn->prepare("SELECT * FROM {$table} WHERE email = ? OR contacts = ? LIMIT 1");
                    $stmt->bind_param("ss", $identifierLower, $identifierRaw);
                } else {
                    $stmt = $conn->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                    $stmt->bind_param("s", $identifierLower);
                }
                $stmt->execute();
                $user = $stmt->get_result()->fetch_assoc();
            } catch (\Throwable $e) {
                continue; 
            }

            if (!$user) continue;

            $hash = $user['password'] ?? '';
            if ($hash && password_verify($password, $hash)) {
                // ok
            } elseif ($hash === $password) {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                try { 
                    $up = $conn->prepare("UPDATE {$table} SET password = ? WHERE id = ?");
                    $up->bind_param("si", $newHash, $user['id']);
                    $up->execute();
                } catch (\Throwable $ignore) {}
            } else {
                continue;
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['user_email'] = $user['email'] ?? '';
            $_SESSION['user_role'] = $role;
            $_SESSION['user_name'] = $user['name'] ?? $user['email'] ?? '';
            $_SESSION['user_contacts'] = $user['contacts'] ?? '';
            $_SESSION['user_profile_picture'] = $user['profile_picture'] ?? null;

            respond(true, 'Login successful', ['redirect' => ($roleRedirects[$role] ?? null)]);
        }

        respond(false, 'Invalid email/contact or password');
    }

    // ── STEP 1 of 2: Validate signup fields, send OTP ──
    if ($action === 'signup_request_otp') {
        $name    = trim((string)($_POST['name']             ?? ''));
        $email   = mb_strtolower(trim((string)($_POST['email']    ?? '')));
        $contact = trim((string)($_POST['contacts']         ?? ''));
        $password = (string)($_POST['password']             ?? '');
        $confirm  = (string)($_POST['confirm_password']     ?? '');

        if ($email === '' || $password === '' || $confirm === '') respond(false, 'Email and password required');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))           respond(false, 'Invalid email address');
        
        $cleanContact = preg_replace('/[^0-9]/', '', $contact);
        if (!preg_match('/^(09|639)\d{9}$/', $cleanContact)) {
            respond(false, 'Please enter a valid Philippine mobile number (e.g., 09123456789)');
        }
        $contact = $cleanContact;

        if ($password !== $confirm) respond(false, 'Passwords do not match');
        if (mb_strlen($password) < 6) respond(false, 'Password must be at least 6 characters');

        foreach ($roleTables as $table) {
            $chk = $conn->prepare("SELECT id FROM {$table} WHERE email = ? LIMIT 1");
            $chk->bind_param("s", $email);
            $chk->execute();
            if ($chk->get_result()->fetch_assoc()) respond(false, 'Email is already registered');
        }

        $_SESSION['pending_signup'] = [
            'name'     => $name,
            'email'    => $email,
            'contact'  => $contact,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ];

        $otp     = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', time() + 600); 

        $conn->prepare("DELETE FROM password_resets WHERE email = ? AND role = 'signup_otp'")->bind_param("s", $email);
        $ins = $conn->prepare("INSERT INTO password_resets (email, otp_code, expires_at, role) VALUES (?, ?, ?, 'signup_otp')");
        $ins->bind_param("sss", $email, $otp, $expires);
        $ins->execute();

        if (function_exists('sendOTPEmail')) {
            $mailRes = sendOTPEmail($email, $otp, 'signup');
            if (!$mailRes['success']) {
                if (strpos($mailRes['message'], 'not configured') !== false || strpos($mailRes['message'], 'SMTP Key') !== false) {
                    respond(true, 'Dev mode: OTP created.', ['dev_otp' => $otp]);
                }
                respond(false, 'Email service error: ' . $mailRes['message']);
            }
            respond(true, 'Verification code sent to your email.');
        } else {
            respond(true, 'Dev mode: mail.php missing.', ['dev_otp' => $otp]);
        }
    }

    // ── STEP 2 of 2: Verify OTP → create account ──
    if ($action === 'signup_verify_otp') {
        $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
        $otp   = trim((string)($_POST['otp'] ?? ''));

        if ($email === '' || $otp === '') respond(false, 'Email and OTP are required');

        $stmt = $conn->prepare(
            "SELECT id FROM password_resets
             WHERE email = ? AND otp_code = ? AND role = 'signup_otp' AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->bind_param("ss", $email, $otp);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) respond(false, 'Invalid or expired verification code');

        $pending = $_SESSION['pending_signup'] ?? null;
        if (!$pending || $pending['email'] !== $email) {
            respond(false, 'Session expired. Please start the signup process again.');
        }

        $name    = $pending['name'];
        $contact = $pending['contact'];
        $hash    = $pending['password'];

        $ins = $conn->prepare("INSERT INTO users (email, contacts, password, name, created_at) VALUES (?, ?, ?, ?, NOW())");
        $ins->bind_param("ssss", $email, $contact, $hash, $name);
        if (!$ins->execute()) respond(false, 'Database error during signup');

        $newId = (int)$conn->insert_id;
        $conn->prepare("DELETE FROM password_resets WHERE email = ? AND role = 'signup_otp'")->bind_param("s", $email);
        unset($_SESSION['pending_signup']);

        session_regenerate_id(true);
        $_SESSION['user_id']       = $newId;
        $_SESSION['user_email']    = $email;
        $_SESSION['user_role']     = 'passenger';
        $_SESSION['user_name']     = $name !== '' ? $name : $email;
        $_SESSION['user_contacts'] = $contact;

        respond(true, 'Account created successfully!', ['redirect' => 'passenger/showGuide/showGuide.php']);
    }

    // COMPLETE PROFILE
    if ($action === 'complete_profile') {
        if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) respond(false, 'Not authenticated');
        
        $contact = trim((string)($_POST['contacts'] ?? ''));
        if ($contact === '') respond(false, 'Contact number is required');

        $cleanContact = preg_replace('/[^0-9]/', '', $contact);
        if (!preg_match('/^(09|639)\d{9}$/', $cleanContact)) {
            respond(false, 'Please enter a valid Philippine mobile number (e.g., 09123456789)');
        }
        $contact = $cleanContact;

        $role = $_SESSION['user_role'];
        $table = $roleTables[$role] ?? 'users';
        $userId = (int)$_SESSION['user_id'];

        // Check uniqueness
        $chk = $conn->prepare("SELECT id FROM {$table} WHERE contacts = ? AND id != ? LIMIT 1");
        $chk->bind_param("si", $contact, $userId);
        $chk->execute();
        if ($chk->get_result()->fetch_assoc()) respond(false, 'Contact number is already registered');

        $up = $conn->prepare("UPDATE {$table} SET contacts = ? WHERE id = ?");
        $up->bind_param("si", $contact, $userId);
        $up->execute();
        
        $_SESSION['user_contacts'] = $contact;
        respond(true, 'Profile completed', ['redirect' => $roleRedirects[$role] ?? 'passenger/index.php']);
    }

    // CHANGE PASSWORD
    if ($action === 'change_password') {
        if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) respond(false, 'Not authenticated');
        $current = (string)($_POST['current_password'] ?? '');
        $new = (string)($_POST['new_password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');
        if ($new === '' || $new !== $confirm) respond(false, 'New passwords do not match');
        if (mb_strlen($new) < 6) respond(false, 'Password must be at least 6 characters');

        $role = $_SESSION['user_role'];
        $table = $roleTables[$role] ?? 'users';
        $stmt = $conn->prepare("SELECT password FROM {$table} WHERE id = ? LIMIT 1");
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        
        if (!$user) respond(false, 'Account not found');
        if (!password_verify($current, $user['password'])) respond(false, 'Incorrect current password');

        $newHash = password_hash($new, PASSWORD_DEFAULT);
        $up = $conn->prepare("UPDATE {$table} SET password = ? WHERE id = ?");
        $up->bind_param("si", $newHash, $_SESSION['user_id']);
        $up->execute();
        respond(true, 'Password changed');
    }

    // DELETE ACCOUNT
    if ($action === 'delete_account') {
        if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) respond(false, 'Not authenticated');
        if (strtolower(trim((string)($_POST['confirmText'] ?? ''))) !== 'delete my account') {
            respond(false, "Please type 'delete my account' exactly to confirm.");
        }

        $role = $_SESSION['user_role'];
        $userId = (int)$_SESSION['user_id'];
        $table = $roleTables[$role] ?? 'users';

        // [FIX] Execute the deletion statements (they were missing execute() calls)
        // Also cleanup all related user data for a "real" deletion
        
        $queries = [
            "DELETE FROM user_fcm_tokens WHERE user_id = ?",
            "DELETE FROM emergency_contacts WHERE user_id = ?",
            "DELETE FROM user_settings WHERE user_id = ?",
            "DELETE FROM user_locations WHERE user_id = ?",
            "DELETE FROM circle_members WHERE user_id = ?",
            "DELETE FROM notifications WHERE user_id = ?",
            "DELETE FROM feedbacks WHERE user_id = ?",
            "DELETE FROM reports WHERE user_id = ?",
            "DELETE FROM passenger_rides WHERE user_id = ?",
            "DELETE FROM sos_alerts WHERE sender_user_id = ? OR recipient_user_id = ?",
            "DELETE FROM {$table} WHERE id = ?"
        ];

        foreach ($queries as $q) {
            $st = $conn->prepare($q);
            if (strpos($q, 'OR') !== false) {
                $st->bind_param("ii", $userId, $userId);
            } else {
                $st->bind_param("i", $userId);
            }
            $st->execute();
            $st->close();
        }

        // Also delete circles owned by this user
        $stCircle = $conn->prepare("DELETE FROM circles WHERE owner_user_id = ?");
        $stCircle->bind_param("i", $userId);
        $stCircle->execute();
        $stCircle->close();

        session_unset();
        session_destroy();
        respond(true, 'Account deleted', ['redirect' => 'accountDeleted.php']);
    }

    // GOOGLE AUTH
    if ($action === 'google_auth') {
        $credential = $_POST['credential'] ?? '';
        if (empty($credential)) respond(false, 'Google credential missing');

        $parts = explode('.', $credential);
        if (count($parts) !== 3) respond(false, 'Invalid format');
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
        
        if (!$payload || !isset($payload['email'])) respond(false, 'Invalid token payload');
        if (isset($payload['exp']) && $payload['exp'] < time()) respond(false, 'Token expired');

        $email = mb_strtolower(trim($payload['email']));
        $googleId = $payload['sub'] ?? '';
        $name = $payload['name'] ?? '';
        $profilePic = $payload['picture'] ?? null;
        
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if ($user) {
            $up = $conn->prepare("UPDATE users SET google_id = ?, auth_provider = 'google', profile_picture = COALESCE(profile_picture, ?) WHERE id = ?");
            $up->bind_param("ssi", $googleId, $profilePic, $user['id']);
            $up->execute();

            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = 'passenger';
            $_SESSION['user_name'] = !empty($user['name']) ? $user['name'] : $name;
            $_SESSION['user_profile_picture'] = !empty($user['profile_picture']) ? $user['profile_picture'] : $profilePic;
            $_SESSION['user_contacts'] = $user['contacts'] ?? '';
            
            respond(true, 'Login successful', ['redirect' => $roleRedirects['passenger']]);
        } else {
            $ins = $conn->prepare("INSERT INTO users (email, password, google_id, auth_provider, name, profile_picture, created_at) VALUES (?, '', ?, 'google', ?, ?, NOW())");
            $ins->bind_param("ssss", $email, $googleId, $name, $profilePic);
            $ins->execute();

            $newId = (int)$conn->insert_id;
            $_SESSION['user_id'] = $newId;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'passenger';
            $_SESSION['user_name'] = $name;
            $_SESSION['user_contacts'] = '';
            $_SESSION['user_profile_picture'] = $profilePic;

            respond(true, 'Signup successful', ['redirect' => 'passenger/completeProfile.php']);
        }
    }

    // FORGOT PASSWORD
    if ($action === 'request_otp') {
        $email = trim((string)($_POST['email'] ?? ''));
        if ($email === '') respond(false, 'Email is required');

        $foundTable = null;
        foreach ($roleTables as $table) {
            $stmt = $conn->prepare("SELECT id FROM {$table} WHERE email = ? LIMIT 1");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) {
                $foundTable = $table;
                break;
            }
        }

        if (!$foundTable) {
            usleep(200000); 
            respond(false, 'Email not found');
        }

        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', time() + 900); 

        $ins = $conn->prepare("INSERT INTO password_resets (email, otp_code, expires_at, role) VALUES (?, ?, ?, ?)");
        $ins->bind_param("ssss", $email, $otp, $expires, $foundTable);
        $ins->execute();

        if (function_exists('sendOTPEmail')) {
            $mailRes = sendOTPEmail($email, $otp);
            if (!$mailRes['success'] && (strpos($mailRes['message'], 'configured') !== false)) {
                respond(true, 'Dev Mode: OTP created.', ['dev_otp' => $otp]);
            }
            respond($mailRes['success'], $mailRes['message']);
        } else {
            respond(true, 'Dev Mode: OTP created.', ['dev_otp' => $otp]);
        }
    }

    if ($action === 'verify_otp') {
        $email = trim((string)($_POST['email'] ?? ''));
        $otp = trim((string)($_POST['otp'] ?? ''));
        $stmt = $conn->prepare("SELECT id FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->bind_param("ss", $email, $otp);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) respond(false, 'Invalid or expired OTP');
        respond(true, 'OTP verified');
    }

    if ($action === 'reset_password') {
        $email = trim((string)($_POST['email'] ?? ''));
        $otp = trim((string)($_POST['otp'] ?? ''));
        $newPass = trim((string)($_POST['new_password'] ?? ''));
        
        $stmt = $conn->prepare("SELECT role FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->bind_param("ss", $email, $otp);
        $stmt->execute();
        $reset = $stmt->get_result()->fetch_assoc();
        if (!$reset) respond(false, 'Invalid or expired OTP');

        $table = $reset['role'] ?: 'users';
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        $up = $conn->prepare("UPDATE {$table} SET password = ? WHERE email = ?");
        $up->bind_param("ss", $hash, $email);
        $up->execute();

        $conn->prepare("DELETE FROM password_resets WHERE email = ?")->bind_param("s", $email);
        respond(true, 'Password successfully reset');
    }

    respond(false, 'Unsupported action');

} catch (\Throwable $e) {
    error_log('Auth API Error: ' . $e->getMessage());
    respond(false, 'An internal server error occurred.');
}