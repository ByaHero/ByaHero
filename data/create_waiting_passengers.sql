-- Create waiting_passengers table for ByaHero Waiting Feature
CREATE TABLE IF NOT EXISTS waiting_passengers (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
