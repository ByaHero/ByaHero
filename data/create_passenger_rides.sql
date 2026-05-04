CREATE TABLE IF NOT EXISTS passenger_rides (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    bus_id INT NOT NULL,
    route VARCHAR(100) NOT NULL,
    boarded_at DATETIME NOT NULL,
    departed_at DATETIME DEFAULT NULL,
    start_location VARCHAR(100) DEFAULT NULL,
    end_location VARCHAR(100) DEFAULT NULL,
    status ENUM('ongoing', 'completed') DEFAULT 'ongoing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_bus (bus_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
