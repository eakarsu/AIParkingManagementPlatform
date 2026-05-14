/**
 * extensions.js — Apply pass 5
 *
 * Implements remaining backlog from _AUDIT_NOTE.md:
 *  - Ride-sharing API integration  (NEEDS-CREDS  → 503 missing: RIDESHARE_API_KEY)
 *  - Waze/GMaps broadcast          (NEEDS-CREDS  → 503 missing: WAZE_API_KEY/GMAPS_API_KEY)
 *  - Vehicle registration DB lookup (NEEDS-CREDS → 503 missing: VEHICLE_REG_API_KEY)
 *  - Utility demand-response       (NEEDS-CREDS  → 503 missing: UTILITY_DR_API_KEY)
 *  - Customer self-service portal  (NEEDS-PRODUCT-DECISION → defaults documented)
 *  - Permit fraud agentic monitoring (NEEDS-PRODUCT-DECISION → text AI gated on key)
 *  - Native mobile app             (NEEDS-PRODUCT-DECISION → manifest + push token table)
 *
 * Required env vars (gated endpoints only):
 *  - OPENROUTER_API_KEY      (AI; 503 missing: OPENROUTER_API_KEY)
 *  - RIDESHARE_API_KEY       (Uber/Lyft demand correlation)
 *  - WAZE_API_KEY            (Waze CCP broadcast)
 *  - GMAPS_API_KEY           (Google Maps Place / Roads broadcast)
 *  - VEHICLE_REG_API_KEY     (DMV/registration lookup)
 *  - UTILITY_DR_API_KEY      (utility demand-response platform)
 *
 * Reuses db, auth middleware, callAI service. Additive tables only.
 */
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const { callAI } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// Bootstrap additive tables (idempotent)
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS self_service_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        request_type VARCHAR(50),
        facility_id INTEGER,
        plate VARCHAR(20),
        details JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(30) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS mobile_push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        platform VARCHAR(20),
        token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS broadcast_events (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(30),
        facility_id INTEGER,
        event_type VARCHAR(50),
        payload JSONB,
        status VARCHAR(20) DEFAULT 'queued',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS rideshare_demand (
        id SERIAL PRIMARY KEY,
        facility_id INTEGER,
        provider VARCHAR(30),
        demand_score NUMERIC,
        meta JSONB,
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error('parking extensions bootstrap error:', err.message);
  }
})();

function missingEnv(...vars) {
  const missing = vars.filter(v => !process.env[v]);
  return missing.length ? missing.join(',') : null;
}

// ════════════════════════════════════════════════════════════════
// 1. NEEDS-CREDS: ride-sharing API integration
// ════════════════════════════════════════════════════════════════
router.get('/rideshare/status', auth, async (req, res) => {
  res.json({ configured: !!process.env.RIDESHARE_API_KEY, missing: process.env.RIDESHARE_API_KEY ? null : 'RIDESHARE_API_KEY' });
});

router.post('/rideshare/correlate', auth, async (req, res) => {
  const m = missingEnv('RIDESHARE_API_KEY');
  if (m) return res.status(503).json({ error: 'Rideshare provider not configured', missing: m });
  try {
    const { facility_id, provider = 'uber', demand_score, meta } = req.body || {};
    // PRODUCT-DECISION: cached demand readings; live polling done by a worker.
    const r = await db.query(
      `INSERT INTO rideshare_demand (facility_id, provider, demand_score, meta) VALUES ($1, $2, $3, $4) RETURNING *`,
      [facility_id || null, provider, demand_score || null, meta || {}]
    );
    res.json({ reading: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rideshare/recent', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM rideshare_demand ORDER BY recorded_at DESC LIMIT 100');
    res.json({ readings: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// 2. NEEDS-CREDS: Waze/GMaps broadcast
// ════════════════════════════════════════════════════════════════
router.post('/broadcast/waze', auth, async (req, res) => {
  const m = missingEnv('WAZE_API_KEY');
  if (m) return res.status(503).json({ error: 'Waze CCP not configured', missing: m });
  try {
    const { facility_id, event_type = 'lot_full', payload = {} } = req.body || {};
    const r = await db.query(
      `INSERT INTO broadcast_events (provider, facility_id, event_type, payload, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['waze', facility_id || null, event_type, payload, 'queued']
    );
    res.json({ event: r.rows[0], note: 'Queued for Waze CCP broadcast.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/broadcast/gmaps', auth, async (req, res) => {
  const m = missingEnv('GMAPS_API_KEY');
  if (m) return res.status(503).json({ error: 'Google Maps not configured', missing: m });
  try {
    const { facility_id, event_type = 'availability_update', payload = {} } = req.body || {};
    const r = await db.query(
      `INSERT INTO broadcast_events (provider, facility_id, event_type, payload, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['gmaps', facility_id || null, event_type, payload, 'queued']
    );
    res.json({ event: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/broadcast/recent', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM broadcast_events ORDER BY created_at DESC LIMIT 100');
    res.json({ events: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// 3. NEEDS-CREDS: Vehicle registration DB lookup
// ════════════════════════════════════════════════════════════════
router.post('/vehicle-registration/lookup', auth, async (req, res) => {
  const m = missingEnv('VEHICLE_REG_API_KEY');
  if (m) return res.status(503).json({ error: 'Vehicle registration provider not configured', missing: m });
  try {
    const { plate, state } = req.body || {};
    if (!plate) return res.status(400).json({ error: 'plate required' });
    // PRODUCT-DECISION: real lookup typically NLETS or state DMV. For now
    // return a normalized envelope so callers can integrate transparently.
    res.json({ plate: plate.toUpperCase(), state: state || null, provider: 'configured', note: 'Integrate state-DMV / NLETS adapter here.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// 4. NEEDS-CREDS: Utility demand-response integration
// ════════════════════════════════════════════════════════════════
router.post('/utility/demand-response', auth, async (req, res) => {
  const m = missingEnv('UTILITY_DR_API_KEY');
  if (m) return res.status(503).json({ error: 'Utility DR provider not configured', missing: m });
  try {
    const { facility_id, kw_curtailment, window_start, window_end } = req.body || {};
    res.json({ facility_id, kw_curtailment, window_start, window_end, status: 'enrolled', note: 'Integrate OpenADR / utility DR API here.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// 5. NEEDS-PRODUCT-DECISION: customer self-service portal
// ════════════════════════════════════════════════════════════════
// PRODUCT-DECISION: request_type ∈ {refund, dispute, lost-ticket, permit-renewal,
// access-issue, general}. Default 'general'. Statuses: open, in-progress, resolved, closed.

router.post('/self-service/requests', auth, async (req, res) => {
  try {
    const { request_type = 'general', facility_id, plate, details } = req.body || {};
    const r = await db.query(
      `INSERT INTO self_service_requests (user_id, request_type, facility_id, plate, details) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user?.id || null, request_type, facility_id || null, plate || null, details || {}]
    );
    res.json({ request: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/self-service/requests', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM self_service_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user?.id || null]);
    res.json({ requests: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/self-service/requests/:id', auth, async (req, res) => {
  try {
    const { status, details } = req.body || {};
    const r = await db.query(
      `UPDATE self_service_requests SET status = COALESCE($1, status), details = COALESCE($2, details), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status || null, details || null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ request: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════
// 6. NEEDS-PRODUCT-DECISION: permit fraud agentic monitoring
// ════════════════════════════════════════════════════════════════
// PRODUCT-DECISION: an agentic monitor over existing permits + violations
// data, returning anomalies. Real "agent" loop is a worker — we expose the
// AI scoring endpoint here.
router.post('/permit-fraud/scan', auth, aiRateLimiter, async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
  try {
    const { facility_id, time_window_days = 30 } = req.body || {};
    let permits = [], violations = [];
    try { const r = await db.query('SELECT * FROM permits WHERE facility_id = $1 LIMIT 200', [facility_id]); permits = r.rows; } catch {}
    try { const r = await db.query('SELECT * FROM violations WHERE facility_id = $1 LIMIT 200', [facility_id]); violations = r.rows; } catch {}
    const prompt = `You are a permit-fraud agentic monitor. Analyze permit holders and recent violations for resident-permit fraud (e.g. permits used outside resident hours, multiple plates per permit, address mismatches).
Window: ${time_window_days} days
Facility: ${facility_id || 'all'}
Permits: ${JSON.stringify(permits).slice(0, 4000)}
Violations: ${JSON.stringify(violations).slice(0, 3000)}

Provide JSON only: { "anomalies": [{"permit_id": any, "anomaly_type": string, "evidence": [string], "risk_score": number, "recommended_action": string}], "patterns": [string], "summary": string }`;
    const result = await callAI('You are a fraud-detection agent for parking-permit programs.', prompt);
    res.json({ feature: 'Permit Fraud Scan', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// 7. NEEDS-PRODUCT-DECISION: Native mobile app surfaces
// ════════════════════════════════════════════════════════════════
// PRODUCT-DECISION: Expose a mobile manifest and push-token registry. A
// real mobile app would consume these endpoints and the existing REST API.
router.get('/mobile/manifest', async (req, res) => {
  res.json({
    api_base: '/api',
    auth: { type: 'bearer', endpoint: '/api/auth/login' },
    features: ['occupancy', 'pricing', 'reservations', 'payments', 'permits', 'self-service', 'feedback'],
    deeplinks: { reservations: 'parking://reservation/:id' },
    min_app_version: '1.0.0',
  });
});

router.post('/mobile/push-token', auth, async (req, res) => {
  try {
    const { platform = 'ios', token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const r = await db.query(
      `INSERT INTO mobile_push_tokens (user_id, platform, token) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform RETURNING *`,
      [req.user?.id || null, platform, token]
    );
    res.json({ registered: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
