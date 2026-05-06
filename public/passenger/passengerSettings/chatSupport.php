<?php
require_once __DIR__ . '/../auth_passenger.php';

$pageType = 'settings';
$backLink = 'settings.php';
$pageDepth = "../../../";

// Check if navbar file exists before including
$navbarPath = __DIR__ . "/../../../components/navbarPassenger.php";
if (file_exists($navbarPath)) {
    include $navbarPath;
} else {
    // Fallback: Try alternative path
    $altPath = "../../../components/navbarPassenger.php";
    if (file_exists($altPath)) {
        include $altPath;
    }
}
?>

<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Help & FAQ - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .faq-container {
      margin-top: 70px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      padding: 0 15px;
    }

    .faq-heading {
      font-weight: bold;
      font-size: 1.8rem;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .faq-subheading {
      text-align: center;
      color: #6b7280;
      font-size: 0.95rem;
      margin-bottom: 2rem;
    }

    .search-bar {
      margin-bottom: 25px;
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 12px;
      background-color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }

    .search-input-wrapper .material-symbols-rounded {
      color: #6b7280;
      font-size: 1.3rem;
    }

    .search-input-wrapper input {
      border: none;
      outline: none;
      background: none;
      margin-left: 12px;
      color: #1f2937;
      font-size: 1rem;
      flex-grow: 1;
    }

    .search-input-wrapper input::placeholder {
      color: #9ca3af;
    }

    .faq-category {
      margin-bottom: 30px;
    }

    .category-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1e3a8a;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .category-title .material-symbols-rounded {
      font-size: 1.5rem;
    }

    .faq-item {
      background-color: white;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .faq-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .faq-question {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;
    }

    .faq-question:hover {
      background-color: #f9fafb;
    }

    .faq-question-text {
      font-weight: 500;
      color: #1f2937;
      font-size: 1rem;
      flex-grow: 1;
    }

    .faq-icon {
      color: #6b7280;
      transition: transform 0.3s ease;
      font-size: 1.5rem;
    }

    .faq-item.active .faq-icon {
      transform: rotate(180deg);
      color: #1e3a8a;
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      background-color: #f9fafb;
      padding: 0 20px;
    }

    .faq-item.active .faq-answer {
      max-height: 500px;
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
    }

    .faq-answer-text {
      color: #4b5563;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
      display: none;
    }

    .no-results .material-symbols-rounded {
      font-size: 4rem;
      color: #d1d5db;
      margin-bottom: 15px;
    }

    /* Accessibility Settings Integration */
    body.large-text .faq-question-text {
      font-size: 1.07rem;
    }

    body.large-text .faq-answer-text {
      font-size: 1.02rem;
    }

    body.high-contrast .faq-item {
      border: 2px solid #000;
    }

    body.high-contrast .faq-question-text {
      color: #000;
      font-weight: 600;
    }

    body.high-contrast .faq-answer-text {
      color: #000;
    }
  </style>
</head>

<body>

  <!-- Main Content -->
  <div class="container faq-container">

    <!-- Heading -->
    <div class="faq-heading">Help & FAQ</div>
    <div class="faq-subheading">Find answers to common questions about ByaHero</div>

    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="material-symbols-rounded">search</span>
        <input type="text" id="searchInput" placeholder="Search for questions...">
      </div>
    </div>

    <!-- Getting Started -->
    <div class="faq-category" data-category="getting-started">
      <div class="category-title">
        <span class="material-symbols-rounded">rocket_launch</span>
        Getting Started
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">What is ByaHero?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            ByaHero is a real-time bus tracking application designed to help passengers track buses, view routes, check seat availability, and get live updates on bus locations. Our goal is to make public transportation more convenient and accessible for everyone.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I create an account?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            To create an account, tap on "Sign Up" from the login page. Enter your email address, create a password, and fill in your personal details. You'll receive a verification code to confirm your account. Once verified, you can start using ByaHero immediately!
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">Is ByaHero free to use?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Yes! ByaHero is completely free to use. There are no subscription fees or hidden charges. All features including bus tracking, route planning, and notifications are available at no cost.
          </div>
        </div>
      </div>
    </div>

    <!-- Bus Tracking -->
    <div class="faq-category" data-category="bus-tracking">
      <div class="category-title">
        <span class="material-symbols-rounded">directions_bus</span>
        Bus Tracking
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I track my bus in real-time?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Open the ByaHero app and you'll see a map with active buses marked with icons. Tap on any bus to view its details including route, current location, and seat availability. You can also use the search feature to find specific bus routes or destinations.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How accurate is the bus location tracking?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Our system updates bus locations every 3-5 seconds using GPS technology. The accuracy is typically within 10-20 meters, depending on GPS signal quality and network conditions. Location updates are shown in real-time on the map.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">What does the seat availability indicator mean?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            The seat availability shows the number of empty seats on the bus. For example, "15/40" means 15 seats are available out of 40 total seats. Bus status can be "Available" (seats available), "Almost Full" (few seats left), or "Full" (no seats available).
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">Why can't I see some buses on the map?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Only active buses that are currently operating appear on the map. Buses may not be visible if they are offline, out of service, or experiencing GPS/network issues. Check back later or use the schedule feature to see when buses will be available.
          </div>
        </div>
      </div>
    </div>

    <!-- Routes & Destinations -->
    <div class="faq-category" data-category="routes">
      <div class="category-title">
        <span class="material-symbols-rounded">route</span>
        Routes & Destinations
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I find buses going to my destination?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Use the search bar at the top of the map to enter your destination. ByaHero will show you all available buses and routes that go to or near your destination. You can also filter results by bus stops or terminals.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">Can I view the complete bus route?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Yes! Tap on any bus to view its details, then select "View Route" to see the complete path the bus follows, including all stops and terminals along the way. The route will be displayed on the map with clear markings.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I find the nearest bus stop?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Enable location services on your device. ByaHero will automatically show nearby bus stops on the map. You can tap on the "Nearby Stops" button to see a list of the closest stops with walking directions and estimated distances.
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications & Alerts -->
    <div class="faq-category" data-category="notifications">
      <div class="category-title">
        <span class="material-symbols-rounded">notifications</span>
        Notifications & Alerts
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I turn on smart notifications?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Go to Settings > Notifications and toggle on "Smart Notifications". You can customize what alerts you want to receive, such as bus arrival notifications, schedule changes, or service disruptions. Make sure notifications are enabled in your device settings as well.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">What are arrival notifications?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            When tracking a specific bus, you can set up arrival notifications to alert you when the bus is approaching your stop. You'll receive a notification 5-10 minutes before the bus arrives, giving you time to prepare and reach the stop.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">Why am I not receiving notifications?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Check the following: (1) Notifications are enabled in ByaHero Settings, (2) Notifications are allowed in your device settings for ByaHero, (3) You have a stable internet connection, (4) Battery saver mode is not blocking notifications. If issues persist, try logging out and back in.
          </div>
        </div>
      </div>
    </div>

    <!-- Account & Settings -->
    <div class="faq-category" data-category="account">
      <div class="category-title">
        <span class="material-symbols-rounded">account_circle</span>
        Account & Settings
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I change my password?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Go to Settings > Account Settings > Change Password. Enter your current password, then create a new password. Your password must be at least 8 characters long and include a mix of letters and numbers for security.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I reset my forgotten password?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            On the login page, tap "Forgot Password". Enter your registered email address and we'll send you a password reset link. Click the link in the email and follow the instructions to create a new password.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">What are accessibility settings?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            ByaHero offers accessibility features to make the app easier to use for everyone. Go to Settings > Accessibility to enable options like Large Text (increases font size by 7%), High Contrast Mode (improves visibility), and Screen Reader support.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I update my profile information?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Navigate to Settings > Account Settings. Here you can update your name, email address, phone number, and other personal details. Changes are saved automatically when you tap "Save Changes".
          </div>
        </div>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="faq-category" data-category="troubleshooting">
      <div class="category-title">
        <span class="material-symbols-rounded">build</span>
        Troubleshooting
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">What should I do if I miss my bus?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Don't worry! Open ByaHero and check for the next available bus on the same route. You can see estimated arrival times and seat availability. Set up notifications for the next bus so you won't miss it. You can also explore alternative routes if available.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">The app is loading slowly. What can I do?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Slow loading can be caused by poor internet connection. Try: (1) Switching between WiFi and mobile data, (2) Closing and reopening the app, (3) Clearing app cache in your device settings, (4) Updating to the latest version of ByaHero. If problems persist, contact support.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">The map is not showing buses. What's wrong?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            This could happen if: (1) No buses are currently active in your area, (2) You have a poor internet connection, (3) Location services are disabled. Check your connection, enable GPS/location services, and refresh the map. If issues continue, try logging out and back in.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I report a bug or issue?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            Go to Settings > Send Feedback. Describe the issue you're experiencing in detail, including when it happens and what you were trying to do. You can also attach screenshots. Our support team will review your report and work on a fix as soon as possible.
          </div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question">
          <span class="faq-question-text">How do I contact customer support?</span>
          <span class="material-symbols-rounded faq-icon">expand_more</span>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-text">
            You can reach our support team through: (1) Settings > Send Feedback for general inquiries, (2) Email us at support@byahero.com, (3) Check our website for additional contact options. We typically respond within 24-48 hours.
          </div>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div class="no-results" id="noResults">
      <span class="material-symbols-rounded">search_off</span>
      <div>No results found</div>
      <small>Try different keywords or browse all questions above</small>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    // FAQ Toggle Functionality
    document.querySelectorAll('.faq-question').forEach(question => {
      question.addEventListener('click', function() {
        const faqItem = this.closest('.faq-item');
        const isActive = faqItem.classList.contains('active');

        // Close all other FAQs
        document.querySelectorAll('.faq-item').forEach(item => {
          item.classList.remove('active');
        });

        // Toggle current FAQ
        if (!isActive) {
          faqItem.classList.add('active');
        }
      });
    });

    // Search Functionality
    const searchInput = document.getElementById('searchInput');
    const faqItems = document.querySelectorAll('.faq-item');
    const categories = document.querySelectorAll('.faq-category');
    const noResults = document.getElementById('noResults');

    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase().trim();
      let hasResults = false;

      if (searchTerm === '') {
        categories.forEach(cat => cat.style.display = 'block');
        faqItems.forEach(item => item.style.display = 'block');
        noResults.style.display = 'none';
        return;
      }

      categories.forEach(category => {
        let categoryHasResults = false;

        category.querySelectorAll('.faq-item').forEach(item => {
          const questionText = item.querySelector('.faq-question-text').textContent.toLowerCase();
          const answerText = item.querySelector('.faq-answer-text').textContent.toLowerCase();

          if (questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
            item.style.display = 'block';
            categoryHasResults = true;
            hasResults = true;
          } else {
            item.style.display = 'none';
          }
        });

        category.style.display = categoryHasResults ? 'block' : 'none';
      });

      noResults.style.display = hasResults ? 'none' : 'block';
    });
  </script>
</body>

</html>