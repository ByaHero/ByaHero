<?php
session_start();

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

$userId = $_SESSION['user_id'];
$userName = $_SESSION['user_name'] ?? 'User';
$userEmail = $_SESSION['user_email'] ?? '';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Download Your Data - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/images/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .download-container {
      margin-top: 70px;
      max-width: 700px;
    }
    .download-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .download-icon {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3rem;
      margin: 0 auto 1.5rem;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }
    .data-category {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .data-category h6 {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .data-category ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    .data-category li {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 0.3rem;
    }
    .btn-download-pdf {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border: none;
      padding: 0.75rem 2rem;
      font-weight: 600;
      font-size: 1.05rem;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
      transition: all 0.3s;
    }
    .btn-download-pdf:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    }
    .btn-download-pdf:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
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

  <div class="container download-container">
    <div class="download-card">
      <div class="download-icon">
        <span class="material-symbols-rounded">picture_as_pdf</span>
      </div>
      
      <h4 class="text-center fw-bold mb-1">Download Your Data</h4>
      <p class="text-center text-muted mb-4">Get a PDF copy of your information from ByaHero</p>

      <div class="alert alert-info" role="alert">
        <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">info</span>
        <strong>GDPR Compliance:</strong> You have the right to access and download your personal data at any time.
      </div>

      <h5 class="fw-bold mb-3 mt-4">📋 What's included in your PDF:</h5>

      <div class="data-category">
        <h6>
          <span class="material-symbols-rounded" style="font-size:20px; color:#3b82f6">person</span>
          Account Information
        </h6>
        <ul>
          <li>User ID and account details</li>
          <li>Name and email address</li>
          <li>Account creation date</li>
        </ul>
      </div>

      <div class="data-category">
        <h6>
          <span class="material-symbols-rounded" style="font-size:20px; color:#8b5cf6">settings</span>
          Settings & Preferences
        </h6>
        <ul>
          <li>Location services preferences</li>
          <li>Analytics and tracking settings</li>
          <li>Notification preferences</li>
          <li>Accessibility settings</li>
        </ul>
      </div>

      <div class="data-category">
        <h6>
          <span class="material-symbols-rounded" style="font-size:20px; color:#10b981">analytics</span>
          Activity History
        </h6>
        <ul>
          <li>Last 20 app activities</li>
          <li>Pages visited and features used</li>
          <li>Settings change history</li>
          <li>Activity timestamps</li>
        </ul>
      </div>

      <div class="data-category">
        <h6>
          <span class="material-symbols-rounded" style="font-size:20px; color:#f59e0b">feedback</span>
          Feedbacks & Reviews
        </h6>
        <ul>
          <li>All feedback submissions</li>
          <li>Ratings and comments</li>
          <li>Submission dates</li>
        </ul>
      </div>

      <div class="alert alert-success mt-4" role="alert">
        <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">speed</span>
        <strong>Instant Download:</strong> Your PDF will be generated and downloaded immediately. Opens on any device!
      </div>

      <div class="d-grid gap-2 mt-4">
        <button class="btn btn-primary btn-download-pdf" id="downloadBtn" onclick="downloadPDF()">
          <span class="material-symbols-rounded" style="font-size:20px; vertical-align:middle">file_download</span>
          Download PDF Now
        </button>
        <button class="btn btn-outline-secondary" onclick="window.location.href='accountSettings.php'">
          Back to Account Settings
        </button>
      </div>

      <div class="text-center mt-4">
        <small class="text-muted">
          📱 PDF works on all devices • 🖨️ Print-friendly • 📧 Easy to share
        </small>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/images/js/accessibility.js"></script>
  <script src="../../../assets/images/js/analytics.js"></script>
  <script>
    function downloadPDF() {
      // Track download request
      if (typeof analytics !== 'undefined') {
        analytics.featureUsed('Data Download - PDF Requested');
      }

      // Get button
      const btn = document.getElementById('downloadBtn');
      const originalHTML = btn.innerHTML;
      
      // Show loading state
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating PDF...';

      // Start download
      window.location.href = '../../../backend/generateDataPDF.php';

      // Reset button after 3 seconds
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 3000);
    }
  </script>
</body>
</html>