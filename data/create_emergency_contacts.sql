CREATE TABLE emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NULL,
  phone VARCHAR(30) NOT NULL,
  relative_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

ALTER TABLE emergency_contacts
  ADD UNIQUE KEY uniq_user_phone (user_id, phone);