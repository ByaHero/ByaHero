<?php
require_once __DIR__ . '/../auth_passenger.php';

require_once '../../../config/db.php';
$conn = db();

$userId = $_SESSION['user_id'];
$successMessage = '';
$errorMessage = '';

// --- Handle Phone Number Update ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_phone'])) {
    // Strip out anything that isn't a number just in case
    $newPhoneDigits = preg_replace('/[^0-9]/', '', $_POST['phone']);
    
    // Ensure it is exactly 10 digits
    if (strlen($newPhoneDigits) === 10) {
        // Concatenate the +63 prefix for the database
        $fullPhoneNumber = '+63' . $newPhoneDigits;

        $updateStmt = $conn->prepare("UPDATE users SET contacts = ? WHERE id = ?");
        $updateStmt->bind_param("si", $fullPhoneNumber, $userId);
        
        if ($updateStmt->execute()) {
            $successMessage = "Mobile number updated successfully!";
            $_SESSION['user_phone'] = $fullPhoneNumber; 
        } else {
            $errorMessage = "Failed to update mobile number. Please try again.";
        }
        $updateStmt->close();
    } else {
        $errorMessage = "Please enter exactly 10 digits (e.g., 9123456789).";
    }
}

// Fetch user data from database using the correct role table
$role = $_SESSION['user_role'] ?? 'passenger';
$table = 'users'; // Default
if ($role === 'conductor') $table = 'conductors';
if ($role === 'admin')     $table = 'admins';

$stmt = $conn->prepare("SELECT name, email, contacts, profile_picture FROM {$table} WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$userData = $result->fetch_assoc();
$stmt->close();

$currentUser = [
    'name'            => $userData['name'] ?? $_SESSION['user_name'] ?? 'User',
    'phone'           => $userData['contacts'] ?? $_SESSION['user_contacts'] ?? '',
    'email'           => $userData['email'] ?? $_SESSION['user_email'] ?? '',
    'profile_picture' => $_SESSION['user_profile_picture'] ?? $userData['profile_picture'] ?? null
];

// Helper for avatar initial
$initial = strtoupper(mb_substr($currentUser['name'], 0, 1));

// Prepare phone number for the input box (strip the +63 or 0 so they only see the 10 digits)
$displayPhoneForInput = '';
if (!empty($currentUser['phone'])) {
    $cleanPhone = preg_replace('/[^0-9]/', '', $currentUser['phone']);
    // If it has the 63 country code
    if (strlen($cleanPhone) == 12 && substr($cleanPhone, 0, 2) == '63') {
        $displayPhoneForInput = substr($cleanPhone, 2);
    } 
    // If it starts with 0 (e.g., 0912...)
    elseif (strlen($cleanPhone) == 11 && substr($cleanPhone, 0, 1) == '0') {
        $displayPhoneForInput = substr($cleanPhone, 1);
    } 
    // Fallback
    else {
        $displayPhoneForInput = substr($cleanPhone, -10);
    }
}
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Profile - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../../assets/css/accessibility.css">

    <style>
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

        /* Removed old avatar-gradient */

        .sheet {
            background-color: #eff1f5;
            border-top-left-radius: 1.5rem;
            border-top-right-radius: 1.5rem;
            min-height: calc(100vh - 150px);
        }
        
        .clickable-card {
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .clickable-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }

        /* Hide the up/down arrows in number inputs across browsers */
        input[type="tel"]::-webkit-outer-spin-button,
        input[type="tel"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
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

    <section class="text-center py-4 pt-5 mt-2">
        <div class="shadow-sm overflow-hidden" style="width: 80px; height: 80px; background-color: #ffffff; color: var(--bs-primary); display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 36px; font-weight: bold; border: 2px solid #1e3a8a; margin: 0 auto;">
            <?php if ($currentUser['profile_picture']): ?>
                <?php 
                    $isAbsolute = preg_match('~^https?://~i', $currentUser['profile_picture']);
                    $imgSrc = $isAbsolute ? htmlspecialchars($currentUser['profile_picture']) : $pageDepth . ltrim(htmlspecialchars($currentUser['profile_picture']), '/');
                ?>
                <img src="<?= $imgSrc ?>" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover;">
            <?php else: ?>
                <?= htmlspecialchars($initial) ?>
            <?php endif; ?>
        </div>

        <h2 class="h5 fw-bold mt-3 mb-0" style="color: var(--byahero-primary);">
            <?= htmlspecialchars($currentUser['name']) ?>
        </h2>
    </section>

    <main class="sheet px-3 px-sm-4 py-4">
        <div class="container-fluid p-0" style="max-width: 640px;">

            <?php if ($successMessage): ?>
                <div class="alert alert-success alert-dismissible fade show border-0 shadow-sm rounded-3" role="alert">
                    <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">check_circle</span>
                    <?= $successMessage ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <?php if ($errorMessage): ?>
                <div class="alert alert-danger alert-dismissible fade show border-0 shadow-sm rounded-3" role="alert">
                    <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">error</span>
                    <?= $errorMessage ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>

            <div class="text-uppercase fw-bold text-secondary mb-2 small">Account Details</div>

            <div class="card border-0 shadow-sm mb-3 clickable-card" data-bs-toggle="modal" data-bs-target="#editPhoneModal">
                <div class="card-body d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <span class="material-symbols-rounded fs-3 text-dark">call</span>
                        <div>
                            <div class="text-muted small">Phone Number</div>
                            <div class="fw-semibold">
                                <?= htmlspecialchars($currentUser['phone'] !== '' ? $currentUser['phone'] : 'Not set'); ?>
                            </div>
                        </div>
                    </div>
                    <span class="material-symbols-rounded text-primary">edit</span>
                </div>
            </div>

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

            <a href="accountSettings.php" class="card border-0 shadow-sm mb-3 text-decoration-none text-dark clickable-card">
                <div class="card-body d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <span class="material-symbols-rounded fs-3 text-dark">settings</span>
                        <div class="fw-semibold">Account Settings</div>
                    </div>
                    <span class="material-symbols-rounded text-muted">chevron_right</span>
                </div>
            </a>

        </div>
    </main>

    <div class="modal fade" id="editPhoneModal" tabindex="-1" aria-labelledby="editPhoneModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow rounded-4">
                <div class="modal-header border-bottom-0 pb-0">
                    <h5 class="modal-title fw-bold text-dark" id="editPhoneModalLabel">Update Phone Number</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form method="POST" action="">
                    <div class="modal-body py-4">
                        <label for="phoneInput" class="form-label text-muted small fw-semibold mb-1">Mobile Number</label>
                        
                        <div class="input-group input-group-lg shadow-sm border rounded-3 overflow-hidden">
                            <span class="input-group-text bg-light text-secondary fw-bold border-0 border-end">+63</span>
                            <input 
                                type="tel" 
                                class="form-control border-0 bg-light" 
                                id="phoneInput" 
                                name="phone" 
                                value="<?= htmlspecialchars($displayPhoneForInput) ?>" 
                                placeholder="9123456789" 
                                maxlength="10" 
                                minlength="10" 
                                pattern="[0-9]{10}"
                                title="Please enter exactly 10 digits"
                                oninput="this.value = this.value.replace(/[^0-9]/g, '');" 
                                required>
                        </div>
                        <div class="form-text mt-2 small text-muted">Enter the remaining 10 digits of your mobile number.</div>
                    </div>
                    <div class="modal-footer border-top-0 pt-0">
                        <button type="button" class="btn btn-light rounded-pill px-4 fw-medium" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" name="update_phone" class="btn text-white rounded-pill px-4 fw-medium" style="background-color: var(--byahero-primary);">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../../../assets/js/accessibility.js"></script>
</body>

</html>