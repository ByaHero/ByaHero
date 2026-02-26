<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

require_once '../../../config/db_connection.php';

$userId = $_SESSION['user_id'];
$message = '';
$error = '';

// Fetch current user data
$stmt = $conn->prepare("SELECT name, email FROM users WHERE id = ?");
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
            // Update user data
            $stmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
            $stmt->bind_param("ssi", $name, $email, $userId);
            
            if ($stmt->execute()) {
                // Update session
                $_SESSION['user_name'] = $name;
                $_SESSION['user_email'] = $email;
                
                $message = "Profile updated successfully!";
                
                // Update local data for display
                $userData['name'] = $name;
                $userData['email'] = $email;
            } else {
                $error = "Failed to update profile. Please try again.";
            }
        }
        $stmt->close();
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Edit Profile - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">
  
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
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2rem;
      font-weight: bold;
      margin: 0 auto 1.5rem;
    }
    .form-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    .form-control:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
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
      <div class="profile-avatar">
        <?= strtoupper(substr($userData['name'] ?: $userData['email'], 0, 1)) ?>
      </div>
      
      <h4 class="text-center fw-bold mb-1">Edit Profile</h4>
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

      <form method="POST">
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
  <script src="../../../assets/images/js/accessibility.css"></script>
  <script src="../../../assets/images/js/analytics.js"></script>
  <script>
    // Track profile update
    const form = document.querySelector('form');
    form.addEventListener('submit', function() {
      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Profile Updated');
      }
    });
  </script>
</body>
</html>