<?php
require_once __DIR__ . '/auth_passenger.php';

// If they already have a contact number, redirect to dashboard
if (!empty($_SESSION['user_contacts'])) {
    header('Location: index.php');
    exit;
}

$userName = $_SESSION['user_name'] ?? 'User';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="icon" href="../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>Complete Profile - ByaHero</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../assets/css/accessibility.css">
    <style>
        :root {
            --primary-blue: #1e3a8a;
            --primary-hover: #1e40af;
            --bg-color: #ffffff;
            --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --text-main: #1f2937;
            --text-muted: #6b7280;
        }
        body {
            font-family: "Segoe UI", system-ui, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
            margin: 0;
            padding: 1rem;
        }
        .container-wrapper {
            width: 100%;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .logo-container {
            margin-bottom: 2rem;
            text-align: center;
        }
        .logo-container img {
            width: 100px;
            height: auto;
            margin-bottom: 0.5rem;
        }
        .form-card {
            background-color: #ffffff;
            border-radius: 1.5rem;
            box-shadow: var(--card-shadow);
            padding: 2.5rem 2rem;
            width: 100%;
            border: 1px solid #f3f4f6;
            margin-bottom: 2rem;
        }
        .form-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .form-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: var(--text-main);
        }
        .form-header p {
            color: var(--text-muted);
            font-size: 0.95rem;
            margin: 0;
        }
        .input-group-custom {
            margin-bottom: 1.5rem;
        }
        .input-group-custom label {
            display: block;
            font-weight: 600;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            color: #374151;
        }
        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }
        .input-wrapper .material-symbols-rounded {
            position: absolute;
            left: 1rem;
            color: #9ca3af;
            font-size: 1.25rem;
            z-index: 10;
        }
        .input-wrapper input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 3rem;
            border: 2px solid #e5e7eb;
            border-radius: 0.75rem;
            font-size: 1rem;
            transition: all 0.2s ease;
            background-color: #f9fafb;
            color: #111827;
        }
        .input-wrapper input:focus {
            outline: none;
            border-color: var(--primary-blue);
            background-color: #ffffff;
            box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.1);
        }
        .submit-btn {
            background-color: var(--primary-blue);
            color: white;
            border: none;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
            transition: all 0.2s;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
        }
        .submit-btn:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }
        .submit-btn:disabled {
            background-color: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }
    </style>
</head>
<body>
    <div class="container-wrapper">
        <div class="logo-container">
            <img src="../../assets/images/byaheroLogo.png" alt="ByaHero Logo">
        </div>

        <div class="form-card">
            <div class="form-header">
                <h2>Welcome, <?= htmlspecialchars($userName) ?>!</h2>
                <p>Please provide a contact number to complete your registration.</p>
            </div>

            <div id="alertBox"></div>

            <form id="contactForm">
                <div class="input-group-custom">
                    <label for="contacts">Contact Number</label>
                    <div class="input-wrapper">
                        <span class="material-symbols-rounded">phone</span>
                        <input type="tel" id="contacts" name="contacts" placeholder="e.g. 09123456789" required 
                            inputmode="numeric" maxlength="11" pattern="09[0-9]{9}"
                            oninput="this.value = this.value.replace(/[^0-9]/g, '');">
                    </div>
                </div>

                <button type="submit" class="submit-btn" id="submitBtn">
                    Continue to Dashboard
                    <span class="material-symbols-rounded" style="font-size: 1.25rem;">arrow_forward</span>
                </button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const alertBox = document.getElementById('alertBox');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contactVal = document.getElementById('contacts').value.trim();
            if(!contactVal) return;

            if (!/^(09|639)\d{9}$/.test(contactVal)) {
                alertBox.innerHTML = `<div class="alert alert-danger small py-2">Please enter a valid Philippine mobile number (e.g., 09123456789).</div>`;
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `Saving... <span class="spinner-border spinner-border-sm" role="status"></span>`;

            try {
                const formData = new FormData();
                formData.append('action', 'complete_profile');
                formData.append('contacts', contactVal);

                const res = await fetch('../auth_api.php', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });

                const data = await res.json();

                if (data.success) {
                    window.location.href = 'showGuide/showGuide.php';
                } else {
                    alertBox.innerHTML = `<div class="alert alert-danger small py-2">${data.message}</div>`;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `Continue to Dashboard <span class="material-symbols-rounded" style="font-size: 1.25rem;">arrow_forward</span>`;
                }
            } catch (err) {
                console.error(err);
                alertBox.innerHTML = `<div class="alert alert-danger small py-2">An error occurred. Please try again.</div>`;
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Continue to Dashboard <span class="material-symbols-rounded" style="font-size: 1.25rem;">arrow_forward</span>`;
            }
        });
    </script>
</body>
</html>
