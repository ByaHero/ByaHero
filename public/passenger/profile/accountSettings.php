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
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .account-container {
      margin-top: 70px;
      padding: 0 1rem;
    }

    .account-heading {
      font-weight: bold;
      font-size: 1.3rem;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
    }

    .account-description {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .account-section {
      margin-top: 1.5rem;
    }

    .account-section-header {
      font-weight: 600;
      color: #1e3a8a;
      margin-bottom: 0.75rem;
      font-size: 1rem;
      padding-left: 0.25rem;
    }

    .settings-item {
      padding: 16px;
      background-color: white;
      margin-bottom: 0.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e5e7eb;
    }

    .settings-item:hover {
      background: #f0f4ff;
      border-color: #c7d2fe;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .settings-item:active {
      transform: translateY(0);
    }

    .settings-item .settings-icon {
      font-size: 24px;
      margin-right: 14px;
      color: #6366f1;
      flex-shrink: 0;
    }

    .settings-item .item-label {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }

    .settings-item .item-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .settings-item .item-title {
      font-weight: 500;
      color: #1f2937;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }

    .settings-item .item-subtitle {
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .settings-item .chevron {
      color: #9ca3af;
      font-size: 20px;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .user-profile-card {
      background: white;
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid #e5e7eb;
    }

    .user-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #ffffff;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      font-weight: bold;
      flex-shrink: 0;
      border: 2px solid #1e3a8a;
      overflow: hidden;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 1.05rem;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      color: #6b7280;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-edit-profile {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-edit-profile:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      color: white;
    }

    @media (max-width: 576px) {
      .user-profile-card {
        flex-direction: column;
        text-align: center;
      }

      .user-info {
        width: 100%;
      }

      .btn-edit-profile {
        width: 100%;
      }
    }

    /* Styles for Edit Profile Modal */
    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background-color: #ffffff;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: bold;
      margin: 0 auto 1rem;
      border: 3px solid #1e3a8a;
      position: relative;
      overflow: hidden;
      cursor: pointer;
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
      font-size: 10px;
      padding: 4px 0;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .profile-avatar:hover .overlay {
      opacity: 1;
    }
    .form-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    .remove-pic-btn {
      font-size: 12px;
      color: #dc2626;
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
    }
    .remove-pic-btn:hover {
      text-decoration: underline;
      color: #b91c1c;
    }
  </style>
</head>

<body>
  <?php
  // This variable passes the name to the navbar!
  $pageTitle = 'Profile'; 
  $pageType = 'settings';
  $backLink = 'profile.php';
  $pageDepth = "../../../";
  
  // Go up 3 levels from public/passenger/profile/ to reach the root, then into components/
  require_once "../../../components/navbarPassenger.php";
  ?>

  <div class="container account-container">

    <div class="account-heading">Account Settings</div>
    <p class="account-description">Manage your account security and preferences</p>

    <?php if ($message): ?>
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">check_circle</span>
        <?= htmlspecialchars($message) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">error</span>
        <?= htmlspecialchars($error) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    <?php endif; ?>

    <form method="POST" id="profileForm" class="user-profile-card flex-column align-items-stretch gap-3">
      <input type="hidden" name="action" value="update_profile">
      <input type="hidden" name="profile_image_data" id="profile_image_data">
      <input type="hidden" name="remove_image" id="remove_image_input" value="0">
      
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div class="profile-avatar m-0" onclick="document.getElementById('imageInput').click()" style="width: 72px; height: 72px; font-size: 1.8rem; border-width: 2px;">
          <?php if ($userProfilePic): ?>
            <?php 
              $isAbsolute = preg_match('~^https?://~i', $userProfilePic);
              $imgSrc = $isAbsolute ? htmlspecialchars($userProfilePic) : $pageDepth . ltrim(htmlspecialchars($userProfilePic), '/');
            ?>
            <img src="<?= $imgSrc ?>" id="currentAvatar" alt="Avatar">
          <?php else: ?>
            <span id="avatarInitial"><?= strtoupper(substr($userName ?: $userEmail, 0, 1)) ?></span>
          <?php endif; ?>
          <div class="overlay" style="font-size: 8px; padding: 2px 0;">CHANGE</div>
        </div>
        
        <div class="user-info">
          <div class="user-name fw-bold" id="displayNameText"><?= htmlspecialchars($userName ?: 'User') ?></div>
          <div class="user-email text-muted small"><?= htmlspecialchars($userEmail) ?></div>
          <a href="#" id="removePicBtn" class="remove-pic-btn" style="<?= empty($userProfilePic) ? 'display:none;' : '' ?> font-size: 11px;">
            <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
            Remove Picture
          </a>
        </div>
        
        <input type="file" id="imageInput" accept="image/*" style="display: none">
      </div>

      <div class="row g-2 mt-1">
        <div class="col-12 col-sm-6">
          <label for="name" class="form-label small mb-1">Full Name</label>
          <input type="text" class="form-control form-control-sm rounded-3" id="name" name="name" value="<?= htmlspecialchars($userName) ?>" required placeholder="Enter your full name">
        </div>

        <div class="col-12 col-sm-6">
          <label for="email" class="form-label small mb-1">Email Address</label>
          <input type="email" class="form-control form-control-sm rounded-3" id="email" name="email" value="<?= htmlspecialchars($userEmail) ?>" required placeholder="Enter your email">
        </div>
      </div>

      <div class="d-flex justify-content-end mt-1">
        <button type="submit" class="btn btn-primary btn-sm px-4 rounded-3 d-flex align-items-center gap-1">
          <span class="material-symbols-rounded" style="font-size:16px;">save</span>
          Save Changes
        </button>
      </div>
    </form>

    <div class="account-section">
      <div class="account-section-header">Security</div>

      <div class="settings-item" onclick="window.location.href='changePassword.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">lock</span>
          <div class="item-text">
            <div class="item-title">Change Password</div>
            <div class="item-subtitle">Update your password</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron">chevron_right</span>
      </div>

      <div class="settings-item" onclick="window.location.href='loginActivity.php'">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon">history</span>
          <div class="item-text">
            <div class="item-title">Login Activity</div>
            <div class="item-subtitle">Recent login sessions</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron">chevron_right</span>
      </div>
    </div>

    <div class="account-section">
      <div class="account-section-header" style="color: #dc2626;">Danger Zone</div>
      <div class="settings-item" onclick="window.location.href='deleteAccount.php'" style="border-color: #fee2e2;">
        <div class="item-label">
          <span class="material-symbols-rounded settings-icon" style="color: #dc2626;">delete_forever</span>
          <div class="item-text">
            <div class="item-title" style="color: #dc2626;">Delete Account</div>
            <div class="item-subtitle">Permanently remove your account data</div>
          </div>
        </div>
        <span class="material-symbols-rounded chevron" style="color: #fca5a5;">chevron_right</span>
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
        removePicBtn.style.display = 'none';
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
                removePicBtn.style.display = 'inline-flex';
                
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