const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, f.name as facility_name FROM revenue_records r
       JOIN facilities f ON r.facility_id = f.id ORDER BY r.record_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, f.name as facility_name FROM revenue_records r
       JOIN facilities f ON r.facility_id = f.id WHERE r.id = $1`,
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
    const { facility_id, record_date, total_revenue, parking_revenue, violation_revenue, subscription_revenue, transactions_count, avg_duration_hours, optimization_score, notes } = req.body;
    const result = await db.query(
      `INSERT INTO revenue_records (facility_id, record_date, total_revenue, parking_revenue, violation_revenue, subscription_revenue, transactions_count, avg_duration_hours, optimization_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [facility_id, record_date, total_revenue, parking_revenue || 0, violation_revenue || 0, subscription_revenue || 0, transactions_count || 0, avg_duration_hours || 0, optimization_score || 0, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, record_date, total_revenue, parking_revenue, violation_revenue, subscription_revenue, transactions_count, avg_duration_hours, optimization_score, notes } = req.body;
    const result = await db.query(
      `UPDATE revenue_records SET facility_id=$1, record_date=$2, total_revenue=$3, parking_revenue=$4, violation_revenue=$5, subscription_revenue=$6, transactions_count=$7, avg_duration_hours=$8, optimization_score=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
      [facility_id, record_date, total_revenue, parking_revenue, violation_revenue, subscription_revenue, transactions_count, avg_duration_hours, optimization_score, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM revenue_records WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
