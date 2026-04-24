const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

const ALLOWED_TABLES = {
  facilities: 'facilities',
  occupancy: 'occupancy_records',
  pricing: 'pricing_rules',
  plates: 'plate_records',
  violations: 'violations',
  revenue: 'revenue_records',
  payments: 'payments',
  sensors: 'sensors',
  ev_stations: 'ev_stations',
  reservations: 'reservations',
  permits: 'permits',
  analytics: 'analytics_reports',
  security: 'security_cameras',
  maintenance: 'maintenance_tasks',
  feedback: 'customer_feedback',
  zones: 'parking_zones',
  users: 'users',
  activity_log: 'activity_log',
};

// Export data as CSV
router.get('/:table', auth, async (req, res) => {
  try {
    const tableName = ALLOWED_TABLES[req.params.table];
    if (!tableName) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Exclude password_hash from users table
    let selectCols = '*';
    if (tableName === 'users') {
      selectCols = 'id, name, email, role, created_at, updated_at';
    }

    const result = await db.query(`SELECT ${selectCols} FROM ${tableName} ORDER BY id`);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.table}_export.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get available tables for export
router.get('/', auth, async (req, res) => {
  try {
    const tables = [];
    for (const [key, tableName] of Object.entries(ALLOWED_TABLES)) {
      const countResult = await db.query(`SELECT COUNT(*) FROM ${tableName}`);
      tables.push({
        key,
        table: tableName,
        count: parseInt(countResult.rows[0].count),
      });
    }
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
