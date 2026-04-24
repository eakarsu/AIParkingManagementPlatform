const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, f.name as facility_name FROM pricing_rules p
       JOIN facilities f ON p.facility_id = f.id ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, f.name as facility_name FROM pricing_rules p
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
    const { facility_id, rule_name, base_rate, peak_multiplier, off_peak_multiplier, surge_threshold, time_start, time_end, day_type, status } = req.body;
    const result = await db.query(
      `INSERT INTO pricing_rules (facility_id, rule_name, base_rate, peak_multiplier, off_peak_multiplier, surge_threshold, time_start, time_end, day_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [facility_id, rule_name, base_rate, peak_multiplier || 1.5, off_peak_multiplier || 0.8, surge_threshold || 85, time_start || '08:00', time_end || '18:00', day_type || 'weekday', status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, rule_name, base_rate, peak_multiplier, off_peak_multiplier, surge_threshold, time_start, time_end, day_type, status } = req.body;
    const result = await db.query(
      `UPDATE pricing_rules SET facility_id=$1, rule_name=$2, base_rate=$3, peak_multiplier=$4, off_peak_multiplier=$5, surge_threshold=$6, time_start=$7, time_end=$8, day_type=$9, status=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
      [facility_id, rule_name, base_rate, peak_multiplier, off_peak_multiplier, surge_threshold, time_start, time_end, day_type, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM pricing_rules WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
