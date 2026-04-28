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
        $password = (string)($_POST['password'] ?? '');
        if ($password === '') respond(false, 'Password required for confirmation');

        $role = $_SESSION['user_role'];
        $userId = (int)$_SESSION['user_id'];
        $table = $roleTables[$role] ?? 'users';

        $stmt = $pdo->prepare("SELECT password FROM {$table} WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) respond(false, 'Account not found');

        // Verify password
        if (!password_verify($password, $row['password'])) {
            respond(false, 'Incorrect password');
        }

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

    respond(false, 'Unsupported action');

} catch (\Throwable $e) {
    // In development use debug mode: call endpoint with ?debug=1 to see error message.
    $debug = (isset($_GET['debug']) && $_GET['debug'] === '1') || (isset($_REQUEST['debug']) && $_REQUEST['debug'] === '1');
    if ($debug) {
        respond(false, 'Server error: ' . $e->getMessage());
    }
    respond(false, 'Server error');
}