<?php
require_once __DIR__ . '/auth_passenger.php';

// If they already have a contact number, redirect to dashboard
if (!empty($_SESSION['user_contacts'])) {
    header("Location: index.php");
    exit;
}

$html = file_get_contents(__DIR__ . '/completeProfile.html');
$html = str_replace('../css/bootstrap.min.css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', $html);
$html = str_replace('../js/bootstrap.bundle.min.js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js', $html);
echo $html;
exit;
