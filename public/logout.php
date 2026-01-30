<?php
session_start();
session_destroy();
header("Location: passenger/index.php");
exit;