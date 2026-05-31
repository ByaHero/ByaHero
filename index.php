<?php
declare(strict_types=1);

session_start();

// If not logged in OR missing role, go to login.
// Let login decide where to send them afterwards.
if (empty($_SESSION['user_id']) || empty($_SESSION['user_role'])) {
    header('Location: public/login.php', true, 302);
    exit;
}

switch ($_SESSION['user_role']) {
    case 'admin':
        header('Location: public/admin/admin.php', true, 302);
        break;

    case 'driver':
        header('Location: public/driver/dashboard.php', true, 302);
        break;

    case 'conductor':
        header('Location: public/conductor/conductor.php', true, 302);
        break;

    case 'user':
    default:
        header('Location: public/passenger/index.php', true, 302);
        break;
}

exit;