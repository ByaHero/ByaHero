<?php
declare(strict_types=1);

require_once __DIR__ . '/config/db.php';

@session_start();

// If not logged in OR missing role, go to login.
// Let login decide where to send them afterwards.
if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header('Location: public/login', true, 302);
    exit;
}

switch ($_SESSION['user_role']) {
    case 'admin':
        header('Location: public/admin/admin', true, 302);
        break;

    case 'driver':
        header('Location: public/driver/dashboard', true, 302);
        break;

    case 'conductor':
        header('Location: public/conductor/conductor', true, 302);
        break;

    case 'user':
    default:
        header('Location: public/passenger/index', true, 302);
        break;
}

exit;