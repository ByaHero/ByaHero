-- ByaHero Analytics Tables
-- These tables are auto-created by the application (api.php).
-- This file exists for reference and manual migration if needed.

-- Records each tracking session (start → stop) as one "operation/trip"
CREATE TABLE IF NOT EXISTS bus_operations (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bus_id              INT NOT NULL,
    conductor_id        INT UNSIGNED NOT NULL,
    route               VARCHAR(100) NOT NULL,
    pre_departure_count INT UNSIGNED NOT NULL DEFAULT 0,
    started_at          DATETIME NOT NULL,
    ended_at            DATETIME DEFAULT NULL,
    start_location      VARCHAR(100) DEFAULT NULL,
    end_location        VARCHAR(100) DEFAULT NULL,
    total_boarded       INT UNSIGNED NOT NULL DEFAULT 0,
    total_departed      INT UNSIGNED NOT NULL DEFAULT 0,
    status              ENUM('active','completed') DEFAULT 'active',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_bus_date (bus_id, started_at),
    INDEX idx_conductor (conductor_id),
    INDEX idx_route_date (route, started_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Records each confirmed seat change (board or depart) with location + time
CREATE TABLE IF NOT EXISTS passenger_events (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    operation_id    INT UNSIGNED NOT NULL,
    event_type      ENUM('board','depart') NOT NULL,
    count           INT UNSIGNED NOT NULL DEFAULT 1,
    location_name   VARCHAR(100) DEFAULT NULL,
    lat             DECIMAL(10,7) DEFAULT NULL,
    lng             DECIMAL(10,7) DEFAULT NULL,
    recorded_at     DATETIME NOT NULL,
    
    INDEX idx_operation (operation_id),
    INDEX idx_type_time (event_type, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
