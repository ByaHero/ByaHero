<?php
require_once __DIR__ . '/../auth_passenger.php';
$pageType = 'settings';        
$backLink = 'settings.php';    
$pageDepth = "../../../";      
?>
<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Share ByaHero - ByaHero</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: "Inter", "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
      padding-bottom: 80px;
      min-height: 100vh;
    }

    .share-card {
      background: #ffffff;
      border: none;
      border-radius: 24px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
      padding: 2.5rem 2rem;
      margin-top: 80px;
      text-align: center;
    }

    .share-heading {
      font-size: 1.75rem;
      color: #1e3a8a;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 0.5rem;
    }

    .share-description {
      color: #64748b;
      font-size: 1.05rem;
      margin-bottom: 2.5rem;
    }

    .share-item {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-radius: 16px;
      margin-bottom: 1rem;
      text-decoration: none;
      color: #334155;
      font-weight: 600;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      cursor: pointer;
    }

    .share-item:hover {
      background: #ffffff;
      border-color: #e2e8f0;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      color: #1e3a8a;
    }

    .share-item .icon-wrap {
      width: 44px;
      height: 44px;
      background: #eef2ff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      color: #1e3a8a;
    }

    .share-item .material-symbols-rounded {
      font-size: 24px;
    }

    #copyFeedback {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e3a8a;
      color: white;
      padding: 10px 20px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 3000;
    }

    .qr-container {
      background: white;
      padding: 1.5rem;
      border-radius: 20px;
      display: inline-block;
      margin: 1rem 0;
    }

    #qrImg {
      width: 200px;
      height: 200px;
    }
  </style>
</head>

<body>
  <?php include "../../../components/navbarPassenger.php"; ?>

  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="share-card">
          <div class="share-heading">Share ByaHero</div>
          <p class="share-description">
            Help us reach more passengers! Share ByaHero with your friends and family.
          </p>

          <div class="share-item" onclick="shareViaLink()">
            <div class="icon-wrap">
              <span class="material-symbols-rounded">link</span>
            </div>
            <span>Share via Link</span>
          </div>

          <div class="share-item" onclick="shareViaQR()">
            <div class="icon-wrap">
              <span class="material-symbols-rounded">qr_code</span>
            </div>
            <span>Share via QR Code</span>
          </div>

          <div class="share-item" onclick="shareOnSocial()">
            <div class="icon-wrap">
              <span class="material-symbols-rounded">share</span>
            </div>
            <span>Share on Social Media</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="copyFeedback">Link copied to clipboard!</div>

  <!-- QR Modal -->
  <div class="modal fade" id="qrModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content" style="border-radius: 24px; border: none;">
        <div class="modal-body text-center p-4">
          <h5 class="fw-bold mb-3" style="color: #1e3a8a;">Scan QR Code</h5>
          <div class="qr-container shadow-sm border">
            <img id="qrImg" src="" alt="ByaHero QR Code">
          </div>
          <p class="text-muted small mt-2">Friends can scan this to download or open ByaHero.</p>
          <button type="button" class="btn btn-primary w-100 mt-3" data-bs-dismiss="modal" style="border-radius: 50px; background: #1e3a8a;">Done</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    const shareUrl = "https://byahero.free.nf/";
    const shareText = "Track buses and travel safer with ByaHero!";

    function showFeedback(text) {
      const feedback = document.getElementById('copyFeedback');
      feedback.textContent = text;
      feedback.style.opacity = '1';
      setTimeout(() => {
        feedback.style.opacity = '0';
      }, 2000);
    }

    async function shareOnSocial() {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'ByaHero',
            text: shareText,
            url: shareUrl
          });
        } catch (err) {
          console.error("Error sharing:", err);
        }
      } else {
        shareViaLink();
      }
    }

    function shareViaLink() {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showFeedback("Link copied to clipboard!");
        });
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showFeedback("Link copied to clipboard!");
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
      }
    }

    function shareViaQR() {
      const modal = new bootstrap.Modal(document.getElementById('qrModal'));
      document.getElementById('qrImg').src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(shareUrl);
      modal.show();
    }
  </script>
</body>

</html>