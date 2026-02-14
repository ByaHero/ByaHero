<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Safety - Emergency Contacts</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
</head>

<body style="background:#f7fafc;color:#102a43;font-family:Inter,'Segoe UI',Roboto,system-ui,-apple-system,'Helvetica Neue',Arial; padding-bottom:100px;">

  <?php
  $pageTitle = 'Safety';
  $backLink = '../index.php';
  $pageDepth = '../../../';
  include __DIR__ . "/../../../components/navbarPassenger.php";
  ?>

  <div class="container" style="max-width:520px; margin-top:72px;">
    <!-- Header -->
    <div class="row">
      <div class="col-12">
        <div class="fw-bold" style="color:#123e6c; font-size:24px; line-height:1.2;">
          Emergency Contact
        </div>
      </div>
    </div>

    <!-- Add New (clickable image -> addNewContact.php) -->
    <div class="row mt-3">
      <div class="col-12">
        <a href="addNewContact.php"
          class="d-block text-decoration-none"
          aria-label="Add new emergency contact"
          style="border-radius:14px;">
          <img
            src="../../../assets/addNewContact.svg"
            alt="Add new contact"
            class="img-fluid shadow-sm"
            style="border-radius:14px; display:block; width: 100%; height: auto;" />
        </a>
      </div>
    </div>

    <!-- Contacts list (frontend-only examples) -->
    <div class="row mt-3">
      <div class="col-12 vstack gap-3">

        <div class="card border-0 shadow-sm" style="border-radius:14px;">
          <div class="card-body d-flex align-items-center gap-3" style="padding:14px;">
            <div class="d-flex align-items-center justify-content-center flex-shrink-0"
              style="width:70px;height:70px;border-radius:999px;background:#ff7aa2;">
              <span class="material-symbols-rounded" style="font-size:28px;color:#0b1220; font-variation-settings:'FILL' 1,'wght' 600,'opsz' 48;">
                person
              </span>
            </div>

            <div class="flex-grow-1">
              <div class="fw-bold" style="font-size:30px;">Ate</div>
              <div class="d-flex align-items-center gap-2 text-muted" style="font-size:12px;">
                <span class="material-symbols-rounded" style="font-size:16px; line-height:1;">call</span>
                <span>+63XXXXXXXXXX</span>
              </div>
            </div>

            <div class="dropdown">
              <button class="btn btn-sm btn-light border-0"
                style="width:40px;height:40px;border-radius:10px;background:transparent;"
                type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="material-symbols-rounded" style="font-size:22px; color:#102a43;">more_vert</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item" type="button">Edit</button></li>
                <li><button class="dropdown-item text-danger" type="button">Delete</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>