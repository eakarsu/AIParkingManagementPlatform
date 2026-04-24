const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

// Get all activity logs with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const entityType = req.query.entity_type || null;
    const action = req.query.action || null;

    let query = 'SELECT * FROM activity_log WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (entityType) {
      query += ` AND entity_type = $${paramIdx++}`;
      params.push(entityType);
    }
    if (action) {
      query += ` AND action = $${paramIdx++}`;
      params.push(action);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({ logs: result.rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create activity log entry
router.post('/', auth, async (req, res) => {
  try {
    const { action, entity_type, entity_id, description } = req.body;
    const result = await db.query(
      'INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, req.user.name, action, entity_type, entity_id || null, description || '', req.ip || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create activity log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get activity stats
router.get('/stats', auth, async (req, res) => {
  try {
    const todayCount = await db.query(
      "SELECT COUNT(*) FROM activity_log WHERE created_at >= CURRENT_DATE"
    );
    const weekCount = await db.query(
      "SELECT COUNT(*) FROM activity_log WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
    );
    const byAction = await db.query(
      "SELECT action, COUNT(*) as count FROM activity_log WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY action ORDER BY count DESC LIMIT 10"
    );
    const byEntity = await db.query(
      "SELECT entity_type, COUNT(*) as count FROM activity_log WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY entity_type ORDER BY count DESC LIMIT 10"
    );
    const byUser = await db.query(
      "SELECT user_name, COUNT(*) as count FROM activity_log WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY user_name ORDER BY count DESC LIMIT 10"
    );
    res.json({
      today: parseInt(todayCount.rows[0].count),
      week: parseInt(weekCount.rows[0].count),
      by_action: byAction.rows,
      by_entity: byEntity.rows,
      by_user: byUser.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
