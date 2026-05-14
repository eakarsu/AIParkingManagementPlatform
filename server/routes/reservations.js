const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const [result, count] = await Promise.all([
      db.query(`SELECT r.*, f.name AS facility_name FROM reservations r LEFT JOIN facilities f ON r.facility_id = f.id ORDER BY r.start_time DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      db.query('SELECT COUNT(*) FROM reservations'),
    ]);
    res.json({ data: result.rows, page, limit, total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT r.*, f.name AS facility_name FROM reservations r LEFT JOIN facilities f ON r.facility_id = f.id WHERE r.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reservation not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status, total_amount, payment_method, notes } = req.body;
    const result = await db.query(
      'INSERT INTO reservations (facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status, total_amount, payment_method, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status || 'confirmed', total_amount, payment_method, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status, total_amount, payment_method, notes } = req.body;
    const result = await db.query(
      'UPDATE reservations SET facility_id=$1, customer_name=$2, customer_email=$3, customer_phone=$4, plate_number=$5, spot_number=$6, start_time=$7, end_time=$8, status=$9, total_amount=$10, payment_method=$11, notes=$12, updated_at=NOW() WHERE id=$13 RETURNING *',
      [facility_id, customer_name, customer_email, customer_phone, plate_number, spot_number, start_time, end_time, status, total_amount, payment_method, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM reservations WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Reservation deleted', reservation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
