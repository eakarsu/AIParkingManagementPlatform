const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT p.*, f.name AS facility_name FROM permits p LEFT JOIN facilities f ON p.facility_id = f.id ORDER BY p.permit_number'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT p.*, f.name AS facility_name FROM permits p LEFT JOIN facilities f ON p.facility_id = f.id WHERE p.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Permit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, permit_number, holder_name, holder_email, plate_number, permit_type, start_date, end_date, monthly_rate, status, zone_access, notes } = req.body;
    const result = await db.query(
      'INSERT INTO permits (facility_id, permit_number, holder_name, holder_email, plate_number, permit_type, start_date, end_date, monthly_rate, status, zone_access, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [facility_id, permit_number, holder_name, holder_email, plate_number, permit_type || 'monthly', start_date, end_date, monthly_rate, status || 'active', zone_access, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, permit_number, holder_name, holder_email, plate_number, permit_type, start_date, end_date, monthly_rate, status, zone_access, notes } = req.body;
    const result = await db.query(
      'UPDATE permits SET facility_id=$1, permit_number=$2, holder_name=$3, holder_email=$4, plate_number=$5, permit_type=$6, start_date=$7, end_date=$8, monthly_rate=$9, status=$10, zone_access=$11, notes=$12, updated_at=NOW() WHERE id=$13 RETURNING *',
      [facility_id, permit_number, holder_name, holder_email, plate_number, permit_type, start_date, end_date, monthly_rate, status, zone_access, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM permits WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Permit deleted', permit: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
