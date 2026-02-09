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

    // LOGIN (kept minimal)
    if ($action === 'login') {
        $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        if ($email === '' || $password === '') respond(false, 'Email and password required');

        foreach ($roleTables as $role => $table) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
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

        respond(false, 'Invalid email or password');
    }

    // SIGNUP (passengers only) -> creates user, sets session (auto-login) and returns redirect
    if ($action === 'signup') {
        $name = trim((string)($_POST['name'] ?? ''));
        $email = mb_strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm_password'] ?? '');

        if ($email === '' || $password === '' || $confirm === '') respond(false, 'Email and password required');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email');
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

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) respond(false, 'Password hashing failed');

        // Insert into users; include name if column exists
        $hasName = tableHasColumn($pdo, 'users', 'name');
        if ($hasName) {
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

    // LOGOUT
    if ($action === 'logout') {
        session_unset();
        session_destroy();
        respond(true, 'Logged out');
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