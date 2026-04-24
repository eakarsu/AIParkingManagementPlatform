const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT e.*, f.name AS facility_name FROM ev_stations e LEFT JOIN facilities f ON e.facility_id = f.id ORDER BY e.station_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT e.*, f.name AS facility_name FROM ev_stations e LEFT JOIN facilities f ON e.facility_id = f.id WHERE e.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'EV station not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, station_name, connector_type, power_kw, status, current_vehicle_plate, session_start, energy_delivered_kwh, rate_per_kwh, notes } = req.body;
    const result = await db.query(
      'INSERT INTO ev_stations (facility_id, station_name, connector_type, power_kw, status, current_vehicle_plate, session_start, energy_delivered_kwh, rate_per_kwh, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [facility_id, station_name, connector_type || 'Type2', power_kw, status || 'available', current_vehicle_plate, session_start, energy_delivered_kwh, rate_per_kwh, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, station_name, connector_type, power_kw, status, current_vehicle_plate, session_start, energy_delivered_kwh, rate_per_kwh, notes } = req.body;
    const result = await db.query(
      'UPDATE ev_stations SET facility_id=$1, station_name=$2, connector_type=$3, power_kw=$4, status=$5, current_vehicle_plate=$6, session_start=$7, energy_delivered_kwh=$8, rate_per_kwh=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [facility_id, station_name, connector_type, power_kw, status, current_vehicle_plate, session_start, energy_delivered_kwh, rate_per_kwh, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ev_stations WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'EV station deleted', ev_station: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
