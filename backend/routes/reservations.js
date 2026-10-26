const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');

// POST /api/reservations - Create a reservation
router.post('/', verifyToken, async (req, res) => {
  const { slot_id, license_plate, start_time, end_time, walk_in_user_id } = req.body;

  if (!slot_id || !license_plate || !start_time || !end_time) {
    return res.status(400).json({ error: 'slot_id, license_plate, start_time, and end_time are required' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (end <= start) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  // Calculate strictly hourly duration
  const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));

  // Target user ID: if operator/admin creates walk-in reservation, they can specify user_id or use their own
  const targetUserId = (req.user.role === 'admin' || req.user.role === 'operator') && walk_in_user_id
    ? walk_in_user_id
    : req.user.id;

  try {
    // 1. Fetch slot information
    const [slots] = await db.query('SELECT * FROM Slots WHERE id = ?', [slot_id]);
    if (slots.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    const slot = slots[0];

    // 2. Fetch current rate for this slot's vehicle type
    const [rates] = await db.query('SELECT hourly_rate FROM Rates WHERE vehicle_type = ?', [slot.slot_type]);
    if (rates.length === 0) {
      return res.status(500).json({ error: 'Hourly rate not found for vehicle type' });
    }
    const hourlyRate = parseFloat(rates[0].hourly_rate);
    const totalCharge = (durationHours * hourlyRate).toFixed(2);

    // 3. Double check for conflicts
    const [conflicts] = await db.query(`
      SELECT id FROM Reservations
      WHERE slot_id = ?
        AND status IN ('Pending', 'Checked-In')
        AND start_time < ?
        AND end_time > ?
    `, [slot_id, end_time, start_time]);

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'This slot is already booked for the selected time range' });
    }

    // 4. Insert reservation
    const [insertResult] = await db.query(`
      INSERT INTO Reservations (user_id, slot_id, license_plate, start_time, end_time, total_charge, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `, [targetUserId, slot_id, license_plate.trim().toUpperCase(), start_time, end_time, totalCharge]);

    const bookingId = insertResult.insertId;

    // 5. System log
    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'RESERVATION_CREATED',
      `Booking #${bookingId} created by ${req.user.username} for plate ${license_plate.toUpperCase()} on Floor ${slot.floor_number} Slot ${slot.slot_number} (${slot.slot_type}) for $${totalCharge} (${durationHours} hrs).`,
      req.user.id
    ]);

    res.status(201).json({
      message: 'Reservation created successfully',
      bookingId,
      reservation: {
        id: bookingId,
        user_id: targetUserId,
        slot_id,
        floor_number: slot.floor_number,
        slot_number: slot.slot_number,
        slot_type: slot.slot_type,
        license_plate: license_plate.trim().toUpperCase(),
        start_time,
        end_time,
        durationHours,
        hourlyRate,
        total_charge: parseFloat(totalCharge),
        status: 'Pending'
      }
    });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// GET /api/reservations/my - Customer's own active & past reservations
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, s.floor_number, s.slot_type, s.slot_number
      FROM Reservations r
      JOIN Slots s ON r.slot_id = s.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching my reservations:', err);
    res.status(500).json({ error: 'Failed to fetch your reservations' });
  }
});

// GET /api/reservations - Admin and Operator view all reservations
router.get('/', verifyToken, requireRoles('admin', 'operator'), async (req, res) => {
  const { status, floor, search } = req.query;
  let query = `
    SELECT r.*, s.floor_number, s.slot_type, s.slot_number, u.username
    FROM Reservations r
    JOIN Slots s ON r.slot_id = s.id
    JOIN Users u ON r.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }
  if (floor) {
    query += ' AND s.floor_number = ?';
    params.push(floor);
  }
  if (search) {
    query += ' AND (r.license_plate LIKE ? OR r.id = ? OR u.username LIKE ?)';
    params.push(`%${search}%`, isNaN(search) ? 0 : search, `%${search}%`);
  }

  query += ' ORDER BY r.created_at DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// PATCH /api/reservations/:id/cancel - Cancel reservation
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM Reservations WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];

    // Customer can only cancel their own pending reservation
    if (req.user.role === 'customer') {
      if (reservation.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot cancel another user reservation' });
      }
      if (reservation.status !== 'Pending') {
        return res.status(400).json({ error: 'Can only cancel Pending reservations' });
      }
    }

    await db.query("UPDATE Reservations SET status = 'Cancelled' WHERE id = ?", [id]);

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'RESERVATION_CANCELLED',
      `Reservation #${id} was cancelled by ${req.user.username} (${req.user.role}).`,
      req.user.id
    ]);

    res.json({ message: 'Reservation cancelled successfully', id });
  } catch (err) {
    console.error('Cancel reservation error:', err);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

// PATCH /api/reservations/:id/extend - Operator & Admin extension override
router.patch('/:id/extend', verifyToken, requireRoles('admin', 'operator'), async (req, res) => {
  const { id } = req.params;
  const { extraHours } = req.body;

  if (!extraHours || isNaN(extraHours) || extraHours <= 0) {
    return res.status(400).json({ error: 'Positive extraHours required' });
  }

  try {
    const [rows] = await db.query(`
      SELECT r.*, s.slot_type
      FROM Reservations r
      JOIN Slots s ON r.slot_id = s.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];
    if (reservation.status === 'Cancelled' || reservation.status === 'Checked-Out') {
      return res.status(400).json({ error: `Cannot extend reservation with status: ${reservation.status}` });
    }

    const currentEndTime = new Date(reservation.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + extraHours * 60 * 60 * 1000);
    const newEndTimeStr = newEndTime.toISOString().slice(0, 19).replace('T', ' ');

    // Verify no conflicting reservation on this slot
    const [conflicts] = await db.query(`
      SELECT id FROM Reservations
      WHERE slot_id = ?
        AND id != ?
        AND status IN ('Pending', 'Checked-In')
        AND start_time < ?
        AND end_time > ?
    `, [reservation.slot_id, id, newEndTimeStr, reservation.end_time]);

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Cannot extend: Slot is reserved by another booking during that time' });
    }

    // Calculate added charge
    const [rates] = await db.query('SELECT hourly_rate FROM Rates WHERE vehicle_type = ?', [reservation.slot_type]);
    const hourlyRate = rates.length > 0 ? parseFloat(rates[0].hourly_rate) : 5.0;
    const additionalCharge = (parseFloat(extraHours) * hourlyRate);
    const newTotalCharge = (parseFloat(reservation.total_charge) + additionalCharge).toFixed(2);

    await db.query(`
      UPDATE Reservations
      SET end_time = ?, total_charge = ?
      WHERE id = ?
    `, [newEndTimeStr, newTotalCharge, id]);

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'RESERVATION_EXTENDED',
      `Reservation #${id} extended by ${extraHours} hour(s) by ${req.user.username} (${req.user.role}). New end: ${newEndTimeStr}, New total: $${newTotalCharge}`,
      req.user.id
    ]);

    res.json({
      message: 'Reservation extended successfully',
      id,
      newEndTime: newEndTimeStr,
      newTotalCharge: parseFloat(newTotalCharge),
      additionalCharge
    });
  } catch (err) {
    console.error('Extend reservation error:', err);
    res.status(500).json({ error: 'Failed to extend reservation' });
  }
});

// PATCH /api/reservations/:id - Admin modification
router.patch('/:id', verifyToken, requireRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { license_plate, status, total_charge } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM Reservations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const updates = [];
    const params = [];

    if (license_plate) {
      updates.push('license_plate = ?');
      params.push(license_plate.trim().toUpperCase());
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (total_charge !== undefined) {
      updates.push('total_charge = ?');
      params.push(total_charge);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await db.query(`UPDATE Reservations SET ${updates.join(', ')} WHERE id = ?`, params);

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'RESERVATION_MODIFIED',
      `Reservation #${id} modified by Admin ${req.user.username}`,
      req.user.id
    ]);

    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    console.error('Error modifying reservation:', err);
    res.status(500).json({ error: 'Failed to modify reservation' });
  }
});

module.exports = router;
