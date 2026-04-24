const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, f.name as facility_name FROM violations v
       JOIN facilities f ON v.facility_id = f.id ORDER BY v.issued_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, f.name as facility_name FROM violations v
       JOIN facilities f ON v.facility_id = f.id WHERE v.id = $1`,
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
    const { facility_id, plate_number, violation_type, fine_amount, description, status, zone, evidence_url } = req.body;
    const result = await db.query(
      `INSERT INTO violations (facility_id, plate_number, violation_type, fine_amount, description, status, zone, evidence_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [facility_id, plate_number, violation_type, fine_amount, description || '', status || 'pending', zone || 'A1', evidence_url || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, plate_number, violation_type, fine_amount, description, status, zone, evidence_url } = req.body;
    const result = await db.query(
      `UPDATE violations SET facility_id=$1, plate_number=$2, violation_type=$3, fine_amount=$4, description=$5, status=$6, zone=$7, evidence_url=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [facility_id, plate_number, violation_type, fine_amount, description, status, zone, evidence_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM violations WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Violation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
