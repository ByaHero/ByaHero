<?php
require_once __DIR__ . '/../auth_passenger.php';
require_once __DIR__ . '/../../../config/db.php';
$conn = db();

$userId = $_SESSION['user_id'];
$message = '';
$error = '';

// Handle Edit Profile Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_profile') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    
    // Fetch current user data for profile image comparison/removal
    $stmt = $conn->prepare("SELECT profile_picture FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userData = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    // Validation
    if (empty($name)) {
        $error = "Name is required.";
    } elseif (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Valid email is required.";
    } else {
        // Check if email is already taken by another user
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->bind_param("si", $email, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $error = "Email is already in use by another account.";
        } else {
            $conn->begin_transaction();
            try {
                // Update user data
                $stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
                $stmt->bind_param("ssi", $name, $email, $userId);
                $stmt->execute();
                $stmt->close();

                // Handle Profile Picture Removal
                if (isset($_POST['remove_image']) && $_POST['remove_image'] === '1') {
                    if (!empty($userData['profile_picture'])) {
                        $oldPath = __DIR__ . '/../../../' . $userData['profile_picture'];
                        if (file_exists($oldPath)) {
                            @unlink($oldPath);
                        }
                        
                        $updateImgStmt = $conn->prepare("UPDATE users SET profile_picture = NULL WHERE id = ?");
                        $updateImgStmt->bind_param("i", $userId);
                        $updateImgStmt->execute();
                        $updateImgStmt->close();
                        $userData['profile_picture'] = null;
                    }
                }
                // Handle Profile Picture Upload (only if not removing)
                elseif (isset($_POST['profile_image_data']) && !empty($_POST['profile_image_data'])) {
                    $imgData = $_POST['profile_image_data'];
                    
                    // Directly save the base64 data URI in the database
                    if (strpos($imgData, 'data:image/') === 0) {
                        $updateImgStmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
                        $updateImgStmt->bind_param("si", $imgData, $userId);
                        $updateImgStmt->execute();
                        $updateImgStmt->close();

                        // Delete old file if it was a legacy local file path
                        if (!empty($userData['profile_picture']) && strpos($userData['profile_picture'], 'data:') !== 0) {
                            $oldPath = __DIR__ . '/../../../' . $userData['profile_picture'];
                            if (file_exists($oldPath)) {
                                @unlink($oldPath);
                            }
                        }
                        $userData['profile_picture'] = $imgData;
                    } else {
                        throw new Exception("Invalid image data format.");
                    }
                }

                $conn->commit();
                
                // Update session
                $_SESSION['user_name'] = $name;
                $_SESSION['user_email'] = $email;
                $_SESSION['user_profile_picture'] = $userData['profile_picture'] ?? null;
                
                $message = "Profile updated successfully!";
            } catch (Exception $e) {
                $conn->rollback();
                $error = $e->getMessage();
            }
        }
    }
}

// Fetch fresh user data from DB for display
$stmt = $conn->prepare("SELECT name, email, profile_picture FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$userData = $stmt->get_result()->fetch_assoc();
$stmt->close();

$userName = $userData['name'] ?? $_SESSION['user_name'] ?? '';
$userEmail = $userData['email'] ?? $_SESSION['user_email'] ?? '';
$userProfilePic = $userData['profile_picture'] ?? $_SESSION['user_profile_picture'] ?? null;
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Account Settings - ByaHero</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <link rel="stylesheet" href="../../../assets/css/accessibility.css">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      padding-bottom: 80px;
    }

    /* Interactive Avatar Picker Styles */
    .profile-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background-color: #ffffff;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: bold;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid #1e3a8a;
      transition: transform 0.2s;
    }
    .profile-avatar:hover {
      transform: scale(1.02);
    }
    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-avatar .overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.5);
      color: white;
      font-size: 8px;
      padding: 2px 0;
      text-align: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .profile-avatar:hover .overlay {
      opacity: 1;
    }
  </style>
</head>

<body class="bg-light">
  <?php
  $pageTitle = 'Profile'; 
  $pageType = 'settings';
  $backLink = 'profile.php';
  $pageDepth = "../../../";
  
  require_once "../../../components/navbarPassenger.php";
  ?>

  <div class="container mt-5 pt-4 px-3" style="max-width: 600px;">

    <h4 class="fw-bold text-primary mb-1">Account Settings</h4>
    <p class="text-muted small mb-4">Manage your account security and preferences</p>

    <?php if ($message): ?>
      <div class="alert alert-success alert-dismissible fade show rounded-3 shadow-sm" role="alert">
        <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">check_circle</span>
        <span class="align-middle"><?= htmlspecialchars($message) ?></span>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm" role="alert">
        <span class="material-symbols-rounded align-middle me-1" style="font-size: 20px;">error</span>
        <span class="align-middle"><?= htmlspecialchars($error) ?></span>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    <?php endif; ?>

    <!-- Profile Edit Form (Inline Card) -->
    <form method="POST" id="profileForm" class="card shadow-sm border border-light-subtle rounded-4 p-4 mb-4">
      <input type="hidden" name="action" value="update_profile">
      <input type="hidden" name="profile_image_data" id="profile_image_data">
      <input type="hidden" name="remove_image" id="remove_image_input" value="0">
      
      <div class="d-flex align-items-center gap-3 flex-wrap mb-2">
        <div class="profile-avatar m-0" onclick="document.getElementById('imageInput').click()">
          <span id="avatarInitial" style="<?= $userProfilePic ? 'display:none;' : '' ?>"><?= strtoupper(substr($userName ?: $userEmail, 0, 1)) ?></span>
          <?php if ($userProfilePic): ?>
            <?php 
              $isAbsolute = preg_match('~^https?://~i', $userProfilePic) || preg_match('~^data:image/~i', $userProfilePic);
              $imgSrc = $isAbsolute ? htmlspecialchars($userProfilePic) : $pageDepth . ltrim(htmlspecialchars($userProfilePic), '/');
            ?>
            <img src="<?= $imgSrc ?>" id="currentAvatar" alt="Avatar" onerror="this.style.display='none'; document.getElementById('avatarInitial').style.display='block'; document.getElementById('removePicBtn').classList.add('d-none'); document.getElementById('uploadPicBtn').classList.remove('d-none');">
          <?php endif; ?>
          <div class="overlay">CHANGE</div>
        </div>
        
        <div class="user-info flex-grow-1">
          <div class="fw-bold text-dark fs-5 leading-tight" id="displayNameText"><?= htmlspecialchars($userName ?: 'User') ?></div>
          <div class="text-muted small mb-2"><?= htmlspecialchars($userEmail) ?></div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" id="uploadPicBtn" class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 <?= !empty($userProfilePic) ? 'd-none' : '' ?>" onclick="document.getElementById('imageInput').click()">
              <span class="material-symbols-rounded" style="font-size: 16px;">add_a_photo</span>
              Add Picture
            </button>
            <button type="button" id="removePicBtn" class="btn btn-link text-danger text-decoration-none p-0 fw-semibold d-inline-flex align-items-center gap-1 <?= empty($userProfilePic) ? 'd-none' : '' ?>" style="font-size: 11px;">
              <span class="material-symbols-rounded" style="font-size: 14px;">delete</span>
              Remove Picture
            </button>
          </div>
        </div>
        
        <input type="file" id="imageInput" accept="image/*" style="display: none">
      </div>

      <div class="row g-3">
        <div class="col-12 col-sm-6">
          <label for="name" class="form-label fw-semibold text-secondary small mb-1">Full Name</label>
          <input type="text" class="form-control rounded-3" id="name" name="name" value="<?= htmlspecialchars($userName) ?>" required placeholder="Enter your full name">
        </div>

        <div class="col-12 col-sm-6">
          <label for="email" class="form-label fw-semibold text-secondary small mb-1">Email Address</label>
          <input type="email" class="form-control rounded-3" id="email" name="email" value="<?= htmlspecialchars($userEmail) ?>" required placeholder="Enter your email">
        </div>
      </div>

      <div class="d-flex justify-content-end mt-3">
        <button type="submit" class="btn btn-primary px-4 rounded-3 d-flex align-items-center gap-1">
          <span class="material-symbols-rounded" style="font-size: 18px;">save</span>
          Save Changes
        </button>
      </div>
    </form>

    <!-- Security Settings list -->
    <div class="mb-4">
      <h6 class="fw-bold text-primary mb-2 small text-uppercase tracking-wider">Security</h6>
      <div class="list-group shadow-sm border border-light-subtle rounded-3 overflow-hidden">
        <a href="changePassword" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-light-subtle">
          <div class="d-flex align-items-center gap-3">
            <span class="material-symbols-rounded text-primary fs-4">lock</span>
            <div>
              <div class="fw-semibold text-dark small">Change Password</div>
              <div class="text-muted" style="font-size: 0.75rem;">Update your password</div>
            </div>
          </div>
          <span class="material-symbols-rounded text-secondary fs-5">chevron_right</span>
        </a>
        <a href="loginActivity" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-light-subtle">
          <div class="d-flex align-items-center gap-3">
            <span class="material-symbols-rounded text-primary fs-4">history</span>
            <div>
              <div class="fw-semibold text-dark small">Login Activity</div>
              <div class="text-muted" style="font-size: 0.75rem;">Recent login sessions</div>
            </div>
          </div>
          <span class="material-symbols-rounded text-secondary fs-5">chevron_right</span>
        </a>
      </div>
    </div>

    <!-- Danger Zone settings list -->
    <div class="mb-4">
      <h6 class="fw-bold text-danger mb-2 small text-uppercase tracking-wider">Danger Zone</h6>
      <div class="list-group shadow-sm border border-danger-subtle rounded-3 overflow-hidden">
        <a href="deleteAccount" class="list-group-item list-group-item-action list-group-item-danger d-flex align-items-center justify-content-between p-3 border-danger-subtle">
          <div class="d-flex align-items-center gap-3">
            <span class="material-symbols-rounded text-danger fs-4">delete_forever</span>
            <div>
              <div class="fw-semibold text-danger small">Delete Account</div>
              <div class="text-danger-emphasis" style="font-size: 0.75rem;">Permanently remove your account data</div>
            </div>
          </div>
          <span class="material-symbols-rounded text-danger opacity-75 fs-5">chevron_right</span>
        </a>
      </div>
    </div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script>
    // Profile Picture Resizing & Upload Logic
    const imageInput = document.getElementById('imageInput');
    const profileImageData = document.getElementById('profile_image_data');
    const removeImageInput = document.getElementById('remove_image_input');
    const removePicBtn = document.getElementById('removePicBtn');
    const avatarContainer = document.querySelector('.profile-avatar');
    const uName = <?= json_encode($userName) ?>;
    const uEmail = <?= json_encode($userEmail) ?>;

    // Remove picture logic
    removePicBtn.addEventListener('click', function(e) {
        e.preventDefault();
        profileImageData.value = '';
        removeImageInput.value = '1';
        
        // Update UI to show initials
        const initial = (uName || uEmail).charAt(0).toUpperCase();
        avatarContainer.innerHTML = `<span id="avatarInitial">${initial}</span><div class="overlay">CHANGE</div>`;
        removePicBtn.classList.add('d-none');
        document.getElementById('uploadPicBtn').classList.remove('d-none');
    });

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        removeImageInput.value = '0'; // Reset remove flag

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions 800x800 for profile picture
                const max_size = 800;
                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG (quality 0.7)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                profileImageData.value = compressedDataUrl;

                // Update UI preview
                removePicBtn.classList.remove('d-none');
                document.getElementById('uploadPicBtn').classList.add('d-none');
                
                // Clear container and replace with preview image + overlay
                avatarContainer.innerHTML = '';
                const newImg = document.createElement('img');
                newImg.id = 'currentAvatar';
                newImg.src = compressedDataUrl;
                avatarContainer.appendChild(newImg);
                
                const overlay = document.createElement('div');
                overlay.className = 'overlay';
                overlay.innerText = 'CHANGE';
                avatarContainer.appendChild(overlay);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
  </script>
</body>

</html>