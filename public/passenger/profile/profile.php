<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

require_once '../../../config/db_connection.php';

$userId = $_SESSION['user_id'];

// Fetch user data from database (NOW includes contacts)
$stmt = $conn->prepare("SELECT name, email, contacts FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$userData = $result->fetch_assoc();
$stmt->close();

$currentUser = [
    'name' => $userData['name'] ?? 'User',
    'phone' => $userData['contacts'] ?? '',
    'email' => $userData['email'] ?? 'user@email.com'
];

// Helper for avatar initial
$initial = strtoupper(mb_substr($currentUser['name'], 0, 1));
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Profile - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">

    <style>
        /* Keep only minimal overrides that Bootstrap doesn't provide directly */
        :root {
            --byahero-primary: #0d47a1;
        }

        body {
            font-family: "Segoe UI", sans-serif;
            padding-bottom: 80px;
            background-color: #fff;
        }

        .bg-byahero {
            background-color: var(--byahero-primary) !important;
        }

        /* Avatar gradient (not a Bootstrap utility) */
        .avatar-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        /* Sheet look (Bootstrap doesn't have exact top-only radius utility) */
        .sheet {
            background-color: #eff1f5;
            border-top-left-radius: 1.5rem;
            border-top-right-radius: 1.5rem;
            min-height: calc(100vh - 150px);
        }
    </style>
</head>

<body>
    <?php
    $pageTitle = 'Profile';
    $backLink = '../index.php';
    $pageDepth = '../../../';
    include __DIR__ . "/../../../components/navbarPassenger.php";
    ?>

    <!-- Identity -->
    <section class="text-center py-4 pt-5 mt-2">
        <div class="d-inline-flex align-items-center justify-content-center rounded-circle text-white fw-bold avatar-gradient shadow-sm"
            style="width: 80px; height: 80px; font-size: 2rem;">
            <?= htmlspecialchars($initial) ?>
        </div>

        <h2 class="h5 fw-bold mt-3 mb-0" style="color: var(--byahero-primary);">
            <?= htmlspecialchars($currentUser['name']) ?>
        </h2>
    </section>

    <!-- Content sheet -->
    <main class="sheet px-3 px-sm-4 py-4">
        <div class="container-fluid p-0" style="max-width: 640px;">

            <div class="text-uppercase fw-bold text-secondary mb-2 small">Account Details</div>

            <!-- Phone -->
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body d-flex align-items-center gap-3">
                    <span class="material-symbols-rounded fs-3 text-dark">call</span>
                    <div>
                        <div class="text-muted small">Phone Number</div>
                        <div class="fw-semibold">
                            <?= htmlspecialchars($currentUser['phone'] !== '' ? $currentUser['phone'] : 'Not set'); ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Email -->
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body d-flex align-items-center gap-3">
                    <span class="material-symbols-rounded fs-3 text-dark">mail</span>
                    <div class="text-truncate">
                        <div class="text-muted small">Email Address</div>
                        <div class="fw-semibold text-truncate">
                            <?= htmlspecialchars($currentUser['email']); ?>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-uppercase fw-bold text-secondary mb-2 small">Account Management</div>

            <!-- Account Settings -->
            <a href="accountSettings.php" class="card border-0 shadow-sm mb-3 text-decoration-none text-dark">
                <div class="card-body d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <span class="material-symbols-rounded fs-3 text-dark">settings</span>
                        <div class="fw-semibold">Account Settings</div>
                    </div>
                    <span class="material-symbols-rounded text-muted">chevron_right</span>
                </div>
            </a>

            <!-- Logout -->
            <a href="../../logout.php" class="card border-0 shadow-sm text-decoration-none">
                <div class="card-body d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <span class="material-symbols-rounded fs-3 text-danger">logout</span>
                        <div class="fw-semibold text-danger">Log Out</div>
                    </div>
                    <span class="material-symbols-rounded text-muted">chevron_right</span>
                </div>
            </a>

        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../../../assets/images/js/accessibility.js"></script>
    <script src="../../../assets/images/js/analytics.js"></script>
</body>

</html>