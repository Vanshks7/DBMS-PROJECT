-- ==========================================================
-- SMART PARKING WEB PORTAL - DATABASE SCHEMA & SEED DATA
-- Database: smart_parking_db
-- Currency: INR (₹)
-- Facility: 5 Floors, each with 4 Car, 4 Bike, and 1 EV Charging slot (Total 45 slots)
-- ==========================================================

DROP DATABASE IF EXISTS smart_parking_db;
CREATE DATABASE smart_parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_parking_db;

-- 1. Users Table (Customer instant approved; Guard/Operator require Admin approval)
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer', 'guard', 'operator') NOT NULL DEFAULT 'customer',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Slots Table (5 floors x [4 Car + 4 Bike + 1 EV slot with charging] = 45 slots)
CREATE TABLE Slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_number INT NOT NULL,
    slot_type ENUM('Car', 'Bike', 'EV') NOT NULL,
    slot_number VARCHAR(10) NOT NULL,
    UNIQUE KEY uq_floor_slot (floor_number, slot_type, slot_number)
) ENGINE=InnoDB;

-- 3. Rates Table (in INR ₹: Car ₹50, Bike ₹20, EV with Charging ₹80)
CREATE TABLE Rates (
    vehicle_type ENUM('Car', 'Bike', 'EV') PRIMARY KEY,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Reservations Table
CREATE TABLE Reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    total_charge DECIMAL(10, 2) NOT NULL,
    status ENUM('Pending', 'Checked-In', 'Checked-Out', 'Cancelled') NOT NULL DEFAULT 'Pending',
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES Slots(id) ON DELETE CASCADE,
    INDEX idx_res_time (start_time, end_time),
    INDEX idx_res_plate (license_plate)
) ENGINE=InnoDB;

-- 5. System Logs Table (Audit trail)
CREATE TABLE SystemLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- SEED DATA
-- ==========================================================

-- Populate Hourly Rates (Car: ₹50/hr, Bike: ₹20/hr, EV with Charging: ₹80/hr)
INSERT INTO Rates (vehicle_type, hourly_rate) VALUES
('Car', 50.00),
('Bike', 20.00),
('EV', 80.00);

-- Populate 5 Floors: 4 Car (C1-C4), 4 Bike (B1-B4), 1 EV with charging (E1)
INSERT INTO Slots (floor_number, slot_type, slot_number) VALUES
-- Floor 1
(1, 'Car', 'C1'), (1, 'Car', 'C2'), (1, 'Car', 'C3'), (1, 'Car', 'C4'),
(1, 'Bike', 'B1'), (1, 'Bike', 'B2'), (1, 'Bike', 'B3'), (1, 'Bike', 'B4'),
(1, 'EV', 'E1'),
-- Floor 2
(2, 'Car', 'C1'), (2, 'Car', 'C2'), (2, 'Car', 'C3'), (2, 'Car', 'C4'),
(2, 'Bike', 'B1'), (2, 'Bike', 'B2'), (2, 'Bike', 'B3'), (2, 'Bike', 'B4'),
(2, 'EV', 'E1'),
-- Floor 3
(3, 'Car', 'C1'), (3, 'Car', 'C2'), (3, 'Car', 'C3'), (3, 'Car', 'C4'),
(3, 'Bike', 'B1'), (3, 'Bike', 'B2'), (3, 'Bike', 'B3'), (3, 'Bike', 'B4'),
(3, 'EV', 'E1'),
-- Floor 4
(4, 'Car', 'C1'), (4, 'Car', 'C2'), (4, 'Car', 'C3'), (4, 'Car', 'C4'),
(4, 'Bike', 'B1'), (4, 'Bike', 'B2'), (4, 'Bike', 'B3'), (4, 'Bike', 'B4'),
(4, 'EV', 'E1'),
-- Floor 5
(5, 'Car', 'C1'), (5, 'Car', 'C2'), (5, 'Car', 'C3'), (5, 'Car', 'C4'),
(5, 'Bike', 'B1'), (5, 'Bike', 'B2'), (5, 'Bike', 'B3'), (5, 'Bike', 'B4'),
(5, 'EV', 'E1');
