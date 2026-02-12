<?php
session_start();

// Mock data (Replace with your actual session logic)
$currentUser = [
    'name' => $_SESSION['user_name'] ?? 'Name Name',
    'phone' => '+63 911XXXXXX',
    'email' => $_SESSION['user_email'] ?? 'yourname@gmail.com'
];
?>
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Profile - ByaHero</title>

    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        :root {
            --bs-primary: #0d47a1;
            --bs-blue-border: #2196f3;
            --bs-bg-light: #f3f4f6;
        }

        body {
            font-family: "Segoe UI", sans-serif;
            background-color: #fff;
            padding-bottom: 80px; 
        }

        /* HEADER */
        .profile-header {
            background-color: var(--bs-primary);
            color: white;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .header-title {
            font-size: 1.1rem;
            margin: 0;
            font-weight: 500;
        }

        /* PROFILE IDENTITY */
        .profile-identity {
            background-color: white;
            padding: 20px 0 30px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .avatar-circle {
            width: 80px;
            height: 80px;
            background-color: #d1d5db;
            border-radius: 50%;
        }

        .user-name-text {
            color: var(--bs-primary);
            font-weight: 700;
            font-size: 1.25rem;
        }

        /* CONTENT SHEET */
        .content-sheet {
            background-color: #eff1f5;
            border-top-left-radius: 25px;
            border-top-right-radius: 25px;
            min-height: calc(100vh - 150px);
            padding: 25px 20px;
        }

        .section-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #374151;
            margin-bottom: 10px;
            padding-left: 5px;
        }

        /* CARDS */
        .custom-card {
            background-color: white;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 12px;
            border: 1px solid transparent;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            display: flex;
            align-items: center;
            gap: 15px;
            text-decoration: none;
            color: inherit;
            transition: background-color 0.2s;
        }

        .custom-card:active {
            background-color: #f0f0f0;
        }

        .card-active {
            border: 1.5px solid var(--bs-blue-border);
            background-color: #f8fbff;
        }

        .card-icon {
            color: #1f2937;
            font-size: 24px;
        }

        .card-label {
            font-size: 0.75rem;
            color: #6b7280;
            margin: 0;
            line-height: 1.2;
        }

        .card-value {
            font-size: 0.95rem;
            font-weight: 600;
            color: #000;
            margin: 0;
            line-height: 1.2;
        }
    </style>
</head>

<body>

    <div class="profile-header">
        <span class="material-symbols-rounded" style="cursor: pointer; font-size: 28px;" onclick="history.back()">close</span>
        <h1 class="header-title">Profile</h1>
    </div>

    <div class="profile-identity">
        <div class="avatar-circle"></div>
        <div class="user-name-text"><?php echo htmlspecialchars($currentUser['name']); ?></div>
    </div>

    <div class="content-sheet">
        
        <div class="section-label">Account Details</div>

        <div class="custom-card card-active">
            <span class="material-symbols-rounded card-icon">call</span>
            <div>
                <p class="card-label">Phone Number</p>
                <p class="card-value"><?php echo htmlspecialchars($currentUser['phone']); ?></p>
            </div>
        </div>

        <div class="custom-card">
            <span class="material-symbols-rounded card-icon">mail</span>
            <div>
                <p class="card-label">Email Address</p>
                <p class="card-value"><?php echo htmlspecialchars($currentUser['email']); ?></p>
            </div>
        </div>

        <div class="mt-4"></div>

        <div class="section-label">Account Management</div>

        <a href="#" class="custom-card">
            <span class="material-symbols-rounded card-icon">delete</span>
            <div class="d-flex align-items-center h-100">
                <p class="card-value">Delete Account</p>
            </div>
        </a>

        <a href="#" class="custom-card">
            <span class="material-symbols-rounded card-icon">map</span>
            <div class="d-flex align-items-center h-100">
                <p class="card-value">Send Location Feedback</p>
            </div>
        </a>

        <a href="../../logout.php" class="custom-card">
            <span class="material-symbols-rounded card-icon text-danger">logout</span>
            <div class="d-flex align-items-center h-100">
                <p class="card-value text-danger">Log Out</p>
            </div>
        </a>

    </div>

    <div class="fixed-bottom" style="z-index: 1050;">
        <?php include __DIR__ . "/../../../components/navbarPassenger.php"; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

