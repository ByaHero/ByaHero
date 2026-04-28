<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
session_start();

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
    echo json_encode(['success' => false, 'message' => 'Configuration error: db.php not found']);
    exit;
}

function respond(bool $ok, string $msg = '', array $extra = []): void {
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit;
}

function tableHasColumn(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1"
    );
    $stmt->execute([$table, $column]);
    return (bool)$stmt->fetchColumn();
}

$roleTables = [
    'admin'     => 'admins',
    'driver'    => 'drivers',
    'conductor' => 'conductors',
    'passenger' => 'users',
];

$roleRedirects = [
    'admin'     => 'admin/admin.php',
    'driver'    => 'driver/driver.php',
    'conductor' => 'conductor/conductor.php',
    'passenger' => 'passenger/index.php',
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Invalid request method');

$action = (string)($_POST['action'] ?? '');

try {
    $pdo = db();

    // LOGIN (allow email OR contact number in the same field)
    if ($action === 'login') {
        // Keep using the existing "email" field from your login form,
        // but interpret it as an identifier: email OR contact number.
        $identifierRaw = trim((string)($_POST['email'] ?? ''));
        $identifierLower = mb_strtolower($identifierRaw);
        $password = (string)($_POST['password'] ?? '');

        if ($identifierRaw === '' || $password === '') respond(false, 'Email/contact and password required');

        foreach ($roleTables as $role => $table) {
            try {
                $hasContacts = tableHasColumn($pdo, $table, 'contacts');

                if ($hasContacts) {
                    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE email = ? OR contacts = ? LIMIT 1");
                    $stmt->execute([$identifierLower, $identifierRaw]);
                } else {
                    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                    $stmt->execute([$identifierLower]);
                }
            } catch (\Throwable $e) {
                continue; // table may not exist
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) continue;

            $hash = $user['password'] ?? '';
            if ($hash && password_verify($password, $hash)) {
                // ok
            } elseif ($hash === $password) {
                // legacy plaintext fallback: rehash (best-effort)
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                try { $pdo->prepare("UPDATE {$table} SET password = ? WHERE id = ?")->execute([$newHash, $user['id']]); } catch (\Throwable $ignore) {}
            } else {
                continue;
            }

            // set session
            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['user_email'] = $user['email'] ?? '';
            $_SESSION['user_role'] = $role;
            $_SESSION['user_name'] = $user['name'] ?? $user['email'] ?? '';
            $_SESSION['user_contacts'] = $user['contacts'] ?? '';

            respond(true, 'Login successful', ['redirect' => ($roleRedirects[$role] ?? null)]);
        }

        respond(false, 'Invalid email/contact or password');
    }

    // SIGNUP (passengers only) -> creates user, sets session (auto-login) and returns redirect
    if ($action === 'signup') {
        $name = trim((string)($_POST['name'] ?? ''));
        $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
        $contact = trim((string)($_POST['contacts'] ?? '')); // from signUp.php, save into users.contacts
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');

        if ($email === '' || $password === '' || $confirm === '') respond(false, 'Email and password required');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email');

        // Require contact number (since you said it "should be in contacts")
        if ($contact === '') respond(false, 'Contact number is required');

        if ($password !== $confirm) respond(false, 'Passwords do not match');
        if (mb_strlen($password) < 6) respond(false, 'Password must be at least 6 characters');

        // Check email uniqueness across role tables (skip missing tables)
        foreach ($roleTables as $table) {
            try {
                $chk = $pdo->prepare("SELECT id FROM {$table} WHERE email = ? LIMIT 1");
                $chk->execute([$email]);
                if ($chk->fetch()) respond(false, 'Email is already registered');
            } catch (\Throwable $e) {
                // ignore missing table
            }
        }

        // Check contact uniqueness (only where contacts column exists)
        foreach ($roleTables as $table) {
            try {
                if (!tableHasColumn($pdo, $table, 'contacts')) continue;
                $chk = $pdo->prepare("SELECT id FROM {$table} WHERE contacts = ? LIMIT 1");
                $chk->execute([$contact]);
                if ($chk->fetch()) respond(false, 'Contact number is already registered');
            } catch (\Throwable $e) {
                // ignore missing table
            }
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) respond(false, 'Password hashing failed');

        // Insert into users; include optional columns if they exist
        $hasName = tableHasColumn($pdo, 'users', 'name');
        $hasContacts = tableHasColumn($pdo, 'users', 'contacts');

        if ($hasName && $hasContacts) {
            $ins = $pdo->prepare("INSERT INTO users (email, contacts, password, name, created_at) VALUES (?, ?, ?, ?, NOW())");
            $ok = $ins->execute([$email, $contact, $hash, $name !== '' ? $name : null]);
        } elseif ($hasContacts) {
            $ins = $pdo->prepare("INSERT INTO users (email, contacts, password, created_at) VALUES (?, ?, ?, NOW())");
            $ok = $ins->execute([$email, $contact, $hash]);
        } elseif ($hasName) {
            // fallback if contacts column doesn't exist yet
            $ins = $pdo->prepare("INSERT INTO users (email, password, name, created_at) VALUES (?, ?, ?, NOW())");
            $ok = $ins->execute([$email, $hash, $name !== '' ? $name : null]);
        } else {
            $ins = $pdo->prepare("INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())");
            $ok = $ins->execute([$email, $hash]);
        }

        if (!$ok) respond(false, 'Database error during signup');

        // Auto-login: set session from lastInsertId
        $newId = (int)$pdo->lastInsertId();
        $_SESSION['user_id'] = $newId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role'] = 'passenger';
        $_SESSION['user_name'] = $name !== '' ? $name : $email;
        $_SESSION['user_contacts'] = $contact;

        // Redirect passenger to passenger index
        respond(true, 'Signup successful', ['redirect' => $roleRedirects['passenger']]);
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
        $stmt = $pdo->prepare("SELECT password FROM {$table} WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) respond(false, 'Account not found');
        if (!password_verify($current, $row['password'])) respond(false, 'Incorrect current password');

        $newHash = password_hash($new, PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE {$table} SET password = ? WHERE id = ?")->execute([$newHash, $_SESSION['user_id']]);
        respond(true, 'Password changed');
    }

    // DELETE ACCOUNT
    if ($action === 'delete_account') {
        if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) respond(false, 'Not authenticated');
        $confirmText = strtolower(trim((string)($_POST['confirmText'] ?? '')));
        
        if ($confirmText !== 'delete my account') {
            respond(false, "Please type 'delete my account' exactly to confirm.");
        }

        $role = $_SESSION['user_role'];
        $userId = (int)$_SESSION['user_id'];
        $table = $roleTables[$role] ?? 'users';

        // Delete related data (best effort)
        try {
            $pdo->prepare("DELETE FROM user_fcm_tokens WHERE user_id = ?")->execute([$userId]);
        } catch (\Throwable $e) {}
        try {
            $pdo->prepare("DELETE FROM emergency_contacts WHERE user_id = ?")->execute([$userId]);
        } catch (\Throwable $e) {}
        
        // Delete the main user record
        $pdo->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$userId]);

        session_unset();
        session_destroy();
        respond(true, 'Account deleted', ['redirect' => 'accountDeleted.php']);
    }

    // GOOGLE AUTH
    if ($action === 'google_auth') {
        $credential = $_POST['credential'] ?? '';
        if (empty($credential)) respond(false, 'Google credential missing');

        // Decode JWT payload (Header.Payload.Signature)
        $parts = explode('.', $credential);
        if (count($parts) !== 3) respond(false, 'Invalid Google credential format');

        // Simple base64 decoding (for production, always verify the signature!)
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
        
        if (!$payload || !isset($payload['email'])) {
            respond(false, 'Failed to extract information from Google token');
        }

        // Must verify issuer and audience
        if (!in_array($payload['aud'], [
            '299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com',
            '299495970056-moul8j6nolsl5lvjd37atjknqvogbtcj.apps.googleusercontent.com'
        ])) {
            respond(false, 'Invalid Google Client ID audience (Received: ' . $payload['aud'] . ')');
        }
        
        if (!in_array($payload['iss'], ['accounts.google.com', 'https://accounts.google.com'])) {
            respond(false, 'Invalid token issuer');
        }

        // Verify token expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            respond(false, 'Google token has expired');
        }

        $email = mb_strtolower(trim($payload['email']));
        $googleId = $payload['sub'] ?? '';
        $name = $payload['name'] ?? '';
        $profilePic = $payload['picture'] ?? null;
        
        // 1. Check if user exists by email in the `users` table since this is mainly for passengers
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Link google_id if not linked
            try {
                $hasGoogleId = tableHasColumn($pdo, 'users', 'google_id');
                if ($hasGoogleId && empty($user['google_id'])) {
                    $pdo->prepare("UPDATE users SET google_id = ?, auth_provider = 'google' WHERE id = ?")->execute([$googleId, $user['id']]);
                }
            } catch (\Throwable $e) {}

            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = 'passenger';
            $_SESSION['user_name'] = $user['name'] ?? $name;
            $_SESSION['user_profile_picture'] = $user['profile_picture'] ?? $profilePic;
            $_SESSION['user_contacts'] = $user['contacts'] ?? '';
            
            respond(true, 'Login successful', ['redirect' => $roleRedirects['passenger']]);
        } else {
            // Create user
            $hasName = tableHasColumn($pdo, 'users', 'name');
            $hasContacts = tableHasColumn($pdo, 'users', 'contacts');
            $hasGoogleId = tableHasColumn($pdo, 'users', 'google_id');
            $hasProfilePic = tableHasColumn($pdo, 'users', 'profile_picture');

            // Building dynamic insert based on schema available
            $columns = ['email', 'created_at'];
            $placeholders = ['?', 'NOW()'];
            $values = [$email];
            
            if ($hasGoogleId) {
                $columns[] = 'google_id';
                $columns[] = 'auth_provider';
                $placeholders[] = '?';
                $placeholders[] = "'google'";
                $values[] = $googleId;
            }
            if ($hasName) {
                $columns[] = 'name';
                $placeholders[] = '?';
                $values[] = $name;
            }
            if ($hasProfilePic && $profilePic) {
                $columns[] = 'profile_picture';
                $placeholders[] = '?';
                $values[] = $profilePic;
            }
            // Add a blank contact to satisfy the previous schema if it exists
            if ($hasContacts) {
                $columns[] = 'contacts';
                $placeholders[] = '?';
                $values[] = '';
            }

            // Since password is now nullable, we omit it
            $colStr = implode(', ', $columns);
            $valStr = implode(', ', $placeholders);
            
            $ins = $pdo->prepare("INSERT INTO users ({$colStr}) VALUES ({$valStr})");
            $ok = $ins->execute($values);

            if (!$ok) respond(false, 'Database error during Google signup');

            $newId = (int)$pdo->lastInsertId();
            $_SESSION['user_id'] = $newId;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'passenger';
            $_SESSION['user_name'] = $name;
            $_SESSION['user_contacts'] = '';
            if ($hasProfilePic) {
                $_SESSION['user_profile_picture'] = $profilePic;
            }

            respond(true, 'Signup successful', ['redirect' => 'passenger/showGuide/showGuide.php']);
        }
    }

    // COMPLETE PROFILE (Force Contact Entry)
    if ($action === 'complete_profile') {
        if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
            respond(false, 'Not authenticated. Session data: ' . json_encode($_SESSION));
        }
        $contact = trim((string)($_POST['contacts'] ?? ''));
        if ($contact === '') respond(false, 'Contact number is required');

        $role = $_SESSION['user_role'];
        $table = $roleTables[$role] ?? 'users';
        $userId = (int)$_SESSION['user_id'];

        if (tableHasColumn($pdo, $table, 'contacts')) {
            // Check global uniqueness?
            $chk = $pdo->prepare("SELECT id FROM {$table} WHERE contacts = ? AND id != ? LIMIT 1");
            $chk->execute([$contact, $userId]);
            if ($chk->fetch()) respond(false, 'Contact number is already registered');

            $pdo->prepare("UPDATE {$table} SET contacts = ? WHERE id = ?")->execute([$contact, $userId]);
            $_SESSION['user_contacts'] = $contact;
            respond(true, 'Profile completed', ['redirect' => $roleRedirects[$role] ?? 'passenger/index.php']);
        }
        respond(false, 'Database error');
    }

    // FORGOT PASSWORD FLOW
    $roleTables = [
        'admins' => 'admin',
        'drivers' => 'driver',
        'conductors' => 'conductor',
        'users' => 'user'
    ];

    if ($action === 'request_otp') {
        $email = trim((string)($_POST['email'] ?? ''));
        if ($email === '') respond(false, 'Email is required');

        // Check all tables for the user
        $foundTable = null;
        foreach ($roleTables as $table => $role) {
            $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $foundTable = $table;
                break;
            }
        }

        if (!$foundTable) {
            // Delay slightly to prevent timing attacks
            usleep(200000); 
            respond(false, 'Email not found');
        }

        // Generate 6 digit code
        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', time() + 900); // 15 mins

        $pdo->prepare("INSERT INTO password_resets (email, otp_code, expires_at, role) VALUES (?, ?, ?, ?)")
            ->execute([$email, $otp, $expires, $foundTable]);

        // Simulating email send by returning the OTP directly to frontend for DEV prototype
        respond(true, 'OTP requested', ['dev_otp' => $otp]);
    }

    if ($action === 'verify_otp') {
        $email = trim((string)($_POST['email'] ?? ''));
        $otp = trim((string)($_POST['otp'] ?? ''));
        if ($email === '' || $otp === '') respond(false, 'Email and OTP are required');

        $stmt = $pdo->prepare("SELECT id FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email, $otp]);
        if (!$stmt->fetch()) {
            respond(false, 'Invalid or expired OTP code');
        }

        respond(true, 'OTP verified');
    }

    if ($action === 'reset_password') {
        $email = trim((string)($_POST['email'] ?? ''));
        $otp = trim((string)($_POST['otp'] ?? ''));
        $newPass = trim((string)($_POST['new_password'] ?? ''));
        
        if ($email === '' || $otp === '' || $newPass === '') respond(false, 'All fields are required');

        $stmt = $pdo->prepare("SELECT role FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email, $otp]);
        $resetRec = $stmt->fetch();
        if (!$resetRec) {
            respond(false, 'Invalid or expired OTP code');
        }

        $targetTable = $resetRec['role'] ?: 'users';
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        
        // Safety check to ensure targetTable is valid
        if (!array_key_exists($targetTable, $roleTables)) {
            $targetTable = 'users';
        }

        $pdo->prepare("UPDATE {$targetTable} SET password = ? WHERE email = ?")->execute([$hash, $email]);

        // Cleanup
        $pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

        respond(true, 'Password successfully reset');
    }

    respond(false, 'Unsupported action');

} catch (\Throwable $e) {
    // Always show error for debugging
    respond(false, 'Server error: ' . $e->getMessage());
}