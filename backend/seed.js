require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('Connecting to MySQL server...');
  
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '241106',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  console.log('Ensuring database smart_parking_db exists...');
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'smart_parking_db'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await rootConn.end();

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '241106',
    database: process.env.DB_NAME || 'smart_parking_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  console.log('Updating tables with EV slots and rates...');

  // 1. Users Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS Users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'customer', 'guard', 'operator') NOT NULL DEFAULT 'customer',
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // 2. Slots Table (Update ENUM to include 'EV')
  await db.query(`
    CREATE TABLE IF NOT EXISTS Slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      floor_number INT NOT NULL,
      slot_type ENUM('Car', 'Bike', 'EV') NOT NULL,
      slot_number VARCHAR(10) NOT NULL,
      UNIQUE KEY uq_floor_slot (floor_number, slot_type, slot_number)
    ) ENGINE=InnoDB;
  `);
  // Alter existing Slots table if column doesn't have 'EV'
  try {
    await db.query(`ALTER TABLE Slots MODIFY COLUMN slot_type ENUM('Car', 'Bike', 'EV') NOT NULL`);
  } catch (e) {}

  // 3. Rates Table (Update ENUM to include 'EV')
  await db.query(`
    CREATE TABLE IF NOT EXISTS Rates (
      vehicle_type ENUM('Car', 'Bike', 'EV') PRIMARY KEY,
      hourly_rate DECIMAL(10, 2) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
  try {
    await db.query(`ALTER TABLE Rates MODIFY COLUMN vehicle_type ENUM('Car', 'Bike', 'EV') PRIMARY KEY`);
  } catch (e) {}

  // 4. Reservations Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS Reservations (
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
  `);

  // 5. SystemLogs Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS SystemLogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      details TEXT NOT NULL,
      user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  console.log('Seeding INR Rates: Car (₹50/hr), Bike (₹20/hr), EV with Charging (₹80/hr)...');
  await db.query(`
    INSERT INTO Rates (vehicle_type, hourly_rate) VALUES
    ('Car', 50.00),
    ('Bike', 20.00),
    ('EV', 80.00)
    ON DUPLICATE KEY UPDATE hourly_rate = VALUES(hourly_rate);
  `);

  console.log('Seeding 45 Slots: 4 Car (C1-C4), 4 Bike (B1-B4), 1 EV (E1) on each of 5 floors...');
  for (let floor = 1; floor <= 5; floor++) {
    // 4 Car slots
    for (let c = 1; c <= 4; c++) {
      await db.query(`
        INSERT INTO Slots (floor_number, slot_type, slot_number)
        VALUES (?, 'Car', ?)
        ON DUPLICATE KEY UPDATE slot_type = 'Car'
      `, [floor, `C${c}`]);
    }
    // 4 Bike slots
    for (let b = 1; b <= 4; b++) {
      await db.query(`
        INSERT INTO Slots (floor_number, slot_type, slot_number)
        VALUES (?, 'Bike', ?)
        ON DUPLICATE KEY UPDATE slot_type = 'Bike'
      `, [floor, `B${b}`]);
    }
    // 1 EV Charging slot
    await db.query(`
      INSERT INTO Slots (floor_number, slot_type, slot_number)
      VALUES (?, 'EV', 'E1')
      ON DUPLICATE KEY UPDATE slot_type = 'EV'
    `, [floor]);
  }
  console.log('45 Slots provisioned (including 5 EV charging bays E1).');

  console.log('Seeding default users...');
  const users = [
    { username: 'admin', password: 'Vansh3068', role: 'admin', status: 'approved' },
    { username: 'operator1@gmail.com', password: 'operator123', role: 'operator', status: 'approved' },
    { username: 'guard1@gmail.com', password: 'guard123', role: 'guard', status: 'approved' },
    { username: 'customer', password: 'customer123', role: 'customer', status: 'approved' }
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.query(`
      INSERT INTO Users (username, password_hash, role, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), status = VALUES(status);
    `, [u.username, passwordHash, u.role, u.status]);
  }

  await db.end();
  console.log('Database seeding finished successfully with EV slots & rates!');
}

seedDatabase().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
