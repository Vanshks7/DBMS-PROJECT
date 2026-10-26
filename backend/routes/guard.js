const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');

// POST /api/guard/verify - Verify vehicle by license plate or Booking ID
router.post('/verify', verifyToken, requireRoles('guard', 'admin', 'operator'), async (req, res) => {
  const { query } = req.body;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Please enter a license plate number or Booking ID' });
  }

  const searchTerm = query.trim();

  try {
    // Search by Booking ID (if numeric) or license plate
    const isId = !isNaN(searchTerm);
    let sql = `
      SELECT r.*, s.floor_number, s.slot_type, s.slot_number, u.username
      FROM Reservations r
      JOIN Slots s ON r.slot_id = s.id
      JOIN Users u ON r.user_id = u.id
      WHERE (r.license_plate = ? ${isId ? 'OR r.id = ?' : ''})
        AND r.status != 'Cancelled'
      ORDER BY 
        CASE 
          WHEN r.status = 'Checked-In' THEN 1
          WHEN r.status = 'Pending' THEN 2
          ELSE 3
        END,
        r.start_time DESC
      LIMIT 1
    `;

    const params = isId ? [searchTerm.toUpperCase(), parseInt(searchTerm, 10)] : [searchTerm.toUpperCase()];
    const [rows] = await db.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({
        found: false,
        message: `No active reservation found for "${searchTerm}".`
      });
    }

    const reservation = rows[0];
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);

    let isValid = false;
    let actionType = null; // 'check-in' or 'check-out'
    let verificationMessage = '';
    let isEarly = false;
    let isLate = false;

    // Check Status and Time Validity
    if (reservation.status === 'Pending') {
      actionType = 'check-in';
      // Grace period: allowed to check in 30 minutes before start_time up until end_time
      const earlyThreshold = new Date(startTime.getTime() - 30 * 60 * 1000);

      if (now < earlyThreshold) {
        isValid = false;
        isEarly = true;
        verificationMessage = `Too early. Booking starts at ${reservation.start_time}. Allowed check-in begins 30 minutes prior.`;
      } else if (now > endTime) {
        isValid = false;
        isLate = true;
        verificationMessage = `Reservation expired at ${reservation.end_time}. Please consult the operator for assistance.`;
      } else {
        isValid = true;
        verificationMessage = `Valid Reservation for Check-In. Assigned Floor ${reservation.floor_number}, Slot ${reservation.slot_number} (${reservation.slot_type}).`;
      }
    } else if (reservation.status === 'Checked-In') {
      actionType = 'check-out';
      isValid = true;
      if (now > endTime) {
        isLate = true;
        const overMinutes = Math.round((now - endTime) / 60000);
        verificationMessage = `Vehicle is currently Checked-In. Overstay detected (+${overMinutes} min). Gate may open for departure.`;
      } else {
        verificationMessage = 'Vehicle is currently Checked-In. Valid for Departure / Check-Out.';
      }
    } else if (reservation.status === 'Checked-Out') {
      isValid = false;
      verificationMessage = `Vehicle already checked out at ${reservation.check_out_time || 'earlier'}.`;
    }

    res.json({
      found: true,
      isValid,
      actionType,
      verificationMessage,
      isEarly,
      isLate,
      currentTime: now.toISOString(),
      reservation
    });
  } catch (err) {
    console.error('Guard verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/guard/action - Perform Check-In or Check-Out (Open Gate)
router.post('/action', verifyToken, requireRoles('guard', 'admin', 'operator'), async (req, res) => {
  const { reservationId, action } = req.body;

  if (!reservationId || !action) {
    return res.status(400).json({ error: 'reservationId and action are required' });
  }

  if (action !== 'check-in' && action !== 'check-out') {
    return res.status(400).json({ error: 'Action must be check-in or check-out' });
  }

  try {
    const [rows] = await db.query(`
      SELECT r.*, s.floor_number, s.slot_number, s.slot_type
      FROM Reservations r
      JOIN Slots s ON r.slot_id = s.id
      WHERE r.id = ?
    `, [reservationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'check-in') {
      if (reservation.status !== 'Pending') {
        return res.status(400).json({ error: `Cannot check-in reservation with status '${reservation.status}'` });
      }

      await db.query(`
        UPDATE Reservations
        SET status = 'Checked-In', check_in_time = ?
        WHERE id = ?
      `, [nowStr, reservationId]);

      await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
        'GATE_CHECK_IN',
        `Guard ${req.user.username} checked-in vehicle [${reservation.license_plate}] for Booking #${reservationId} (Floor ${reservation.floor_number}, Slot ${reservation.slot_number}). Gate opened.`,
        req.user.id
      ]);

      return res.json({
        message: 'Gate Opened! Vehicle successfully Checked-In.',
        status: 'Checked-In',
        check_in_time: nowStr,
        reservationId
      });
    } else {
      // check-out
      if (reservation.status !== 'Checked-In') {
        return res.status(400).json({ error: `Cannot check-out reservation with status '${reservation.status}'` });
      }

      await db.query(`
        UPDATE Reservations
        SET status = 'Checked-Out', check_out_time = ?
        WHERE id = ?
      `, [nowStr, reservationId]);

      await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
        'GATE_CHECK_OUT',
        `Guard ${req.user.username} checked-out vehicle [${reservation.license_plate}] for Booking #${reservationId}. Gate opened.`,
        req.user.id
      ]);

      return res.json({
        message: 'Gate Opened! Vehicle successfully Checked-Out.',
        status: 'Checked-Out',
        check_out_time: nowStr,
        reservationId
      });
    }
  } catch (err) {
    console.error('Guard action error:', err);
    res.status(500).json({ error: 'Failed to perform gate operation' });
  }
});

module.exports = router;
