<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Create New Emergency Contact</title>

  <!-- Bootstrap 5 -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

  <style>
    :root{
      --brand-blue:#1e56a4;
      --bg-soft:#f4f6fa;
      --card-shadow:0 12px 24px rgba(16,24,40,.08);
      --input-shadow:0 4px 10px rgba(16,24,40,.06);
    }

    body{
      background:linear-gradient(180deg,#eef2f7,#fff);
      font-family:system-ui,-apple-system,"Segoe UI",Roboto;
      padding:16px;
    }

    /* Phone container */
    .phone-frame{
      max-width:390px;
      margin:auto;
      background:#fff;
      border-radius:20px;
      box-shadow:0 20px 50px rgba(0,0,0,.12);
      overflow:hidden;
      min-height:720px;
    }

    /* Header */
    .app-header{
      background:var(--brand-blue);
      color:#fff;
      padding:14px 16px 52px;
      position:relative;
      text-align:center;
      z-index:1;
    }

    .app-header h1{
      font-size:16px;
      font-weight:600;
      margin:0;
    }

    .close-btn{
      position:absolute;
      left:14px;
      top:12px;
      width:36px;
      height:36px;
      border-radius:10px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#d6e6ff;
    }

    /* Avatar (FIXED) */
    .avatar-camera{
      width:110px;
      height:110px;
      border-radius:50%;
      background:#f0f2f5;
      display:grid;
      place-items:center;
      margin:-55px auto 24px;
      box-shadow:0 10px 20px rgba(0,0,0,.08);
      border:4px solid #fff;
      position:relative;
      z-index:5;
    }

    .avatar-camera i{
      font-size:34px;
      color:#333;
    }

    /* Content */
    .content{
      padding:0 22px 28px;
    }

    .form-card{
      background:#fff;
      border-radius:16px;
      padding:22px;
      box-shadow:var(--card-shadow);
      border:1px solid rgba(0,0,0,.04);
    }

    .form-label{
      font-size:13px;
      font-weight:600;
      color:#3b4752;
      margin-bottom:6px;
    }

    .form-control,
    .form-select{
      height:46px;
      border-radius:24px;
      padding:10px 16px;
      border:1px solid rgba(0,0,0,.08);
      box-shadow:var(--input-shadow);
    }

    .form-control:focus,
    .form-select:focus{
      border-color:var(--brand-blue);
      box-shadow:0 0 0 3px rgba(30,86,164,.15);
    }

    /* Save button */
    .save-btn{
      width:100%;
      height:48px;
      background:var(--brand-blue);
      border:none;
      color:#fff;
      font-weight:600;
      border-radius:28px;
      box-shadow:0 10px 20px rgba(30,86,164,.25);
    }

    .save-btn:active{
      transform:translateY(1px);
    }
  </style>
</head>

<body>

<div class="phone-frame">

  <!-- Header -->
  <div class="app-header">
    <button class="btn close-btn">
      <i class="bi bi-x-lg"></i>
    </button>
    <h1>Create New Emergency Contact</h1>
  </div>

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

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
