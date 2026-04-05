<?php
declare(strict_types=1);

$host = $_SERVER['HTTP_HOST'] ?? '';
$isLocal =
    $host === 'localhost' ||
    str_starts_with($host, 'localhost:') ||
    $host === '127.0.0.1' ||
    str_starts_with($host, '127.0.0.1:');

$baseUrl = $isLocal ? '/Byahero-prototype-v3' : '';
?>
<script>
  window.APP_BASE_URL = "<?= addslashes($baseUrl) ?>";
  window.CAPACITOR_ONESIGNAL_APP_ID = "b755dd29-1de2-4cf1-9381-6a9b436bc049";
</script>
<script src="<?= $baseUrl ?>/assets/js/capacitor_onesignal_bridge.js"></script>