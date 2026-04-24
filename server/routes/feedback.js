const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT cf.*, f.name AS facility_name FROM customer_feedback cf LEFT JOIN facilities f ON cf.facility_id = f.id ORDER BY cf.created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT cf.*, f.name AS facility_name FROM customer_feedback cf LEFT JOIN facilities f ON cf.facility_id = f.id WHERE cf.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Feedback not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { facility_id, customer_name, customer_email, rating, category, subject, message, response, status, sentiment } = req.body;
    const result = await db.query(
      'INSERT INTO customer_feedback (facility_id, customer_name, customer_email, rating, category, subject, message, response, status, sentiment) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [facility_id, customer_name, customer_email, rating, category || 'general', subject, message, response, status || 'new', sentiment || 'neutral']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { facility_id, customer_name, customer_email, rating, category, subject, message, response, status, sentiment } = req.body;
    const result = await db.query(
      'UPDATE customer_feedback SET facility_id=$1, customer_name=$2, customer_email=$3, rating=$4, category=$5, subject=$6, message=$7, response=$8, status=$9, sentiment=$10, updated_at=NOW() WHERE id=$11 RETURNING *',
      [facility_id, customer_name, customer_email, rating, category, subject, message, response, status, sentiment, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM customer_feedback WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Feedback deleted', feedback: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
