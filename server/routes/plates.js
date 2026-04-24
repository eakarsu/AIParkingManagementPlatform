const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, f.name as facility_name FROM plate_records p
       JOIN facilities f ON p.facility_id = f.id ORDER BY p.captured_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, f.name as facility_name FROM plate_records p
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
    const { facility_id, plate_number, state, vehicle_type, entry_exit, confidence, camera_id, notes } = req.body;
    const result = await db.query(
      `INSERT INTO plate_records (facility_id, plate_number, state, vehicle_type, entry_exit, confidence, camera_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [facility_id, plate_number, state || 'CA', vehicle_type || 'sedan', entry_exit || 'entry', confidence || 95.0, camera_id || 'CAM-01', notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, plate_number, state, vehicle_type, entry_exit, confidence, camera_id, notes } = req.body;
    const result = await db.query(
      `UPDATE plate_records SET facility_id=$1, plate_number=$2, state=$3, vehicle_type=$4, entry_exit=$5, confidence=$6, camera_id=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [facility_id, plate_number, state, vehicle_type, entry_exit, confidence, camera_id, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM plate_records WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
