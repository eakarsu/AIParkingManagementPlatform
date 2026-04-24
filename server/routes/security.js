const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT sc.*, f.name AS facility_name FROM security_cameras sc LEFT JOIN facilities f ON sc.facility_id = f.id ORDER BY sc.camera_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT sc.*, f.name AS facility_name FROM security_cameras sc LEFT JOIN facilities f ON sc.facility_id = f.id WHERE sc.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Security camera not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, camera_name, camera_type, location_zone, stream_url, status, resolution, recording_enabled, motion_detected, last_motion_at, notes } = req.body;
    const result = await db.query(
      'INSERT INTO security_cameras (facility_id, camera_name, camera_type, location_zone, stream_url, status, resolution, recording_enabled, motion_detected, last_motion_at, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [facility_id, camera_name, camera_type || 'fixed', location_zone, stream_url, status || 'active', resolution, recording_enabled !== undefined ? recording_enabled : true, motion_detected !== undefined ? motion_detected : false, last_motion_at, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, camera_name, camera_type, location_zone, stream_url, status, resolution, recording_enabled, motion_detected, last_motion_at, notes } = req.body;
    const result = await db.query(
      'UPDATE security_cameras SET facility_id=$1, camera_name=$2, camera_type=$3, location_zone=$4, stream_url=$5, status=$6, resolution=$7, recording_enabled=$8, motion_detected=$9, last_motion_at=$10, notes=$11, updated_at=NOW() WHERE id=$12 RETURNING *',
      [facility_id, camera_name, camera_type, location_zone, stream_url, status, resolution, recording_enabled, motion_detected, last_motion_at, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM security_cameras WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Security camera deleted', security_camera: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
