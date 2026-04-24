const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, f.name as facility_name FROM occupancy_records o
       JOIN facilities f ON o.facility_id = f.id ORDER BY o.recorded_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, f.name as facility_name FROM occupancy_records o
       JOIN facilities f ON o.facility_id = f.id WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, occupied_spaces, total_spaces, prediction_confidence, predicted_occupancy, notes } = req.body;
    const occupancy_rate = ((occupied_spaces / total_spaces) * 100).toFixed(1);
    const result = await db.query(
      `INSERT INTO occupancy_records (facility_id, occupied_spaces, total_spaces, occupancy_rate, prediction_confidence, predicted_occupancy, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [facility_id, occupied_spaces, total_spaces, occupancy_rate, prediction_confidence || 0, predicted_occupancy || 0, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, occupied_spaces, total_spaces, prediction_confidence, predicted_occupancy, notes } = req.body;
    const occupancy_rate = ((occupied_spaces / total_spaces) * 100).toFixed(1);
    const result = await db.query(
      `UPDATE occupancy_records SET facility_id=$1, occupied_spaces=$2, total_spaces=$3, occupancy_rate=$4, prediction_confidence=$5, predicted_occupancy=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [facility_id, occupied_spaces, total_spaces, occupancy_rate, prediction_confidence, predicted_occupancy, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM occupancy_records WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
