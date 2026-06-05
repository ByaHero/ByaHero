<?php
require_once __DIR__ . '/../auth_passenger.php';

require_once '../../../config/db.php';
$conn = db();

$userId = $_SESSION['user_id'];
$message = '';
$error = '';

// Fetch current user data
$stmt = $conn->prepare("SELECT name, email, profile_picture FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$userData = $result->fetch_assoc();
$stmt->close();

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    
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
                
                // Update local data for display
                $userData['name'] = $name;
                $userData['email'] = $email;
            } catch (Exception $e) {
                $conn->rollback();
                $error = $e->getMessage();
            }
        }
    }
}
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
  <title>Edit Profile - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .edit-container {
      margin-top: 70px;
      max-width: 600px;
    }
    .profile-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
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
    .conn-commit-success {
      color: #059669;
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
  $pageType = 'settings';
  $backLink = 'accountSettings.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container edit-container">
    <div class="profile-card">
      <div class="profile-avatar" onclick="document.getElementById('imageInput').click()">
        <?php if (!empty($userData['profile_picture'])): ?>
            <?php 
                $isAbsolute = preg_match('~^(https?:|data:)~i', $userData['profile_picture']);
                $imgSrc = $isAbsolute ? htmlspecialchars($userData['profile_picture']) : $pageDepth . ltrim(htmlspecialchars($userData['profile_picture']), '/');
            ?>
            <img src="<?= $imgSrc ?>" id="currentAvatar" alt="Avatar">
        <?php else: ?>
            <span id="avatarInitial"><?= strtoupper(substr($userData['name'] ?: $userData['email'], 0, 1)) ?></span>
        <?php endif; ?>
        <div class="overlay">CHANGE</div>
      </div>
      
      <div class="text-center">
          <a href="#" id="removePicBtn" class="remove-pic-btn" style="<?= empty($userData['profile_picture']) ? 'display:none' : '' ?>">
              <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
              Remove Picture
          </a>
      </div>

      <input type="file" id="imageInput" accept="image/*" style="display: none">
      
      <h4 class="text-center fw-bold mb-1 mt-3">Edit Profile</h4>
      <p class="text-center text-muted mb-4">Update your personal information</p>

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

      <form method="POST" id="profileForm">
        <input type="hidden" name="profile_image_data" id="profile_image_data">
        <input type="hidden" name="remove_image" id="remove_image_input" value="0">
        <div class="mb-3">
          <label for="name" class="form-label">Full Name</label>
          <input 
            type="text" 
            class="form-control" 
            id="name" 
            name="name" 
            value="<?= htmlspecialchars($userData['name'] ?? '') ?>" 
            required
            placeholder="Enter your full name"
          >
        </div>

        <div class="mb-3">
          <label for="email" class="form-label">Email Address</label>
          <input 
            type="email" 
            class="form-control" 
            id="email" 
            name="email" 
            value="<?= htmlspecialchars($userData['email']) ?>" 
            required
            placeholder="Enter your email"
          >
          <small class="text-muted">You'll use this email to log in</small>
        </div>

        <div class="d-grid gap-2 mt-4">
          <button type="submit" class="btn btn-primary">
            <span class="material-symbols-rounded" style="font-size:18px; vertical-align:middle">save</span>
            Save Changes
          </button>
          <button type="button" class="btn btn-outline-secondary" onclick="window.location.href='accountSettings.php'">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
  <script>
    // Smart Auto-Resize Logic
    const imageInput = document.getElementById('imageInput');
    const profileImageData = document.getElementById('profile_image_data');
    const removeImageInput = document.getElementById('remove_image_input');
    const removePicBtn = document.getElementById('removePicBtn');
    const avatarContainer = document.querySelector('.profile-avatar');
    const userName = <?= json_encode($userData['name'] ?? '') ?>;
    const userEmail = <?= json_encode($userData['email'] ?? '') ?>;

    // Remove Picture logic
    removePicBtn.addEventListener('click', function(e) {
        e.preventDefault();
        profileImageData.value = '';
        removeImageInput.value = '1';
        
        // Update UI to show initial
        const initial = (userName || userEmail).charAt(0).toUpperCase();
        avatarContainer.innerHTML = `<span id="avatarInitial">${initial}</span><div class="overlay">CHANGE</div>`;
        removePicBtn.style.display = 'none';
    });

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        removeImageInput.value = '0'; // Reset remove flag if new file selected

        // Display preview immediately
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
                let currentAvatar = document.getElementById('currentAvatar');
                removePicBtn.style.display = 'inline-flex';
                
                if (currentAvatar) {
                    currentAvatar.src = compressedDataUrl;
                } else {
                    // Replace initial with image
                    const newImg = document.createElement('img');
                    newImg.id = 'currentAvatar';
                    newImg.src = compressedDataUrl;
                    
                    // Clear container but keep the overlay
                    avatarContainer.innerHTML = '';
                    avatarContainer.appendChild(newImg);
                    const overlay = document.createElement('div');
                    overlay.className = 'overlay';
                    overlay.innerText = 'CHANGE';
                    avatarContainer.appendChild(overlay);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Track profile update
    const form = document.getElementById('profileForm');
    form.addEventListener('submit', function() {
    });
  </script>
</body>
</html>