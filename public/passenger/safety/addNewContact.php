<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Create New Emergency Contact</title>

  <!-- Bootstrap 5 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <style>
    /* Global resets that won't conflict */
    body {
      background: linear-gradient(180deg, #eef2f7, #fff);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto;
      padding: 16px;
      padding-bottom: 100px !important; /* Space for navbar */
    }

    /* Scope all page-specific styles to .add-contact-page */
    .add-contact-page {
      --brand-blue: #1e56a4;
      --bg-soft: #f4f6fa;
      --card-shadow: 0 12px 24px rgba(16, 24, 40, .08);
      --input-shadow: 0 4px 10px rgba(16, 24, 40, .06);
    }

    /* Phone container */
    .add-contact-page .phone-frame {
      max-width: 390px;
      margin: 60px auto 0; /* Top margin for navbar */
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, .12);
      overflow: hidden;
      min-height: 720px;
    }

    /* Header - HIDDEN since we use navbar */
    .add-contact-page .app-header {
      display: none;
    }

    /* Avatar */
    .add-contact-page .avatar-camera {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: #f0f2f5;
      display: grid;
      place-items: center;
      margin: 30px auto 24px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, .08);
      border: 4px solid #fff;
      position: relative;
      z-index: 5;
    }

    .add-contact-page .avatar-camera i {
      font-size: 34px;
      color: #333;
    }

    /* Content */
    .add-contact-page .content {
      padding: 0 22px 28px;
    }

    .add-contact-page .form-card {
      background: #fff;
      border-radius: 16px;
      padding: 22px;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(0, 0, 0, .04);
    }

    .add-contact-page .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #3b4752;
      margin-bottom: 6px;
    }

    .add-contact-page .form-control,
    .add-contact-page .form-select {
      height: 46px;
      border-radius: 24px;
      padding: 10px 16px;
      border: 1px solid rgba(0, 0, 0, .08);
      box-shadow: var(--input-shadow);
    }

    .add-contact-page .form-control:focus,
    .add-contact-page .form-select:focus {
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(30, 86, 164, .15);
    }

    /* Save button */
    .add-contact-page .save-btn {
      width: 100%;
      height: 48px;
      background: var(--brand-blue);
      border: none;
      color: #fff;
      font-weight: 600;
      border-radius: 28px;
      box-shadow: 0 10px 20px rgba(30, 86, 164, .25);
    }

    .add-contact-page .save-btn:active {
      transform: translateY(1px);
    }
  </style>
</head>

<body>

<?php 
$pageTitle = 'Create Emergency Contact';
$backLink = '../safety.php';
$pageDepth = '../../../';
include __DIR__ . "/../../../components/navbarPassenger.php"; 
?>

<div class="add-contact-page">
  <div class="phone-frame">

    <!-- Avatar -->
    <div class="avatar-camera">
      <i class="bi bi-camera-fill"></i>
    </div>

    <!-- Content -->
    <div class="content">

      <div class="form-card">
        <form id="emergencyContactForm" class="row g-3">

          <div class="col-12">
            <label class="form-label">First Name</label>
            <input type="text" class="form-control" required>
          </div>

          <div class="col-12">
            <label class="form-label">Last Name</label>
            <input type="text" class="form-control">
          </div>

          <div class="col-12">
            <label class="form-label">Phone</label>
            <input type="tel" class="form-control" placeholder="+63XXXXXXXXXX">
          </div>

          <div class="col-12">
            <label class="form-label">Relative Type</label>
            <select class="form-select">
              <option selected disabled>Choose relation</option>
              <option>Parent</option>
              <option>Spouse</option>
              <option>Sibling</option>
              <option>Friend</option>
              <option>Other</option>
            </select>
          </div>

        </form>
      </div>

      <div class="mt-4">
        <button type="submit" form="emergencyContactForm" class="save-btn">
          Save Contact
        </button>
      </div>

    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>