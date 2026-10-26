require('dotenv').config();
const db = require('./db');

async function seedSampleBookings() {
  console.log('Seeding initial sample bookings for testing...');
  
  // Get customer id
  const [users] = await db.query("SELECT id, username FROM Users WHERE role = 'customer' LIMIT 2");
  if (users.length === 0) return;
  const customerId = users[0].id;

  // Get some slots (e.g., Slot on floor 1 and floor 2)
  const [slots] = await db.query("SELECT id, floor_number, slot_type, slot_number FROM Slots WHERE (floor_number = 1 AND slot_number = 'C1') OR (floor_number = 1 AND slot_number = 'B1') OR (floor_number = 2 AND slot_number = 'C2')");

  const now = new Date();
  const startPending = new Date(now.getTime() + 10 * 60 * 1000); // starts in 10 mins
  const endPending = new Date(now.getTime() + 130 * 60 * 1000); // 2 hrs

  const startCheckedIn = new Date(now.getTime() - 45 * 60 * 1000); // started 45m ago
  const endCheckedIn = new Date(now.getTime() + 75 * 60 * 1000); // ends in 1h15m

  const startPast = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endPast = new Date(now.getTime() - 22 * 60 * 60 * 1000);

  // Clear existing reservations to have a fresh state
  await db.query("DELETE FROM Reservations");

  if (slots.length >= 3) {
    // 1. Pending reservation (Vehicle arriving soon) - Ready for Guard check-in test
    await db.query(`
      INSERT INTO Reservations (user_id, slot_id, license_plate, start_time, end_time, total_charge, status)
      VALUES (?, ?, 'KA-01-AB-1234', ?, ?, 10.00, 'Pending')
    `, [customerId, slots[0].id, startPending.toISOString().slice(0, 19).replace('T', ' '), endPending.toISOString().slice(0, 19).replace('T', ' ')]);

    // 2. Checked-In reservation (Vehicle currently parked) - Ready for Guard check-out test
    await db.query(`
      INSERT INTO Reservations (user_id, slot_id, license_plate, start_time, end_time, total_charge, status, check_in_time)
      VALUES (?, ?, 'DL-04-XY-9876', ?, ?, 4.00, 'Checked-In', ?)
    `, [customerId, slots[1].id, startCheckedIn.toISOString().slice(0, 19).replace('T', ' '), endCheckedIn.toISOString().slice(0, 19).replace('T', ' '), startCheckedIn.toISOString().slice(0, 19).replace('T', ' ')]);

    // 3. Checked-Out past reservation (Completed history)
    await db.query(`
      INSERT INTO Reservations (user_id, slot_id, license_plate, start_time, end_time, total_charge, status, check_in_time, check_out_time)
      VALUES (?, ?, 'MH-12-PQ-5555', ?, ?, 10.00, 'Checked-Out', ?, ?)
    `, [customerId, slots[2].id, startPast.toISOString().slice(0, 19).replace('T', ' '), endPast.toISOString().slice(0, 19).replace('T', ' '), startPast.toISOString().slice(0, 19).replace('T', ' '), endPast.toISOString().slice(0, 19).replace('T', ' ')]);

    console.log('Sample reservations seeded:');
    console.log('- Booking #1: KA-01-AB-1234 (Floor 1 C1, Pending)');
    console.log('- Booking #2: DL-04-XY-9876 (Floor 1 B1, Checked-In)');
    console.log('- Booking #3: MH-12-PQ-5555 (Floor 2 C2, Checked-Out)');
  }

  process.exit(0);
}

seedSampleBookings().catch(err => {
  console.error(err);
  process.exit(1);
});
