<?php
session_start();
$pageDepth = '../../../';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once '../../../config/db.php';
    try {
        $pdo = db();
        
        $user_id = $_SESSION['user_id'] ?? 0;
        $type = $_POST['itemType'] ?? 'lost';
        $item_description = $_POST['description'] ?? '';
        $bus_number = $_POST['bus_number'] ?? null;
        if (trim($bus_number) === '') {
            $bus_number = null;
        }
        
        // Setup upload directory
        $uploadDir = '../../../assets/images/uploads/lost_and_found/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $image1_path = null;
        $image2_path = null;
        
        if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $files = $_FILES['images'];
            for ($i = 0; $i < min(2, count($files['name'])); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
                    $filename = uniqid('lf_') . '.' . $ext;
                    $dest = $uploadDir . $filename;
                    if (move_uploaded_file($files['tmp_name'][$i], $dest)) {
                        $dbPath = 'assets/images/uploads/lost_and_found/' . $filename;
                        if ($i === 0) {
                            $image1_path = $dbPath;
                        } else {
                            $image2_path = $dbPath;
                        }
                    }
                }
            }
        }
        
        // Insert into database
        $stmt = $pdo->prepare("
            INSERT INTO `lost_and_found` 
            (`user_id`, `type`, `item_description`, `image1_path`, `image2_path`, `bus_number`) 
            VALUES (:user_id, :type, :item_description, :image1_path, :image2_path, :bus_number)
        ");
        
        $stmt->execute([
            ':user_id' => $user_id,
            ':type' => $type,
            ':item_description' => $item_description,
            ':image1_path' => $image1_path,
            ':image2_path' => $image2_path,
            ':bus_number' => $bus_number
        ]);
        
    } catch (Exception $e) {
        // Silently log error for prototype purposes
        error_log("DB Insert Error (lost_and_found): " . $e->getMessage());
    }
}

$pageType = 'settings';
$pageTitle = 'Submission Complete';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Complete - ByaHero</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" />
    <link rel="stylesheet" href="../../../assets/css/style.css">
    <style>
        .done-container {
            min-height: 70vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body class="bg-light">
    <?php include '../../../components/navbarPassenger.php'; ?>

    <div class="container mt-4 pt-5 pb-5 text-center done-container">
        <!-- SVG Icon -->
        <img src="../../../assets/images/DONE.svg" alt="Done" class="mb-4" style="width: 150px; height: auto;">
        
        <h3 class="fw-bold text-primary mb-5 px-3" style="font-size: 1.5rem; line-height: 1.4;">
            Thank you for your<br>submission
        </h3>

        <a href="../../../public/passenger/index.php" class="btn btn-primary rounded-pill fw-bold shadow-sm" style="padding-left: 60px; padding-right: 60px; padding-top: 10px; padding-bottom: 10px; font-size: 1.1rem;">
            Back
        </a>
    </div>

    <!-- Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
