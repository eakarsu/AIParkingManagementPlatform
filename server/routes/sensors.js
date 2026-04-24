const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT s.*, f.name AS facility_name FROM sensors s LEFT JOIN facilities f ON s.facility_id = f.id ORDER BY s.sensor_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT s.*, f.name AS facility_name FROM sensors s LEFT JOIN facilities f ON s.facility_id = f.id WHERE s.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sensor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, sensor_name, sensor_type, location_zone, status, battery_level, last_reading, last_ping_at } = req.body;
    const result = await db.query(
      'INSERT INTO sensors (facility_id, sensor_name, sensor_type, location_zone, status, battery_level, last_reading, last_ping_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [facility_id, sensor_name, sensor_type || 'occupancy', location_zone, status || 'online', battery_level, last_reading, last_ping_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, sensor_name, sensor_type, location_zone, status, battery_level, last_reading, last_ping_at } = req.body;
    const result = await db.query(
      'UPDATE sensors SET facility_id=$1, sensor_name=$2, sensor_type=$3, location_zone=$4, status=$5, battery_level=$6, last_reading=$7, last_ping_at=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [facility_id, sensor_name, sensor_type, location_zone, status, battery_level, last_reading, last_ping_at, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM sensors WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Sensor deleted', sensor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
