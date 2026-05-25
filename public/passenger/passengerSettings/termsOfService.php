<?php
require_once __DIR__ . '/../auth_passenger.php';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Terms of Service - ByaHero</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="../../../assets/css/accessibility.css">
  
  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }
    .policy-container {
      margin-top: 70px;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .policy-header {
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .policy-section {
      margin-bottom: 2rem;
    }
    .policy-section h2 {
      color: #1e3a8a;
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .policy-section h3 {
      color: #374151;
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .policy-section p, .policy-section li {
      color: #4b5563;
      line-height: 1.8;
    }
    .policy-section ul {
      padding-left: 1.5rem;
    }
    .last-updated {
      background: #f3f4f6;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }
    .important-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
  </style>
</head>
<body>
  <?php
  $pageType = 'settings';
  $backLink = 'privacySecurity.php';
  $pageDepth = "../../../";
  include "../../../components/navbarPassenger.php";
  ?>

  <div class="container policy-container">
    <div class="policy-header">
      <h1 class="fw-bold text-primary mb-2">Terms of Service</h1>
      <p class="text-muted mb-0">Agreement between you and ByaHero</p>
    </div>

    <div class="last-updated">
      <span class="material-symbols-rounded" style="font-size:18px; vertical-align:middle">schedule</span>
      Last Updated: February 7, 2026
    </div>

    <div class="important-notice">
      <strong>⚠️ Important:</strong> By using ByaHero, you agree to these terms. Please read them carefully.
    </div>

    <div class="policy-section">
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using ByaHero ("the Service"), you accept and agree to be bound by the terms and conditions of this agreement. If you do not agree to these terms, please do not use the Service.</p>
    </div>

    <div class="policy-section">
      <h2>2. Description of Service</h2>
      <p>ByaHero provides a real-time bus tracking and route information service for public transportation in Tanauan City, Batangas. The Service includes:</p>
      <ul>
        <li>Real-time bus location tracking</li>
        <li>Estimated arrival times</li>
        <li>Route information and schedules</li>
        <li>Safety and emergency features</li>
        <li>Passenger feedback and communication tools</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>3. User Accounts</h2>
      <h3>3.1 Account Creation</h3>
      <p>To access certain features, you must create an account. You agree to:</p>
      <ul>
        <li>Provide accurate and complete information</li>
        <li>Maintain the security of your password</li>
        <li>Accept responsibility for all activities under your account</li>
        <li>Notify us immediately of any unauthorized access</li>
      </ul>

      <h3>3.2 Account Termination</h3>
      <p>We reserve the right to suspend or terminate your account if you violate these terms or engage in fraudulent or harmful activities.</p>
    </div>

    <div class="policy-section">
      <h2>4. User Responsibilities</h2>
      <p>You agree to:</p>
      <ul>
        <li><strong>Accuracy:</strong> Not provide false or misleading information</li>
        <li><strong>Legal Use:</strong> Use the Service only for lawful purposes</li>
        <li><strong>Respect:</strong> Treat other users, drivers, and conductors with respect</li>
        <li><strong>Safety:</strong> Not use the Service while operating a vehicle</li>
        <li><strong>Security:</strong> Not attempt to access unauthorized areas or data</li>
        <li><strong>Content:</strong> Not post offensive, harmful, or inappropriate content</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>5. Service Availability</h2>
      <p>We strive to provide uninterrupted service, but we do not guarantee:</p>
      <ul>
        <li>Continuous, error-free operation</li>
        <li>100% accurate real-time information</li>
        <li>Availability during maintenance or technical issues</li>
        <li>Compatibility with all devices and browsers</li>
      </ul>
      <p><strong>The Service is provided "as is" without warranties of any kind.</strong></p>
    </div>

    <div class="policy-section">
      <h2>6. Location Services</h2>
      <p>By enabling location services, you consent to:</p>
      <ul>
        <li>Real-time tracking of your device location</li>
        <li>Use of GPS data to calculate distances and ETAs</li>
        <li>Display of your approximate location on the map</li>
      </ul>
      <p>You can disable location services at any time in Privacy & Security settings. Location data is not permanently stored.</p>
    </div>

    <div class="policy-section">
      <h2>7. Emergency Features</h2>
      <p>ByaHero provides emergency contact and safety features. However:</p>
      <ul>
        <li>We are not a substitute for emergency services (call 911/local authorities)</li>
        <li>Emergency features depend on network connectivity</li>
        <li>We cannot guarantee immediate response or assistance</li>
        <li>Use emergency features responsibly and only when genuinely needed</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>8. Limitation of Liability</h2>
      <p><strong>Important:</strong> ByaHero is an information service only. We are not responsible for:</p>
      <ul>
        <li>Actions or decisions you make based on information provided</li>
        <li>Delays, cancellations, or changes in bus services</li>
        <li>Lost or stolen property</li>
        <li>Personal injury or harm</li>
        <li>Interactions with bus operators or other passengers</li>
        <li>Inaccuracies in real-time data or ETAs</li>
        <li>Service interruptions or technical failures</li>
      </ul>
      <p><strong>Use the Service at your own risk.</strong></p>
    </div>

    <div class="policy-section">
      <h2>9. Intellectual Property</h2>
      <p>All content, features, and functionality of ByaHero are owned by us and protected by copyright, trademark, and other intellectual property laws. You may not:</p>
      <ul>
        <li>Copy, modify, or distribute our content</li>
        <li>Reverse engineer or decompile the Service</li>
        <li>Use our trademarks without permission</li>
        <li>Create derivative works based on our Service</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>10. User-Generated Content</h2>
      <h3>10.1 Feedback and Comments</h3>
      <p>By submitting feedback, ratings, or comments, you grant us the right to use, modify, and display your content for service improvement purposes.</p>

      <h3>10.2 Prohibited Content</h3>
      <p>You may not submit content that is:</p>
      <ul>
        <li>Offensive, defamatory, or hateful</li>
        <li>False or misleading</li>
        <li>Violates privacy or intellectual property rights</li>
        <li>Contains viruses or malicious code</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>11. Privacy</h2>
      <p>Your use of the Service is also governed by our <a href="privacyPolicy.php" class="text-primary fw-bold">Privacy Policy</a>. Please review it to understand how we collect, use, and protect your information.</p>
    </div>

    <div class="policy-section">
      <h2>12. Changes to Terms</h2>
      <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
    </div>

    <div class="policy-section">
      <h2>13. Termination</h2>
      <p>You may stop using the Service at any time. We may suspend or terminate your access if you violate these terms. Upon termination:</p>
      <ul>
        <li>Your account will be deactivated</li>
        <li>You must cease all use of the Service</li>
        <li>We may retain certain data as required by law</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>14. Governing Law</h2>
      <p>These terms are governed by the laws of the Philippines. Any disputes will be resolved in the courts of Tanauan City, Batangas.</p>
    </div>

    <div class="policy-section">
      <h2>15. Contact Information</h2>
      <p>For questions about these terms, please contact us:</p>
      <ul>
        <li><strong>Email:</strong> legal@byahero.com</li>
        <li><strong>Address:</strong> ByaHero, Inc., Tanauan City, Batangas, Philippines</li>
        <li><strong>In-App:</strong> Use the Feedback feature in Settings</li>
      </ul>
    </div>

    <div class="policy-section">
      <h2>16. Acknowledgment</h2>
      <p>By using ByaHero, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.</p>
    </div>

    <div class="text-center mt-5 mb-3">
      <button class="btn btn-primary px-4" onclick="window.location.href='privacySecurity.php'">
        <span class="material-symbols-rounded" style="font-size:18px; vertical-align:middle">arrow_back</span>
        Back to Privacy & Security
      </button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../assets/js/accessibility.js"></script>
</body>
</html>