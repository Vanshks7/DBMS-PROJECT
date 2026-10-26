const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');

// All endpoints in admin require 'admin' role
router.use(verifyToken, requireRoles('admin'));

// GET /api/admin/overview - Overall revenue & facility metrics (in INR)
router.get('/overview', async (req, res) => {
  try {
    const [revTotal] = await db.query(`
      SELECT 
        COALESCE(SUM(total_charge), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN s.slot_type = 'Car' THEN total_charge ELSE 0 END), 0) AS carRevenue,
        COALESCE(SUM(CASE WHEN s.slot_type = 'Bike' THEN total_charge ELSE 0 END), 0) AS bikeRevenue,
        COALESCE(SUM(CASE WHEN s.slot_type = 'EV' THEN total_charge ELSE 0 END), 0) AS evRevenue,
        COALESCE(SUM(CASE WHEN DATE(r.created_at) = CURDATE() THEN total_charge ELSE 0 END), 0) AS todayRevenue
      FROM Reservations r
      JOIN Slots s ON r.slot_id = s.id
      WHERE r.status != 'Cancelled'
    `);

    const [counts] = await db.query(`
      SELECT 
        COUNT(*) AS totalBookings,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingBookings,
        SUM(CASE WHEN status = 'Checked-In' THEN 1 ELSE 0 END) AS checkedInBookings,
        SUM(CASE WHEN status = 'Checked-Out' THEN 1 ELSE 0 END) AS completedBookings,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledBookings
      FROM Reservations
    `);

    const [userCount] = await db.query(`
      SELECT 
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingRequests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedUsers
      FROM Users
    `);

    res.json({
      currency: 'INR',
      currencySymbol: '₹',
      revenue: {
        total: parseFloat(revTotal[0].totalRevenue),
        car: parseFloat(revTotal[0].carRevenue),
        bike: parseFloat(revTotal[0].bikeRevenue),
        ev: parseFloat(revTotal[0].evRevenue),
        today: parseFloat(revTotal[0].todayRevenue)
      },
      bookings: counts[0],
      users: userCount[0]
    });
  } catch (err) {
    console.error('Error getting admin overview:', err);
    res.status(500).json({ error: 'Failed to retrieve admin overview' });
  }
});

// GET /api/admin/users/pending - Get pending account registration requests (Guard & Operator)
router.get('/users/pending', async (req, res) => {
  try {
    const [pendingUsers] = await db.query(`
      SELECT id, username, role, status, created_at
      FROM Users
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    res.json(pendingUsers);
  } catch (err) {
    console.error('Error getting pending users:', err);
    res.status(500).json({ error: 'Failed to retrieve pending account requests' });
  }
});

// PATCH /api/admin/users/:id/approve - Approve user account request
router.patch('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];

    await db.query("UPDATE Users SET status = 'approved' WHERE id = ?", [id]);

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'ACCOUNT_APPROVED',
      `Admin @${req.user.username} approved account for @${user.username} (Role: ${user.role}).`,
      req.user.id
    ]);

    res.json({ message: `Account for ${user.username} has been approved successfully!`, id });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// PATCH /api/admin/users/:id/reject - Reject user account request
router.patch('/users/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];

    await db.query("UPDATE Users SET status = 'rejected' WHERE id = ?", [id]);

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'ACCOUNT_REJECTED',
      `Admin @${req.user.username} rejected account request for @${user.username} (Role: ${user.role}).`,
      req.user.id
    ]);

    res.json({ message: `Account request for ${user.username} has been rejected.`, id });
  } catch (err) {
    console.error('Error rejecting user:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// GET /api/admin/users - List all users with statuses
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, role, status, created_at FROM Users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// GET /api/admin/logs - System audit logs
router.get('/logs', async (req, res) => {
  const { limit = 50, action } = req.query;
  let sql = `
    SELECT l.*, u.username, u.role
    FROM SystemLogs l
    LEFT JOIN Users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (action) {
    sql += ' AND l.action = ?';
    params.push(action);
  }

  sql += ' ORDER BY l.created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  try {
    const [logs] = await db.query(sql, params);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to retrieve system logs' });
  }
});

module.exports = router;
