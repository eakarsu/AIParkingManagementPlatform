const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const [result, count] = await Promise.all([
      db.query('SELECT pz.*, f.name AS facility_name FROM parking_zones pz LEFT JOIN facilities f ON pz.facility_id = f.id ORDER BY pz.zone_code LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM parking_zones'),
    ]);
    res.json({ data: result.rows, page, limit, total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT pz.*, f.name AS facility_name FROM parking_zones pz LEFT JOIN facilities f ON pz.facility_id = f.id WHERE pz.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Parking zone not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, zone_name, zone_code, zone_type, total_spots, occupied_spots, hourly_rate, is_covered, floor_level, status, max_height_ft, notes } = req.body;
    const result = await db.query(
      'INSERT INTO parking_zones (facility_id, zone_name, zone_code, zone_type, total_spots, occupied_spots, hourly_rate, is_covered, floor_level, status, max_height_ft, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [facility_id, zone_name, zone_code, zone_type || 'regular', total_spots, occupied_spots || 0, hourly_rate, is_covered !== undefined ? is_covered : false, floor_level, status || 'active', max_height_ft, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, zone_name, zone_code, zone_type, total_spots, occupied_spots, hourly_rate, is_covered, floor_level, status, max_height_ft, notes } = req.body;
    const result = await db.query(
      'UPDATE parking_zones SET facility_id=$1, zone_name=$2, zone_code=$3, zone_type=$4, total_spots=$5, occupied_spots=$6, hourly_rate=$7, is_covered=$8, floor_level=$9, status=$10, max_height_ft=$11, notes=$12, updated_at=NOW() WHERE id=$13 RETURNING *',
      [facility_id, zone_name, zone_code, zone_type, total_spots, occupied_spots, hourly_rate, is_covered, floor_level, status, max_height_ft, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM parking_zones WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Parking zone deleted', parking_zone: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
