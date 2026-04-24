const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT mt.*, f.name AS facility_name FROM maintenance_tasks mt LEFT JOIN facilities f ON mt.facility_id = f.id ORDER BY mt.scheduled_date DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT mt.*, f.name AS facility_name FROM maintenance_tasks mt LEFT JOIN facilities f ON mt.facility_id = f.id WHERE mt.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, task_name, task_type, priority, assigned_to, description, status, estimated_cost, actual_cost, scheduled_date, completed_date, notes } = req.body;
    const result = await db.query(
      'INSERT INTO maintenance_tasks (facility_id, task_name, task_type, priority, assigned_to, description, status, estimated_cost, actual_cost, scheduled_date, completed_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [facility_id, task_name, task_type || 'other', priority || 'medium', assigned_to, description, status || 'pending', estimated_cost, actual_cost, scheduled_date, completed_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, task_name, task_type, priority, assigned_to, description, status, estimated_cost, actual_cost, scheduled_date, completed_date, notes } = req.body;
    const result = await db.query(
      'UPDATE maintenance_tasks SET facility_id=$1, task_name=$2, task_type=$3, priority=$4, assigned_to=$5, description=$6, status=$7, estimated_cost=$8, actual_cost=$9, scheduled_date=$10, completed_date=$11, notes=$12, updated_at=NOW() WHERE id=$13 RETURNING *',
      [facility_id, task_name, task_type, priority, assigned_to, description, status, estimated_cost, actual_cost, scheduled_date, completed_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM maintenance_tasks WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Maintenance task deleted', maintenance_task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
