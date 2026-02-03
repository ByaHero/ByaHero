<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Chat Support - ByaHero</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">

  <!-- Material Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">

  <style>
    body {
      font-family: "Segoe UI", sans-serif;
      background-color: #f8f9fa;
      padding-bottom: 80px;
    }

    .chat-container {
      margin-top: 70px; /* Ensures spacing between navbar and content */
    }

    .chat-heading {
      font-weight: bold;
      font-size: 1.5rem;
      color: #1e3a8a;
      margin-top: 0.5rem;
      text-align: center;
    }

    .search-bar {
      margin: 20px auto;
      width: 90%;
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 10px;
      background-color: #f3f3f5;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-input-wrapper .material-symbols-rounded {
      color: #6b7280;
      font-size: 1.2rem;
    }

    .search-input-wrapper input {
      border: none;
      outline: none;
      background: none;
      margin-left: 8px;
      color: #6b7280;
      font-size: 1rem;
      flex-grow: 1;
    }

    .chat-card {
      width: 90%;
      margin: 10px auto;
      padding: 16px;
      border-radius: 10px;
      background-color: white;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .chat-card .chat-button {
      color: white;
      background-color: #1e3a8a;
      padding: 12px 20px;
      border-radius: 10px;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
    }

    .chat-card .chat-button:hover {
      background-color: #1a2f6b;
    }

    .faq-section {
      margin-top: 20px;
    }

    .faq-item {
      width: 90%;
      margin: 10px auto;
      padding: 12px;
      border-radius: 10px;
      background-color: #f3f4f6;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .faq-item:hover {
      background-color: #e8eaf6;
    }

    .faq-item .faq-icon {
      color: #6b7280;
    }
  </style>
</head>

<body>
  <?php
  $pageType = 'settings';        // Configures navbar for Chat Support page
  $backLink = 'settings.php';    // Back button navigates to settings.php
  $pageDepth = "../../../";      // Fixes the logo path if needed
  include "../../../components/navbarPassenger.php";
  ?>

  <!-- Main Content -->
  <div class="container chat-container">

    <!-- Heading -->
    <div class="chat-heading">How can we help you today?</div>

    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="material-symbols-rounded">menu</span>
        <input type="text" placeholder="Search for help">
        <span class="material-symbols-rounded">search</span>
      </div>
    </div>

    <!-- Chat with AI -->
    <div class="chat-card">
      <button class="chat-button">Chat with AI</button>
      <span>Get Help</span>
      <span class="material-symbols-rounded faq-icon">chevron_right</span>
    </div>

    <!-- Frequently Asked Questions -->
    <div class="faq-section">
      <div class="faq-item">
        <span>How do I track my bus?</span>
        <span class="material-symbols-rounded faq-icon">expand_more</span>
      </div>
      <div class="faq-item">
        <span>How can I turn on smart notifications?</span>
        <span class="material-symbols-rounded faq-icon">expand_more</span>
      </div>
      <div class="faq-item">
        <span>What to do if I miss my bus?</span>
        <span class="material-symbols-rounded faq-icon">expand_more</span>
      </div>
    </div>

  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>