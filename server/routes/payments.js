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
      db.query(`SELECT p.*, f.name as facility_name FROM payments p JOIN facilities f ON p.facility_id = f.id ORDER BY p.payment_time DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      db.query('SELECT COUNT(*) FROM payments'),
    ]);
    res.json({ data: result.rows, page, limit, total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, f.name as facility_name FROM payments p
       JOIN facilities f ON p.facility_id = f.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, plate_number, amount, payment_method, payment_status, duration_hours, phone_number, transaction_ref, notes } = req.body;
    const result = await db.query(
      `INSERT INTO payments (facility_id, plate_number, amount, payment_method, payment_status, duration_hours, phone_number, transaction_ref, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [facility_id, plate_number, amount, payment_method || 'mobile', payment_status || 'completed', duration_hours || 1, phone_number || '', transaction_ref || `TXN-${Date.now()}`, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, plate_number, amount, payment_method, payment_status, duration_hours, phone_number, transaction_ref, notes } = req.body;
    const result = await db.query(
      `UPDATE payments SET facility_id=$1, plate_number=$2, amount=$3, payment_method=$4, payment_status=$5, duration_hours=$6, phone_number=$7, transaction_ref=$8, notes=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
      [facility_id, plate_number, amount, payment_method, payment_status, duration_hours, phone_number, transaction_ref, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM payments WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
