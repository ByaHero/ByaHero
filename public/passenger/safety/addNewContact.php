<?php
// If your project uses sessions/auth, uncomment as needed:
// session_start();

$pageTitle = 'Create Emergency Contact';

// Always go back to safety.php (same folder level as this file)
$backLink  = './safety.php';

$pageDepth = '../../../';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= htmlspecialchars($pageTitle) ?></title>

  <!-- Bootstrap 5 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <style>
    body {
      background: linear-gradient(180deg, #eef2f7, #fff);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto;
      padding: 16px;
      padding-bottom: 100px !important;
    }

    .add-contact-page {
      --brand-blue: #1e56a4;
      --card-shadow: 0 12px 24px rgba(16, 24, 40, .08);
      --input-shadow: 0 4px 10px rgba(16, 24, 40, .06);
    }

    .add-contact-page .phone-frame {
      max-width: 390px;
      margin: 60px auto 0;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, .12);
      overflow: hidden;
      min-height: 720px;
    }

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

    .add-contact-page .content { padding: 0 22px 28px; }

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
    .add-contact-page .form-select,
    .add-contact-page .input-group-text {
      height: 46px;
      border-radius: 24px;
      padding: 10px 16px;
      border: 1px solid rgba(0, 0, 0, .08);
      box-shadow: var(--input-shadow);
    }

    .add-contact-page .input-group-text {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 14px;
      background: #fff;
      color: #111827;
      font-weight: 600;
      box-shadow: var(--input-shadow);
    }

    /* Make the input-group look like one pill */
    .add-contact-page .input-group .input-group-text {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    .add-contact-page .input-group .form-control {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .add-contact-page .form-control:focus,
    .add-contact-page .form-select:focus {
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(30, 86, 164, .15);
      outline: 0;
    }

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

    .add-contact-page .save-btn:active { transform: translateY(1px); }
  </style>
</head>

<body>

<?php
// Navbar include
include __DIR__ . "/../../../components/navbarPassenger.php";
?>

<div class="add-contact-page">
  <div class="phone-frame">

    <div class="avatar-camera" aria-hidden="true">
      <i class="bi bi-camera-fill"></i>
    </div>

    <div class="content">

      <div class="form-card">
        <form id="emergencyContactForm"
              class="row g-3"
              action="save_emergency_contact.php"
              method="POST">

          <div class="col-12">
            <label class="form-label" for="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" class="form-control" required>
          </div>

          <div class="col-12">
            <label class="form-label" for="last_name">Last Name</label>
            <input id="last_name" name="last_name" type="text" class="form-control">
          </div>

          <!-- Phone: user enters ONLY 10 digits (must start with 9), system submits +63XXXXXXXXXX -->
          <div class="col-12">
            <label class="form-label" for="phone_digits">Phone</label>

            <div class="input-group">
              <span class="input-group-text">+63</span>
              <input
                id="phone_digits"
                type="text"
                class="form-control"
                inputmode="numeric"
                autocomplete="tel"
                placeholder="9XXXXXXXXX"
                maxlength="10"
                pattern="^9\\d{9}$"
                required
              >
            </div>

            <!-- Hidden field that actually gets posted -->
            <input type="hidden" id="phone" name="phone" value="">

            <div class="form-text">
              Enter 10 digits starting with 9 (example: 9123456789). +63 is added automatically.
            </div>
          </div>

          <div class="col-12">
            <label class="form-label" for="relative_type">Relative Type</label>
            <select id="relative_type" name="relative_type" class="form-select" required>
              <option value="" selected disabled>Choose relation</option>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>

        </form>
      </div>

      <div class="mt-4">
        <button type="submit" form="emergencyContactForm" class="save-btn">
          Save Contact
        </button>
      </div>

      <div class="mt-3 text-center">
        <a class="text-decoration-none" href="<?= htmlspecialchars($backLink) ?>">
          <small class="text-muted">Back</small>
        </a>
      </div>

    </div>
  </div>
</div>

<script>
  (function () {
    const digitsEl = document.getElementById("phone_digits");
    const hiddenEl = document.getElementById("phone");
    if (!digitsEl || !hiddenEl) return;

    function digitsOnly10(v) {
      v = String(v || "").replace(/\D/g, "");
      return v.slice(0, 10);
    }

    function syncHidden() {
      const d = digitsOnly10(digitsEl.value);
      if (digitsEl.value !== d) digitsEl.value = d;
      hiddenEl.value = (d.length === 10) ? (`+63${d}`) : "";
    }

    digitsEl.addEventListener("input", syncHidden);

    digitsEl.addEventListener("paste", (e) => {
      e.preventDefault();
      digitsEl.value = digitsOnly10((e.clipboardData || window.clipboardData).getData("text"));
      syncHidden();
    });

    const form = digitsEl.closest("form");
    if (form) {
      form.addEventListener("submit", (e) => {
        syncHidden();
        if (!hiddenEl.value) {
          e.preventDefault();
          digitsEl.setCustomValidity("Enter 10 digits starting with 9 (e.g. 9123456789).");
          digitsEl.reportValidity();
          setTimeout(() => digitsEl.setCustomValidity(""), 0);
        }
      });
    }
  })();
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>