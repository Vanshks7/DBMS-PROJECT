const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/slots - All facility slots (45 slots across 5 floors)
router.get('/', async (req, res) => {
  try {
    const [slots] = await db.query('SELECT * FROM Slots ORDER BY floor_number ASC, slot_type ASC, slot_number ASC');
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// GET /api/slots/available - Check available slots for a given time window & vehicle type (Car, Bike, EV)
router.get('/available', async (req, res) => {
  const { startTime, endTime, vehicleType } = req.query;

  if (!startTime || !endTime || !vehicleType) {
    return res.status(400).json({ error: 'startTime, endTime, and vehicleType are required' });
  }

  try {
    const [rateRows] = await db.query('SELECT hourly_rate FROM Rates WHERE vehicle_type = ?', [vehicleType]);
    if (rateRows.length === 0) {
      return res.status(400).json({ error: 'Invalid vehicle type' });
    }
    const hourlyRate = parseFloat(rateRows[0].hourly_rate);

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }
    const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    const estimatedCharge = (durationHours * hourlyRate).toFixed(2);

    const query = `
      SELECT s.*
      FROM Slots s
      WHERE s.slot_type = ?
        AND s.id NOT IN (
          SELECT r.slot_id
          FROM Reservations r
          WHERE r.status IN ('Pending', 'Checked-In')
            AND r.start_time < ?
            AND r.end_time > ?
        )
      ORDER BY s.floor_number ASC, s.slot_number ASC
    `;

    const [availableSlots] = await db.query(query, [vehicleType, endTime, startTime]);

    const byFloor = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    availableSlots.forEach(slot => {
      if (byFloor[slot.floor_number]) {
        byFloor[slot.floor_number].push(slot);
      }
    });

    res.json({
      vehicleType,
      hourlyRate,
      durationHours,
      estimatedCharge: parseFloat(estimatedCharge),
      totalAvailable: availableSlots.length,
      slots: availableSlots,
      byFloor
    });
  } catch (err) {
    console.error('Error checking slot availability:', err);
    res.status(500).json({ error: 'Failed to verify slot availability' });
  }
});

// GET /api/slots/occupancy - Real-time occupancy across 5 floors (Cars, Bikes, & EV Charging)
router.get('/occupancy', async (req, res) => {
  try {
    const [allSlots] = await db.query('SELECT * FROM Slots ORDER BY floor_number ASC, slot_type ASC, slot_number ASC');

    const [activeRes] = await db.query(`
      SELECT r.id AS reservation_id, r.slot_id, r.license_plate, r.start_time, r.end_time, r.status, u.username
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.id
      WHERE r.status = 'Checked-In'
         OR (r.status = 'Pending' AND NOW() BETWEEN r.start_time AND r.end_time)
    `);

    const activeMap = {};
    activeRes.forEach(r => {
      activeMap[r.slot_id] = r;
    });

    const floors = {};
    for (let f = 1; f <= 5; f++) {
      floors[f] = {
        floor_number: f,
        car: { total: 4, occupied: 0, available: 4 },
        bike: { total: 4, occupied: 0, available: 4 },
        ev: { total: 1, occupied: 0, available: 1 },
        slots: []
      };
    }

    allSlots.forEach(slot => {
      const activeBooking = activeMap[slot.id] || null;
      const isOccupied = !!activeBooking;
      const slotData = {
        id: slot.id,
        floor_number: slot.floor_number,
        slot_type: slot.slot_type,
        slot_number: slot.slot_number,
        isOccupied,
        status: isOccupied ? activeBooking.status : 'Available',
        activeBooking: activeBooking ? {
          reservation_id: activeBooking.reservation_id,
          license_plate: activeBooking.license_plate,
          username: activeBooking.username,
          start_time: activeBooking.start_time,
          end_time: activeBooking.end_time,
          status: activeBooking.status
        } : null
      };

      const floorObj = floors[slot.floor_number];
      floorObj.slots.push(slotData);

      if (slot.slot_type === 'Car' && isOccupied) {
        floorObj.car.occupied += 1;
        floorObj.car.available -= 1;
      } else if (slot.slot_type === 'Bike' && isOccupied) {
        floorObj.bike.occupied += 1;
        floorObj.bike.available -= 1;
      } else if (slot.slot_type === 'EV' && isOccupied) {
        floorObj.ev.occupied += 1;
        floorObj.ev.available -= 1;
      }
    });

    const floorArray = Object.values(floors);
    const overall = {
      totalCapacity: 45,
      totalOccupied: activeRes.length,
      totalAvailable: 45 - activeRes.length,
      carCapacity: 20,
      carOccupied: floorArray.reduce((acc, f) => acc + f.car.occupied, 0),
      bikeCapacity: 20,
      bikeOccupied: floorArray.reduce((acc, f) => acc + f.bike.occupied, 0),
      evCapacity: 5,
      evOccupied: floorArray.reduce((acc, f) => acc + f.ev.occupied, 0),
    };

    res.json({
      overall,
      floors: floorArray
    });
  } catch (err) {
    console.error('Error getting occupancy:', err);
    res.status(500).json({ error: 'Failed to retrieve facility occupancy' });
  }
});

module.exports = router;
