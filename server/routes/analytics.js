const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT a.*, f.name AS facility_name FROM analytics_reports a LEFT JOIN facilities f ON a.facility_id = f.id ORDER BY a.period_start DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT a.*, f.name AS facility_name FROM analytics_reports a LEFT JOIN facilities f ON a.facility_id = f.id WHERE a.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Analytics report not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, report_type, report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status, notes } = req.body;
    const result = await db.query(
      'INSERT INTO analytics_reports (facility_id, report_type, report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
      [facility_id, report_type || 'daily', report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status || 'pending', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, report_type, report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status, notes } = req.body;
    const result = await db.query(
      'UPDATE analytics_reports SET facility_id=$1, report_type=$2, report_name=$3, period_start=$4, period_end=$5, total_revenue=$6, total_transactions=$7, avg_occupancy=$8, peak_occupancy=$9, avg_duration_hours=$10, unique_vehicles=$11, new_customers=$12, returning_customers=$13, status=$14, notes=$15, updated_at=NOW() WHERE id=$16 RETURNING *',
      [facility_id, report_type, report_name, period_start, period_end, total_revenue, total_transactions, avg_occupancy, peak_occupancy, avg_duration_hours, unique_vehicles, new_customers, returning_customers, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM analytics_reports WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Analytics report deleted', analytics_report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
