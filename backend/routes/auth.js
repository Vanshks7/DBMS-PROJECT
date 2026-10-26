const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/auth/setup-status - Check if system is initialized / admin configured
router.get('/setup-status', async (req, res) => {
  try {
    const [admins] = await db.query("SELECT id, username FROM Users WHERE role = 'admin' AND status = 'approved'");
    const [rates] = await db.query('SELECT vehicle_type, hourly_rate FROM Rates');
    res.json({
      isSetup: admins.length > 0,
      adminCount: admins.length,
      rates
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify setup status' });
  }
});

// POST /api/auth/setup-wizard - Initial Admin Setup Wizard
router.post('/setup-wizard', async (req, res) => {
  const { adminUsername, adminPassword, carRate, bikeRate, evRate } = req.body;

  if (!adminUsername || !adminPassword) {
    return res.status(400).json({ error: 'Admin username and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Upsert admin user
    await db.query(`
      INSERT INTO Users (username, password_hash, role, status)
      VALUES (?, ?, 'admin', 'approved')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', status = 'approved'
    `, [adminUsername.trim(), passwordHash]);

    // Update hourly rates if provided (in INR)
    if (carRate) {
      await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(carRate), 'Car']);
    }
    if (bikeRate) {
      await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(bikeRate), 'Bike']);
    }
    if (evRate) {
      await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(evRate), 'EV']);
    }

    const [adminRow] = await db.query("SELECT id, username, role FROM Users WHERE username = ?", [adminUsername.trim()]);
    const adminUser = adminRow[0];

    const token = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: 'admin' },
      process.env.JWT_SECRET || 'smart_parking_secret_jwt_key_2026',
      { expiresIn: '24h' }
    );

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'ADMIN_SETUP_WIZARD',
      `Admin Setup Wizard completed by @${adminUser.username}. Initial INR Rates set (Car: ₹${carRate || 50}, Bike: ₹${bikeRate || 20}, EV: ₹${evRate || 80}).`,
      adminUser.id
    ]);

    res.json({
      message: 'Admin Setup Wizard completed successfully!',
      token,
      user: adminUser
    });
  } catch (err) {
    console.error('Setup wizard error:', err);
    res.status(500).json({ error: 'Failed to execute setup wizard' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE username = ?', [username.trim()]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // CHECK APPROVAL STATUS (Guard & Operator require Admin approval)
    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Your account registration is currently pending Admin approval. Please wait for an administrator to approve your account before signing in.'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Your account registration request has been rejected by the administrator.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'smart_parking_secret_jwt_key_2026',
      { expiresIn: '24h' }
    );

    // Audit log
    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'USER_LOGIN',
      `User ${user.username} logged in with role [${user.role}]`,
      user.id
    ]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/register (Customer: auto-approved. Guard/Operator: pending Admin approval)
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password required' });
  }

  const requestedRole = ['customer', 'operator', 'guard'].includes(role) ? role : 'customer';
  
  // CUSTOMERS DO NOT NEED APPROVALS - INSTANT ACTIVE
  const isCustomer = requestedRole === 'customer';
  const initialStatus = isCustomer ? 'approved' : 'pending';

  try {
    const [existing] = await db.query('SELECT id, status FROM Users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      if (existing[0].status === 'pending') {
        return res.status(409).json({ error: 'A registration request for this username/email is already pending Admin approval.' });
      }
      return res.status(409).json({ error: 'Username/email is already registered in the system.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const [result] = await db.query(
      'INSERT INTO Users (username, password_hash, role, status) VALUES (?, ?, ?, ?)',
      [username.trim(), passwordHash, requestedRole, initialStatus]
    );

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      isCustomer ? 'CUSTOMER_REGISTERED' : 'STAFF_REQUEST_SUBMITTED',
      isCustomer
        ? `Customer ${username.trim()} registered and activated immediately.`
        : `New [${requestedRole}] account request submitted by ${username.trim()}. Pending Admin approval.`,
      result.insertId
    ]);

    if (isCustomer) {
      // Auto-issue token for customer
      const token = jwt.sign(
        { id: result.insertId, username: username.trim(), role: 'customer' },
        process.env.JWT_SECRET || 'smart_parking_secret_jwt_key_2026',
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        success: true,
        pendingApproval: false,
        token,
        user: {
          id: result.insertId,
          username: username.trim(),
          role: 'customer',
          status: 'approved'
        },
        message: 'Account created successfully! Welcome to SmartPark.'
      });
    }

    // For Guard & Operator
    res.status(201).json({
      success: true,
      pendingApproval: true,
      message: `Registration request for [${requestedRole}] submitted successfully! Your account will be activated once approved by the Admin.`
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role, status, created_at FROM Users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
