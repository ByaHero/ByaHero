<?php
include_once __DIR__ . '/../auth_passenger.php';
$pageType = 'settings';        
$backLink = '../index.php';    
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

    .share-item-hover {
      transition: all 0.2s ease;
    }

    .share-item-hover:hover {
      background: #ffffff !important;
      border-color: #e2e8f0 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      color: #1e3a8a !important;
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
  </style>
</head>

<body>
  <?php include "../../../components/navbarPassenger.php"; ?>

  <div class="container mt-5 pt-3" style="margin-top: 80px !important;">
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="bg-white border-0 p-4 p-sm-5 shadow-sm text-center" style="border-radius: 24px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06) !important;">
          <div class="fw-bold text-primary mb-2" style="font-size: 1.75rem; letter-spacing: -0.5px;">Share ByaHero</div>
          <p class="text-secondary mb-4" style="font-size: 1.05rem;">
            Help us reach more passengers! Share ByaHero with your friends and family.
          </p>

          <div class="d-flex align-items-center p-3 bg-light rounded-4 mb-3 text-decoration-none text-dark fw-semibold border border-transparent cursor-pointer share-item-hover" onclick="shareViaLink()" style="border-radius: 16px !important;">
            <div class="d-flex align-items-center justify-content-center rounded-3 me-3" style="width: 44px; height: 44px; background-color: #eef2ff; color: #1e3a8a;">
              <span class="material-symbols-rounded" style="font-size: 24px;">link</span>
            </div>
            <span>Share via Link</span>
          </div>

          <div class="d-flex align-items-center p-3 bg-light rounded-4 mb-3 text-decoration-none text-dark fw-semibold border border-transparent cursor-pointer share-item-hover" onclick="shareViaQR()" style="border-radius: 16px !important;">
            <div class="d-flex align-items-center justify-content-center rounded-3 me-3" style="width: 44px; height: 44px; background-color: #eef2ff; color: #1e3a8a;">
              <span class="material-symbols-rounded" style="font-size: 24px;">qr_code</span>
            </div>
            <span>Share via QR Code</span>
          </div>

          <div class="d-flex align-items-center p-3 bg-light rounded-4 mb-3 text-decoration-none text-dark fw-semibold border border-transparent cursor-pointer share-item-hover" onclick="shareOnSocial()" style="border-radius: 16px !important;">
            <div class="d-flex align-items-center justify-content-center rounded-3 me-3" style="width: 44px; height: 44px; background-color: #eef2ff; color: #1e3a8a;">
              <span class="material-symbols-rounded" style="font-size: 24px;">share</span>
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
          <div class="bg-white p-3 rounded-4 d-inline-block my-2 border shadow-sm" style="border-radius: 20px !important;">
            <img id="qrImg" src="" alt="ByaHero QR Code" style="width: 200px; height: 200px;">
          </div>
          <p class="text-muted small mt-2">Friends can scan this to download or open ByaHero.</p>
          <button type="button" class="btn btn-primary w-100 mt-3" data-bs-dismiss="modal" style="border-radius: 50px; background: #1e3a8a;">Done</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    const shareUrl = "https://byahero.app/";
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