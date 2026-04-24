const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    const [facilities, occupancy, violations, revenue, payments, plates, sensors, evStations, reservations, permits, analytics, cameras, maintenance, feedback, zones] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM facilities'),
      db.query('SELECT AVG(occupancy_rate) as avg_rate, COUNT(*) as count FROM occupancy_records'),
      db.query("SELECT COUNT(*) as count, SUM(fine_amount) as total_fines FROM violations WHERE status = 'pending'"),
      db.query('SELECT SUM(total_revenue) as total, AVG(optimization_score) as avg_score FROM revenue_records'),
      db.query("SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE payment_status = 'completed'"),
      db.query('SELECT COUNT(*) as count FROM plate_records'),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'online') as online FROM sensors"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'available') as available FROM ev_stations"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'confirmed' OR status = 'active') as active FROM reservations"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM permits"),
      db.query("SELECT COUNT(*) as count FROM analytics_reports WHERE status = 'generated'"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM security_cameras"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending' OR status = 'in_progress') as open FROM maintenance_tasks"),
      db.query('SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM customer_feedback'),
      db.query('SELECT COUNT(*) as total, SUM(occupied_spots) as occupied, SUM(total_spots) as capacity FROM parking_zones'),
    ]);

    res.json({
      facilities: parseInt(facilities.rows[0].count),
      avgOccupancy: parseFloat(occupancy.rows[0].avg_rate || 0).toFixed(1),
      occupancyRecords: parseInt(occupancy.rows[0].count),
      pendingViolations: parseInt(violations.rows[0].count),
      totalFines: parseFloat(violations.rows[0].total_fines || 0).toFixed(2),
      totalRevenue: parseFloat(revenue.rows[0].total || 0).toFixed(2),
      avgOptimizationScore: parseFloat(revenue.rows[0].avg_score || 0).toFixed(1),
      completedPayments: parseInt(payments.rows[0].count),
      paymentTotal: parseFloat(payments.rows[0].total || 0).toFixed(2),
      plateRecords: parseInt(plates.rows[0].count),
      sensorsOnline: parseInt(sensors.rows[0].online),
      sensorsTotal: parseInt(sensors.rows[0].total),
      evAvailable: parseInt(evStations.rows[0].available),
      evTotal: parseInt(evStations.rows[0].total),
      activeReservations: parseInt(reservations.rows[0].active),
      totalReservations: parseInt(reservations.rows[0].total),
      activePermits: parseInt(permits.rows[0].active),
      totalPermits: parseInt(permits.rows[0].total),
      generatedReports: parseInt(analytics.rows[0].count),
      activeCameras: parseInt(cameras.rows[0].active),
      totalCameras: parseInt(cameras.rows[0].total),
      openMaintenance: parseInt(maintenance.rows[0].open),
      totalMaintenance: parseInt(maintenance.rows[0].total),
      avgFeedbackRating: parseFloat(feedback.rows[0].avg_rating || 0).toFixed(1),
      totalFeedback: parseInt(feedback.rows[0].total),
      zoneCapacity: parseInt(zones.rows[0].capacity || 0),
      zoneOccupied: parseInt(zones.rows[0].occupied || 0),
      totalZones: parseInt(zones.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
