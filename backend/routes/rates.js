const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');

// GET /api/rates - Get all vehicle rates (Car, Bike, EV)
router.get('/', async (req, res) => {
  try {
    const [rates] = await db.query('SELECT vehicle_type, hourly_rate, updated_at FROM Rates');
    res.json(rates);
  } catch (err) {
    console.error('Error fetching rates:', err);
    res.status(500).json({ error: 'Failed to retrieve rates' });
  }
});

// PUT /api/rates - Admin update rates
router.put('/', verifyToken, requireRoles('admin'), async (req, res) => {
  const { rates } = req.body;

  if (!rates) {
    return res.status(400).json({ error: 'Rates data required' });
  }

  try {
    if (Array.isArray(rates)) {
      for (const r of rates) {
        if (r.vehicle_type && r.hourly_rate !== undefined) {
          await db.query(
            'UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?',
            [parseFloat(r.hourly_rate), r.vehicle_type]
          );
        }
      }
    } else {
      if (rates.Car !== undefined || rates.carRate !== undefined) {
        const rate = rates.Car !== undefined ? rates.Car : rates.carRate;
        await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(rate), 'Car']);
      }
      if (rates.Bike !== undefined || rates.bikeRate !== undefined) {
        const rate = rates.Bike !== undefined ? rates.Bike : rates.bikeRate;
        await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(rate), 'Bike']);
      }
      if (rates.EV !== undefined || rates.evRate !== undefined) {
        const rate = rates.EV !== undefined ? rates.EV : rates.evRate;
        await db.query('UPDATE Rates SET hourly_rate = ? WHERE vehicle_type = ?', [parseFloat(rate), 'EV']);
      }
    }

    await db.query('INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)', [
      'RATES_UPDATED',
      `Admin @${req.user.username} updated hourly parking rates (in INR ₹).`,
      req.user.id
    ]);

    const [updated] = await db.query('SELECT vehicle_type, hourly_rate, updated_at FROM Rates');
    res.json({ message: 'Rates updated successfully', rates: updated });
  } catch (err) {
    console.error('Error updating rates:', err);
    res.status(500).json({ error: 'Failed to update rates' });
  }
});

module.exports = router;
