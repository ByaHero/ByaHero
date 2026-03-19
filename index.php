<?php
declare(strict_types=1);

session_start();

// If not logged in, go to login and come back to passenger index after successful login.
if (empty($_SESSION['user_id'])) {
    header('Location: public/login.php?redirect=passenger/index.php', true, 302);
    exit;
}

// Logged in -> go to passenger entry point.
header('Location: public/passenger/index.php', true, 302);
exit;