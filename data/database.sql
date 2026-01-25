CREATE TABLE busses (
    Bus_ID INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    route VARCHAR(100) DEFAULT NULL,
    total_seats INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    seat_availability INT DEFAULT NULL,
    current_location VARCHAR(50) DEFAULT NULL,
    updated DATETIME DEFAULT NULL
);

INSERT INTO busses (Bus_ID, code, route, total_seats, status, seat_availability, current_location, updated) VALUES
(1, 'BUS-001', 'NULL', 25, 'unavailable', NULL, 'NULL', 'NULL'),
(2, 'BUS-002', 'NULL', 25, 'unavailable', NULL, NULL, 'NULL'),
(3, 'BUS-003', 'NULL', 25, 'unavailable', NULL, NULL, 'NULL');