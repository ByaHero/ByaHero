<?php
/**
 * ByaHero Schema Initializer / Auto-Migration
 * Ensures database tables and columns are up-to-date.
 */

function sync_schema(mysqli $conn) {
    // 1. Core Role Tables
    $roleTables = ['admins', 'drivers', 'conductors', 'users'];
    foreach ($roleTables as $table) {
        $conn->query("CREATE TABLE IF NOT EXISTS `$table` (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NULL,
            contacts VARCHAR(20) NULL,
            profile_picture MEDIUMTEXT NULL,
            google_id VARCHAR(255) NULL,
            auth_provider VARCHAR(50) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Ensure profile_picture is MEDIUMTEXT to store base64 images directly
        $checkType = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'profile_picture'");
        if ($checkType && $row = $checkType->fetch_assoc()) {
            if (stripos($row['Type'], 'varchar') !== false) {
                $conn->query("ALTER TABLE `$table` MODIFY COLUMN `profile_picture` MEDIUMTEXT NULL");
            }
        }

        // Ensure missing columns exist (for migration)
        $cols = [
            'name' => "VARCHAR(255) NULL AFTER password",
            'contacts' => "VARCHAR(20) NULL AFTER name",
            'profile_picture' => "MEDIUMTEXT NULL AFTER contacts",
            'google_id' => "VARCHAR(255) NULL AFTER profile_picture",
            'auth_provider' => "VARCHAR(50) NULL AFTER google_id"
        ];
        foreach ($cols as $col => $def) {
            $check = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$col'");
            if ($check->num_rows === 0) {
                $conn->query("ALTER TABLE `$table` ADD COLUMN `$col` $def");
            }
        }
    }

    // Add current_bus_id to conductors table if missing
    $checkConductorBus = $conn->query("SHOW COLUMNS FROM conductors LIKE 'current_bus_id'");
    if ($checkConductorBus && $checkConductorBus->num_rows === 0) {
        $conn->query("ALTER TABLE conductors ADD COLUMN current_bus_id INT UNSIGNED DEFAULT NULL AFTER profile_picture");
    }

    // 2. Busses Table
    $conn->query("CREATE TABLE IF NOT EXISTS busses (
        Bus_ID INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        route VARCHAR(100) DEFAULT NULL,
        total_seats INT NOT NULL DEFAULT 25,
        status ENUM('available','on_stop','full','unavailable') NOT NULL DEFAULT 'unavailable',
        seat_availability INT DEFAULT NULL,
        current_location VARCHAR(255) DEFAULT NULL,
        current_conductor_id INT UNSIGNED DEFAULT NULL,
        updated DATETIME DEFAULT NULL,
        INDEX idx_conductor (current_conductor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Add current_conductor_id if missing
    $check = $conn->query("SHOW COLUMNS FROM busses LIKE 'current_conductor_id'");
    if ($check->num_rows === 0) {
        $conn->query("ALTER TABLE busses ADD COLUMN current_conductor_id INT UNSIGNED DEFAULT NULL AFTER current_location");
    }

    // Add lat and lng if missing for persistent location tracking
    $checkLat = $conn->query("SHOW COLUMNS FROM busses LIKE 'lat'");
    if ($checkLat->num_rows === 0) {
        $conn->query("ALTER TABLE busses ADD COLUMN lat DECIMAL(10,7) DEFAULT NULL AFTER seat_availability");
    }
    $checkLng = $conn->query("SHOW COLUMNS FROM busses LIKE 'lng'");
    if ($checkLng->num_rows === 0) {
        $conn->query("ALTER TABLE busses ADD COLUMN lng DECIMAL(10,7) DEFAULT NULL AFTER lat");
    }

    // 3. Notifications Table
    $conn->query("CREATE TABLE IF NOT EXISTS notifications (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        meta JSON NULL,
        read_at DATETIME NULL,
        dedupe_key VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_dedupe (dedupe_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 4. User Settings
    $conn->query("CREATE TABLE IF NOT EXISTS user_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL UNIQUE,
        notify_bus_schedule TINYINT(1) DEFAULT 1,
        notify_bus_arrival TINYINT(1) DEFAULT 1,
        notify_seat_availability TINYINT(1) DEFAULT 1,
        text_size VARCHAR(20) DEFAULT 'medium',
        high_contrast_mode TINYINT(1) DEFAULT 0,
        screen_reader_support TINYINT(1) DEFAULT 0,
        share_location TINYINT(1) DEFAULT 0,
        privacy_mode VARCHAR(20) DEFAULT 'public',
        location_services TINYINT(1) DEFAULT 1,
        tracking_enabled TINYINT(1) DEFAULT 0,
        stolen_device_protection TINYINT(1) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 5. Password Resets / OTPs
    $conn->query("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_otp (otp_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 6. Analytics & Operations
    $conn->query("CREATE TABLE IF NOT EXISTS bus_operations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        bus_id INT NOT NULL,
        conductor_id INT UNSIGNED NOT NULL,
        route VARCHAR(100) NOT NULL,
        pre_departure_count INT UNSIGNED NOT NULL DEFAULT 0,
        started_at DATETIME NOT NULL,
        ended_at DATETIME DEFAULT NULL,
        start_location VARCHAR(100) DEFAULT NULL,
        end_location VARCHAR(100) DEFAULT NULL,
        total_boarded INT UNSIGNED NOT NULL DEFAULT 0,
        total_departed INT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM('active','completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bus_date (bus_id, started_at),
        INDEX idx_conductor (conductor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS passenger_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        operation_id INT UNSIGNED NOT NULL,
        event_type ENUM('board','depart') NOT NULL,
        count INT UNSIGNED NOT NULL DEFAULT 1,
        location_name VARCHAR(100) DEFAULT NULL,
        lat DECIMAL(10,7) DEFAULT NULL,
        lng DECIMAL(10,7) DEFAULT NULL,
        recorded_at DATETIME NOT NULL,
        INDEX idx_operation (operation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $conn->query("CREATE TABLE IF NOT EXISTS passenger_rides (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        operation_id INT UNSIGNED NOT NULL,
        boarded_at DATETIME NOT NULL,
        departed_at DATETIME DEFAULT NULL,
        status ENUM('active', 'completed') DEFAULT 'active',
        INDEX idx_user (user_id),
        INDEX idx_operation (operation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Ensure passenger_rides supports both operation-based tracking and older ride rows.
    $checkPR = $conn->query("SHOW COLUMNS FROM passenger_rides LIKE 'operation_id'");
    if ($checkPR && $checkPR->num_rows === 0) {
        $conn->query("ALTER TABLE passenger_rides ADD COLUMN operation_id INT UNSIGNED NOT NULL DEFAULT 0 AFTER user_id");
        $conn->query("ALTER TABLE passenger_rides ADD INDEX idx_operation (operation_id)");
    }
    $checkPRStatus = $conn->query("SHOW COLUMNS FROM passenger_rides LIKE 'status'");
    if ($checkPRStatus && $row = $checkPRStatus->fetch_assoc()) {
        if (strpos($row['Type'], "'active'") === false || strpos($row['Type'], "'ongoing'") === false) {
            $conn->query("ALTER TABLE passenger_rides MODIFY COLUMN status ENUM('active', 'completed', 'ongoing') DEFAULT 'active'");
        }
    }

    // 7. Bus Stops & Terminals
    $conn->query("CREATE TABLE IF NOT EXISTS busstopsterminal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('pickup_point','bus_stop','terminal') NOT NULL DEFAULT 'bus_stop',
        route VARCHAR(100) DEFAULT 'LAUREL - TANAUAN',
        location_name VARCHAR(255) NOT NULL,
        location_landmark VARCHAR(255) NULL,
        lat DECIMAL(10,7) NOT NULL,
        lng DECIMAL(10,7) NOT NULL,
        sort_order INT(11) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 8. Lost and Found
    $conn->query("CREATE TABLE IF NOT EXISTS lost_and_found (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        type ENUM('lost','found') NOT NULL,
        status ENUM('open','resolved','closed') DEFAULT 'open',
        item_description TEXT NOT NULL,
        bus_number VARCHAR(50) NULL,
        image1_path VARCHAR(255) NULL,
        image2_path VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 9. FCM Tokens
    $conn->query("CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fcm_token VARCHAR(512) NOT NULL,
        platform VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_token (user_id, fcm_token),
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 10. Feedbacks
    $conn->query("CREATE TABLE IF NOT EXISTS feedbacks (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        rating INT NOT NULL,
        feedback_text TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 11. User Locations
    $conn->query("CREATE TABLE IF NOT EXISTS user_locations (
        user_id INT UNSIGNED PRIMARY KEY,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        accuracy FLOAT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 12. SOS Alerts
    $conn->query("CREATE TABLE IF NOT EXISTS sos_alerts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sender_user_id INT UNSIGNED NOT NULL,
        recipient_user_id INT UNSIGNED NOT NULL,
        location_text TEXT NULL,
        status ENUM('active','resolved','seen') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_user_id),
        INDEX idx_recipient (recipient_user_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Ensure status ENUM includes 'seen' (fixes HTTP 500 / Data Truncation errors on strict-mode databases)
    $checkSosStatus = $conn->query("SHOW COLUMNS FROM sos_alerts LIKE 'status'");
    if ($checkSosStatus && $row = $checkSosStatus->fetch_assoc()) {
        if (strpos($row['Type'], "'seen'") === false) {
            $conn->query("ALTER TABLE sos_alerts MODIFY COLUMN status ENUM('active','resolved','seen') DEFAULT 'active'");
        }
    }

    // 13. Circles (Safety Circles)
    $conn->query("CREATE TABLE IF NOT EXISTS circles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        owner_user_id INT UNSIGNED NOT NULL,
        name VARCHAR(100) DEFAULT 'My Circle',
        invite_code VARCHAR(10) UNIQUE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_owner (owner_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 14. Circle Members
    $conn->query("CREATE TABLE IF NOT EXISTS circle_members (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        circle_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_circle_user (circle_id, user_id),
        INDEX idx_circle (circle_id),
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    
    // Migrate old circle_members table structure to standard schema if needed
    $checkCM = $conn->query("SHOW COLUMNS FROM circle_members LIKE 'member_user_id'");
    if ($checkCM && $checkCM->num_rows > 0) {
        $conn->query("ALTER TABLE circle_members CHANGE member_user_id user_id INT UNSIGNED NOT NULL");
    }
    $checkCMTime = $conn->query("SHOW COLUMNS FROM circle_members LIKE 'created_at'");
    if ($checkCMTime && $checkCMTime->num_rows > 0) {
        $conn->query("ALTER TABLE circle_members CHANGE created_at joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }
    $checkCMStatus = $conn->query("SHOW COLUMNS FROM circle_members LIKE 'status'");
    if ($checkCMStatus && $checkCMStatus->num_rows > 0) {
        $conn->query("ALTER TABLE circle_members DROP COLUMN status");
    }

    // 15. Reports (Issue Reporting)
    $conn->query("CREATE TABLE IF NOT EXISTS reports (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        bus_number VARCHAR(50) NULL,
        report_reason VARCHAR(255) NOT NULL,
        others_details TEXT NULL,
        contact_number VARCHAR(20) NULL,
        status ENUM('pending','reviewed','resolved') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 16. Bus Stops (Specific stop locations)
    $conn->query("CREATE TABLE IF NOT EXISTS bus_stops (
        stop_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,8) NULL,
        longitude DECIMAL(11,8) NULL,
        km_marker DECIMAL(10,2) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 17. Bus Fares (Fare matrix)
    // Run migration checks first to update existing bus_fares table if needed
    $checkFareId = $conn->query("SHOW COLUMNS FROM bus_fares LIKE 'fare_id'");
    if ($checkFareId && $checkFareId->num_rows === 0) {
        $conn->query("ALTER TABLE bus_fares CHANGE COLUMN id fare_id INT UNSIGNED AUTO_INCREMENT");
    }
    $busFareCols = [
        'base_regular_fare' => "DECIMAL(10,2) NULL AFTER discounted_fare",
        'base_discounted_fare' => "DECIMAL(10,2) NULL AFTER base_regular_fare",
        'distance_km' => "DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER base_discounted_fare",
        'updated_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER distance_km"
    ];
    foreach ($busFareCols as $col => $def) {
        $check = $conn->query("SHOW COLUMNS FROM bus_fares LIKE '$col'");
        if ($check && $check->num_rows === 0) {
            $conn->query("ALTER TABLE bus_fares ADD COLUMN `$col` $def");
        }
    }

    $conn->query("CREATE TABLE IF NOT EXISTS bus_fares (
        fare_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        route_name VARCHAR(100) NULL,
        origin_stop_id INT UNSIGNED NOT NULL,
        destination_stop_id INT UNSIGNED NOT NULL,
        regular_fare DECIMAL(10,2) NOT NULL,
        discounted_fare DECIMAL(10,2) NOT NULL,
        base_regular_fare DECIMAL(10,2) NULL,
        base_discounted_fare DECIMAL(10,2) NULL,
        distance_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_route_path (origin_stop_id, destination_stop_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 18. Bus Fare Snapshots (History of fare changes)
    // Run migration checks: drop if old id column is present instead of snapshot_id
    $checkSnapId = $conn->query("SHOW COLUMNS FROM bus_fare_snapshots LIKE 'snapshot_id'");
    if ($checkSnapId && $checkSnapId->num_rows === 0) {
        $conn->query("DROP TABLE IF EXISTS bus_fare_snapshot_rows");
        $conn->query("DROP TABLE IF EXISTS bus_fare_snapshots");
    }

    $conn->query("CREATE TABLE IF NOT EXISTS bus_fare_snapshots (
        snapshot_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 19. Bus Fare Snapshot Rows (Specific items in a snapshot)
    $conn->query("CREATE TABLE IF NOT EXISTS bus_fare_snapshot_rows (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        snapshot_id INT UNSIGNED NOT NULL,
        fare_id INT UNSIGNED NOT NULL,
        regular_fare DECIMAL(10,2) NOT NULL,
        discounted_fare DECIMAL(10,2) NOT NULL,
        base_regular_fare DECIMAL(10,2) NULL,
        base_discounted_fare DECIMAL(10,2) NULL,
        distance_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        origin_stop_id INT UNSIGNED NOT NULL,
        destination_stop_id INT UNSIGNED NOT NULL,
        INDEX idx_snapshot (snapshot_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 20. Bus Schedule (Fixed timings)
    $conn->query("CREATE TABLE IF NOT EXISTS bus_schedule (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        terminal_name VARCHAR(255) NOT NULL,
        time_open TIME NULL,
        time_close TIME NULL,
        is_suspended TINYINT(1) DEFAULT 0,
        suspend_message TEXT NULL,
        day_of_week SET('Mon','Tue','Wed','Thu','Fri','Sat','Sun') DEFAULT 'Mon,Tue,Wed,Thu,Fri',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 21. Waiting Passengers (For Waiting Feature)
    $conn->query("CREATE TABLE IF NOT EXISTS waiting_passengers (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id       INT UNSIGNED NOT NULL,
        user_name     VARCHAR(255) NULL,
        location_name VARCHAR(150) NOT NULL,
        status        ENUM('waiting','boarded','cancelled') DEFAULT 'waiting',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user   (user_id),
        INDEX idx_status (status),
        INDEX idx_loc    (location_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 22. Seed data if tables are empty
    seed_tables($conn);
}

/**
 * Automatically seeds the database from SQL files in the /db directory if tables are empty.
 */
function seed_tables(mysqli $conn) {
    $db_dir = __DIR__ . '/../db';
    if (!is_dir($db_dir)) return;

    $seeds = [
        'bus_stops' => 'bus_stops.sql',
        'bus_schedule' => 'bus_schedule.sql',
        'bus_fares' => 'bus_fares.sql'
    ];

    foreach ($seeds as $table => $file) {
        $check = $conn->query("SELECT 1 FROM `$table` LIMIT 1");
        if ($check && $check->num_rows === 0) {
            $path = $db_dir . '/' . $file;
            if (is_file($path)) {
                $sql_content = file_get_contents($path);
                // Remove comments and empty lines
                $lines = explode("\n", $sql_content);
                $clean_sql = "";
                foreach ($lines as $line) {
                    $trimmed = trim($line);
                    if ($trimmed === "" || strpos($trimmed, "--") === 0 || strpos($trimmed, "/*") === 0) continue;
                    $clean_sql .= $line . "\n";
                }

                // Execute queries one by one
                $queries = explode(";", $clean_sql);
                foreach ($queries as $query) {
                    $query = trim($query);
                    if ($query) {
                        // We skip CREATE TABLE because we already handled it, but we keep INSERT
                        if (stripos($query, 'INSERT INTO') === 0) {
                            $conn->query($query);
                        }
                    }
                }
            }
        }
    }
}
