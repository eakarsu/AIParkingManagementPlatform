const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM facilities ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM facilities WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, address, total_spaces, hourly_rate, facility_type, status } = req.body;
    const result = await db.query(
      'INSERT INTO facilities (name, address, total_spaces, hourly_rate, facility_type, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, address, total_spaces, hourly_rate, facility_type || 'garage', status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, address, total_spaces, hourly_rate, facility_type, status } = req.body;
    const result = await db.query(
      'UPDATE facilities SET name=$1, address=$2, total_spaces=$3, hourly_rate=$4, facility_type=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, address, total_spaces, hourly_rate, facility_type, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM facilities WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Facility deleted', facility: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
