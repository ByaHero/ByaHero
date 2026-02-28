CREATE TABLE sos_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_user_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  location_text VARCHAR(255) NULL,
  status ENUM('active','acknowledged','cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient_created (recipient_user_id, created_at),
  INDEX idx_sender_created (sender_user_id, created_at)
);