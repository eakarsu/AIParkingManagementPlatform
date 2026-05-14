const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const { callAI } = require('../services/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// ------- Bootstrap tables -------
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(100),
        entity_table VARCHAR(100),
        entity_id INTEGER,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add ai_prediction column to facilities if missing
    await db.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS ai_prediction TEXT`);
    // Add ai_analysis column to parking_zones if missing
    await db.query(`ALTER TABLE parking_zones ADD COLUMN IF NOT EXISTS ai_analysis TEXT`);
    // Add ai_analysis to violations
    await db.query(`ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_analysis TEXT`);
    // Add ai_analysis to revenue_records
    await db.query(`ALTER TABLE revenue_records ADD COLUMN IF NOT EXISTS ai_analysis TEXT`);
  } catch (err) {
    console.error('AI table bootstrap error:', err.message);
  }
})();

// ------- parseAIJson: 3-strategy parser -------
function parseAIJson(text) {
  if (!text) return null;
  // Strategy 1: direct JSON parse
  try { return JSON.parse(text); } catch {}
  // Strategy 2: extract JSON from markdown code block
  const md = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) {
    try { return JSON.parse(md[1].trim()); } catch {}
  }
  // Strategy 3: find first { ... } or [ ... ] block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }
  return null;
}

// Helper to persist ai_results row and optionally update entity
async function persistAIResult({ userId, endpoint, entityTable, entityId, result, entityUpdateCol }) {
  try {
    const parsed = typeof result === 'object' ? result : parseAIJson(result);
    await db.query(
      `INSERT INTO ai_results (user_id, endpoint, entity_table, entity_id, result) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, endpoint, entityTable || null, entityId || null, JSON.stringify(parsed || { raw: result })]
    );
    if (entityTable && entityId && entityUpdateCol) {
      await db.query(
        `UPDATE ${entityTable} SET ${entityUpdateCol} = $1 WHERE id = $2`,
        [typeof result === 'string' ? result : JSON.stringify(result), entityId]
      );
    }
  } catch (err) {
    console.error('persistAIResult error:', err.message);
  }
}

// ------- AI History -------
router.get('/history', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT * FROM ai_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM ai_results WHERE user_id = $1`, [req.user.id]),
    ]);

    res.json({
      data: rows.rows,
      page,
      limit,
      total: parseInt(count.rows[0].count),
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Occupancy Prediction -------
router.post('/predict-occupancy', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const recent = await db.query(
      'SELECT * FROM occupancy_records WHERE facility_id = $1 ORDER BY recorded_at DESC LIMIT 10',
      [facility_id]
    );

    const facilityData = facility.rows[0];
    const records = recent.rows;

    const prompt = `Analyze this parking facility data and predict occupancy for the next 24 hours.

Facility: ${facilityData?.name || 'Unknown'} (${facilityData?.total_spaces || 500} total spaces)
Recent occupancy data:
${records.map(r => `- ${r.recorded_at}: ${r.occupancy_rate}% (${r.occupied_spaces}/${r.total_spaces})`).join('\n')}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "predicted_occupancy_pct": <number 0-100>,
  "peak_hours": [<hour numbers, 0-23>],
  "confidence": <number 0-100>,
  "recommendations": [<string>, ...]
}`;

    const result = await callAI(
      'You are an AI parking occupancy prediction system. Return only valid JSON, no markdown.',
      prompt
    );

    const parsed = parseAIJson(result.content);
    await persistAIResult({
      userId: req.user.id,
      endpoint: 'predict-occupancy',
      entityTable: 'facilities',
      entityId: facility_id,
      result: parsed || result.content,
      entityUpdateCol: 'ai_prediction',
    });

    // Broadcast occupancy update via WebSocket
    if (req.app.locals.broadcastOccupancy) req.app.locals.broadcastOccupancy();

    res.json({ feature: 'Occupancy Prediction', ...result, parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Dynamic Pricing -------
router.post('/optimize-pricing', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const pricing = await db.query('SELECT * FROM pricing_rules WHERE facility_id = $1', [facility_id]);
    const occupancy = await db.query(
      'SELECT * FROM occupancy_records WHERE facility_id = $1 ORDER BY recorded_at DESC LIMIT 5',
      [facility_id]
    );

    const prompt = `Optimize dynamic pricing for this parking facility.

Facility: ${facility.rows[0]?.name || 'Unknown'} (Base rate: $${facility.rows[0]?.hourly_rate || 5}/hr)
Current pricing rules:
${pricing.rows.map(p => `- ${p.rule_name}: Base $${p.base_rate}, Peak ${p.peak_multiplier}x, Off-peak ${p.off_peak_multiplier}x`).join('\n')}
Current occupancy: ${occupancy.rows[0]?.occupancy_rate || 60}%

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "recommended_price": <number>,
  "price_rationale": "<string>",
  "dynamic_adjustments": [
    {"time": "<string>", "price": <number>, "reason": "<string>"}
  ]
}`;

    const result = await callAI(
      'You are an AI dynamic pricing engine. Return only valid JSON, no markdown.',
      prompt
    );

    const parsed = parseAIJson(result.content);
    await persistAIResult({
      userId: req.user.id,
      endpoint: 'optimize-pricing',
      entityTable: 'facilities',
      entityId: facility_id,
      result: parsed || result.content,
      entityUpdateCol: 'ai_prediction',
    });

    res.json({ feature: 'Dynamic Pricing Optimization', ...result, parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI License Plate Analysis -------
router.post('/analyze-plate', auth, aiRateLimiter, async (req, res) => {
  try {
    const { plate_number, context } = req.body;
    const plateHistory = await db.query(
      'SELECT * FROM plate_records WHERE plate_number = $1 ORDER BY captured_at DESC LIMIT 10',
      [plate_number]
    );
    const violations = await db.query(
      'SELECT * FROM violations WHERE plate_number = $1 ORDER BY issued_at DESC',
      [plate_number]
    );

    const prompt = `Analyze this license plate and provide insights.

Plate: ${plate_number}
Context: ${context || 'Entry scan'}
Visit history: ${plateHistory.rows.length} records
${plateHistory.rows.map(r => `- ${r.captured_at}: ${r.entry_exit} at ${r.facility_id}, confidence: ${r.confidence}%`).join('\n')}
Violation history: ${violations.rows.length} violations
${violations.rows.map(v => `- ${v.violation_type}: $${v.fine_amount} (${v.status})`).join('\n')}

Provide:
1. Vehicle profile summary
2. Visit pattern analysis
3. Risk assessment (low/medium/high)
4. Violation probability
5. Recommended action
6. VIP/frequent parker status recommendation
7. Average visit duration estimate
8. Revenue contribution estimate`;

    const result = await callAI(
      'You are an AI license plate recognition and analysis system for parking management. Provide comprehensive vehicle intelligence and actionable insights.',
      prompt
    );

    await persistAIResult({
      userId: req.user.id,
      endpoint: 'analyze-plate',
      entityTable: null,
      entityId: null,
      result: result.content,
    });

    res.json({ feature: 'License Plate Analysis', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Violation Analysis -------
router.post('/analyze-violation', auth, aiRateLimiter, async (req, res) => {
  try {
    const { violation_id } = req.body;
    const violation = await db.query(
      `SELECT v.*, f.name as facility_name FROM violations v
       JOIN facilities f ON v.facility_id = f.id WHERE v.id = $1`,
      [violation_id]
    );

    const allViolations = await db.query(
      'SELECT violation_type, COUNT(*) as cnt, AVG(fine_amount) as avg_fine FROM violations GROUP BY violation_type'
    );

    const v = violation.rows[0];
    const prompt = `Analyze this parking violation and provide recommendations.

Violation Details:
- Type: ${v?.violation_type || 'Unknown'}
- Plate: ${v?.plate_number || 'Unknown'}
- Facility: ${v?.facility_name || 'Unknown'}
- Fine: $${v?.fine_amount || 0}
- Zone: ${v?.zone || 'N/A'}
- Status: ${v?.status || 'pending'}
- Description: ${v?.description || 'N/A'}

Violation Statistics:
${allViolations.rows.map(r => `- ${r.violation_type}: ${r.cnt} occurrences, avg fine $${parseFloat(r.avg_fine).toFixed(2)}`).join('\n')}

Provide:
1. Violation severity assessment
2. Fine appropriateness analysis
3. Recommended fine adjustment
4. Prevention strategy
5. Repeat offender risk
6. Appeal likelihood assessment
7. Enforcement improvement suggestions
8. Similar violation pattern analysis`;

    const result = await callAI(
      'You are an AI violation management system for parking facilities. Analyze violations, assess severity, and recommend actions to reduce violations and improve compliance.',
      prompt
    );

    await persistAIResult({
      userId: req.user.id,
      endpoint: 'analyze-violation',
      entityTable: 'violations',
      entityId: violation_id,
      result: result.content,
      entityUpdateCol: 'ai_analysis',
    });

    res.json({ feature: 'Violation Analysis', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Revenue Optimization -------
router.post('/optimize-revenue', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const revenue = await db.query(
      'SELECT * FROM revenue_records WHERE facility_id = $1 ORDER BY record_date DESC LIMIT 15',
      [facility_id]
    );
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);

    const prompt = `Optimize revenue for this parking facility.

Facility: ${facility.rows[0]?.name || 'Unknown'} (${facility.rows[0]?.total_spaces || 500} spaces, $${facility.rows[0]?.hourly_rate || 5}/hr)
Revenue history:
${revenue.rows.map(r => `- ${r.record_date}: Total $${r.total_revenue} (Parking: $${r.parking_revenue}, Violations: $${r.violation_revenue}, Subscriptions: $${r.subscription_revenue}) | ${r.transactions_count} txns | Score: ${r.optimization_score}`).join('\n')}

Provide comprehensive optimization:
1. Revenue trend analysis
2. Top 3 revenue growth opportunities
3. Cost reduction recommendations
4. Pricing optimization suggestions
5. Subscription tier recommendations
6. Seasonal strategy adjustments
7. Target revenue for next month
8. ROI projections for recommended changes
9. Competitive benchmarking insights
10. Action priority matrix`;

    const result = await callAI(
      'You are an AI revenue optimization engine for parking facilities. Analyze financial data and provide specific, actionable strategies to maximize revenue and profitability.',
      prompt
    );

    // Update latest revenue_record if available
    const latestRevId = revenue.rows[0]?.id;
    await persistAIResult({
      userId: req.user.id,
      endpoint: 'optimize-revenue',
      entityTable: 'revenue_records',
      entityId: latestRevId || null,
      result: result.content,
      entityUpdateCol: latestRevId ? 'ai_analysis' : null,
    });

    res.json({ feature: 'Revenue Optimization', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Payment Analytics -------
router.post('/analyze-payments', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const payments = await db.query(
      'SELECT * FROM payments WHERE facility_id = $1 ORDER BY payment_time DESC LIMIT 20',
      [facility_id]
    );

    const stats = await db.query(
      `SELECT payment_method, COUNT(*) as cnt, SUM(amount) as total, AVG(amount) as avg_amount
       FROM payments WHERE facility_id = $1 GROUP BY payment_method`,
      [facility_id]
    );

    const prompt = `Analyze mobile payment patterns for this parking facility.

Payment records: ${payments.rows.length} recent transactions
Payment method breakdown:
${stats.rows.map(s => `- ${s.payment_method}: ${s.cnt} transactions, Total $${parseFloat(s.total).toFixed(2)}, Avg $${parseFloat(s.avg_amount).toFixed(2)}`).join('\n')}

Recent transactions:
${payments.rows.slice(0, 10).map(p => `- ${p.payment_time}: ${p.plate_number} paid $${p.amount} via ${p.payment_method} (${p.duration_hours}hrs)`).join('\n')}

Provide:
1. Payment method preference analysis
2. Peak payment times
3. Average transaction value trends
4. Mobile payment adoption rate
5. Failed payment analysis
6. Recommended payment method promotions
7. Contactless payment optimization
8. Customer payment behavior insights
9. Revenue leakage identification
10. Digital wallet integration recommendations`;

    const result = await callAI(
      'You are an AI payment analytics system for parking management. Analyze payment patterns, identify trends, and recommend strategies to improve payment experience and reduce friction.',
      prompt
    );

    await persistAIResult({
      userId: req.user.id,
      endpoint: 'analyze-payments',
      entityTable: null,
      entityId: null,
      result: result.content,
    });

    res.json({ feature: 'Payment Analytics', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------- AI Sensor Diagnostics -------
router.post('/diagnose-sensors', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const sensors = await db.query('SELECT * FROM sensors WHERE facility_id = $1 ORDER BY sensor_name', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Diagnose the sensor network for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nSensors (${sensors.rows.length} total):\n${sensors.rows.map(s => `- ${s.sensor_name} (${s.sensor_type}): Status=${s.status}, Battery=${s.battery_level}%, Zone=${s.location_zone}, Last ping=${s.last_ping_at}`).join('\n')}\n\nProvide:\n1. Overall network health score\n2. Sensors needing immediate attention\n3. Battery replacement schedule\n4. Coverage gap analysis\n5. Recommended additional sensor placements\n6. Maintenance prediction (next 30 days)\n7. Data quality assessment\n8. Cost optimization for sensor operations`;
    const result = await callAI('You are an AI IoT sensor diagnostic system for smart parking. Analyze sensor health, predict failures, and optimize the sensor network.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'diagnose-sensors', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Sensor Diagnostics', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI EV Charging Optimization -------
router.post('/optimize-ev', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const stations = await db.query('SELECT * FROM ev_stations WHERE facility_id = $1', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Optimize EV charging operations for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nEV Stations (${stations.rows.length}):\n${stations.rows.map(s => `- ${s.station_name}: ${s.connector_type} ${s.power_kw}kW, Status=${s.status}, Energy=${s.energy_delivered_kwh}kWh, Rate=$${s.rate_per_kwh}/kWh${s.current_vehicle_plate ? ', Vehicle: ' + s.current_vehicle_plate : ''}`).join('\n')}\n\nProvide:\n1. Station utilization analysis\n2. Optimal pricing strategy per connector type\n3. Peak charging time predictions\n4. Infrastructure expansion recommendations\n5. Revenue optimization for EV services\n6. Queue management suggestions\n7. Green energy integration opportunities\n8. Competitor benchmarking`;
    const result = await callAI('You are an AI EV charging optimization system. Analyze station usage, optimize pricing, and recommend infrastructure improvements for parking facility EV services.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'optimize-ev', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'EV Charging Optimization', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Reservation Forecasting -------
router.post('/forecast-reservations', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const reservations = await db.query('SELECT * FROM reservations WHERE facility_id = $1 ORDER BY start_time DESC LIMIT 20', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Forecast and optimize reservations for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'} (${facility.rows[0]?.total_spaces} spaces)\nRecent Reservations (${reservations.rows.length}):\n${reservations.rows.map(r => `- ${r.customer_name}: ${r.start_time} to ${r.end_time}, Status=${r.status}, $${r.total_amount}, Spot=${r.spot_number}`).join('\n')}\n\nProvide:\n1. Reservation demand forecast (next 7 days)\n2. No-show rate analysis and prevention strategies\n3. Optimal pricing for advance bookings vs walk-ins\n4. Peak reservation periods\n5. Customer segmentation insights\n6. Cancellation pattern analysis\n7. Overbooking strategy recommendations\n8. Revenue from reservations vs walk-ins comparison`;
    const result = await callAI('You are an AI reservation forecasting system for parking management. Predict demand, optimize booking strategies, and reduce no-shows.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'forecast-reservations', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Reservation Forecasting', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Permit Management -------
router.post('/analyze-permits', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const permits = await db.query('SELECT * FROM permits WHERE facility_id = $1 ORDER BY start_date DESC', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Analyze permit utilization for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nPermits (${permits.rows.length}):\n${permits.rows.map(p => `- ${p.permit_number}: ${p.holder_name}, Type=${p.permit_type}, $${p.monthly_rate}/mo, Status=${p.status}, Zone=${p.zone_access}, ${p.start_date} to ${p.end_date}`).join('\n')}\n\nProvide:\n1. Permit utilization rate analysis\n2. Revenue optimization per permit type\n3. Expiring permits alert (next 30 days)\n4. Recommended new permit tiers\n5. Pricing adjustment recommendations\n6. Permit fraud detection indicators\n7. Zone allocation optimization\n8. Retention strategy for expiring permits`;
    const result = await callAI('You are an AI permit management system for parking facilities. Analyze permit usage, optimize pricing tiers, and improve retention.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'analyze-permits', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Permit Analytics', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Analytics Report -------
router.post('/generate-report', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const reports = await db.query('SELECT * FROM analytics_reports WHERE facility_id = $1 ORDER BY period_start DESC LIMIT 10', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Generate executive analytics insights for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nRecent Reports:\n${reports.rows.map(r => `- ${r.report_name} (${r.report_type}): ${r.period_start} to ${r.period_end}, Revenue=$${r.total_revenue}, Txns=${r.total_transactions}, AvgOcc=${r.avg_occupancy}%, Peak=${r.peak_occupancy}%, Vehicles=${r.unique_vehicles}, New=${r.new_customers}, Returning=${r.returning_customers}`).join('\n')}\n\nProvide:\n1. Executive summary of trends\n2. Key performance indicators (KPIs) assessment\n3. Year-over-year growth projections\n4. Customer acquisition cost analysis\n5. Retention rate and lifetime value\n6. Operational efficiency score\n7. Top 5 actionable recommendations\n8. Risk factors and mitigation strategies`;
    const result = await callAI('You are an AI analytics engine for parking facility management. Generate executive-level insights, KPI analysis, and strategic recommendations.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'generate-report', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Analytics Report', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Security Analysis -------
router.post('/analyze-security', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const cameras = await db.query('SELECT * FROM security_cameras WHERE facility_id = $1', [facility_id]);
    const violations = await db.query('SELECT * FROM violations WHERE facility_id = $1 ORDER BY issued_at DESC LIMIT 10', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Analyze security posture for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nCameras (${cameras.rows.length}):\n${cameras.rows.map(c => `- ${c.camera_name} (${c.camera_type}): Zone=${c.location_zone}, Status=${c.status}, Resolution=${c.resolution}, Recording=${c.recording_enabled}, Motion=${c.motion_detected}`).join('\n')}\nRecent Violations:\n${violations.rows.map(v => `- ${v.violation_type}: Zone ${v.zone}, ${v.status}`).join('\n')}\n\nProvide:\n1. Overall security score (1-100)\n2. Camera coverage gap analysis\n3. Blind spot identification\n4. Incident hotspot zones\n5. Recommended camera upgrades\n6. Patrol route optimization\n7. Emergency response readiness\n8. Cost-benefit of security improvements`;
    const result = await callAI('You are an AI security analysis system for parking facilities. Assess security coverage, identify vulnerabilities, and recommend improvements.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'analyze-security', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Security Analysis', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Maintenance Prediction -------
router.post('/predict-maintenance', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const tasks = await db.query('SELECT * FROM maintenance_tasks WHERE facility_id = $1 ORDER BY scheduled_date DESC', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Predict maintenance needs for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nMaintenance History (${tasks.rows.length} tasks):\n${tasks.rows.map(t => `- ${t.task_name} (${t.task_type}): Priority=${t.priority}, Status=${t.status}, Est=$${t.estimated_cost}, Actual=$${t.actual_cost || 'N/A'}, Scheduled=${t.scheduled_date}, Assigned=${t.assigned_to}`).join('\n')}\n\nProvide:\n1. Predicted maintenance needs (next 90 days)\n2. Budget forecast for upcoming maintenance\n3. Priority task ranking\n4. Preventive maintenance schedule\n5. Cost optimization opportunities\n6. Vendor performance assessment\n7. Equipment lifecycle analysis\n8. Emergency preparedness recommendations`;
    const result = await callAI('You are an AI predictive maintenance system for parking facilities. Analyze maintenance history, predict future needs, and optimize maintenance budgets.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'predict-maintenance', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Maintenance Prediction', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Customer Sentiment Analysis -------
router.post('/analyze-feedback', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const feedback = await db.query('SELECT * FROM customer_feedback WHERE facility_id = $1 ORDER BY created_at DESC', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Analyze customer feedback and sentiment for this parking facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nFeedback (${feedback.rows.length} entries):\n${feedback.rows.map(f => `- ${f.customer_name} (${f.rating}/5, ${f.sentiment}): [${f.category}] "${f.subject}" - ${f.message.substring(0, 100)}${f.response ? ' | Response: ' + f.response.substring(0, 50) : ''}`).join('\n')}\n\nProvide:\n1. Overall sentiment score and trend\n2. Category-wise satisfaction breakdown\n3. Top 3 customer pain points\n4. Positive highlights to maintain\n5. Recommended response templates for common complaints\n6. Customer satisfaction improvement plan\n7. NPS score estimate\n8. Competitive customer experience comparison`;
    const result = await callAI('You are an AI customer sentiment analysis system for parking management. Analyze feedback, identify trends, and recommend customer experience improvements.', prompt);

    await persistAIResult({ userId: req.user.id, endpoint: 'analyze-feedback', entityTable: null, entityId: null, result: result.content });

    res.json({ feature: 'Customer Sentiment Analysis', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Zone Optimization -------
router.post('/optimize-zones', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body;
    const zones = await db.query('SELECT * FROM parking_zones WHERE facility_id = $1 ORDER BY zone_code', [facility_id]);
    const facility = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]);
    const prompt = `Optimize parking zone allocation for this facility.\n\nFacility: ${facility.rows[0]?.name || 'Unknown'}\nZones (${zones.rows.length}):\n${zones.rows.map(z => `- ${z.zone_name} (${z.zone_code}): Type=${z.zone_type}, ${z.occupied_spots}/${z.total_spots} spots, $${z.hourly_rate}/hr, Floor=${z.floor_level}, Covered=${z.is_covered}, Status=${z.status}`).join('\n')}\n\nProvide:\n1. Zone utilization heat map analysis\n2. Optimal zone type reallocation\n3. Pricing per zone recommendations\n4. EV zone expansion needs\n5. Handicap compliance assessment\n6. VIP zone ROI analysis\n7. Traffic flow optimization between zones\n8. Capacity rebalancing suggestions`;
    const result = await callAI('You are an AI zone optimization system for parking facilities. Analyze zone usage, optimize allocation, and improve traffic flow.', prompt);

    // Update first zone row's ai_analysis as representative
    const firstZoneId = zones.rows[0]?.id;
    await persistAIResult({
      userId: req.user.id,
      endpoint: 'optimize-zones',
      entityTable: 'parking_zones',
      entityId: firstZoneId || null,
      result: result.content,
      entityUpdateCol: firstZoneId ? 'ai_analysis' : null,
    });

    res.json({ feature: 'Zone Optimization', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Asset Lifecycle Predict -------
router.post('/asset-lifecycle-predict', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id } = req.body || {};
    let assets = [];
    try { const r = await db.query('SELECT id, asset_type, model, install_date, last_service_date, status FROM equipment_assets WHERE facility_id = $1', [facility_id]); assets = r.rows; } catch {}
    if (assets.length === 0) {
      try { const r = await db.query('SELECT * FROM maintenance_tasks WHERE facility_id = $1 LIMIT 50', [facility_id]); assets = r.rows; } catch {}
    }
    const prompt = `Predict end-of-life and replacement timing for parking facility assets (sensors, payment kiosks, gates, cameras).
Facility: ${facility_id || 'unknown'}
Assets / maintenance signals: ${JSON.stringify(assets).slice(0, 6000)}

Provide JSON only: { "asset_predictions": [{"asset_id": any, "asset_type": string, "remaining_useful_life_months": number, "replacement_priority": "low|medium|high|urgent", "estimated_replacement_cost_usd": number, "rationale": string}], "summary": string, "capex_forecast_12mo_usd": number }`;
    const result = await callAI('You forecast asset lifecycle, replacement timing, and capex for parking-facility infrastructure.', prompt);
    await persistAIResult({ userId: req.user.id, endpoint: 'asset-lifecycle-predict', entityTable: null, entityId: null, result: result.content });
    res.json({ feature: 'Asset Lifecycle Prediction', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Facility Audit Recommend -------
router.post('/facility-audit-recommend', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id, photos, condition_notes } = req.body || {};
    let facility = null;
    try { const r = await db.query('SELECT * FROM facilities WHERE id = $1', [facility_id]); facility = r.rows[0]; } catch {}
    const prompt = `Recommend improvements for this parking facility from observation logs and provided notes.
Facility: ${JSON.stringify(facility || { id: facility_id })}
Photo descriptors: ${JSON.stringify(photos || [])}
Condition notes: ${condition_notes || ''}

Provide JSON only: { "audit_findings": [{"area": string, "issue": string, "severity": "low|medium|high", "recommended_action": string, "estimated_cost_usd": number}], "compliance_concerns": [string], "ada_concerns": [string], "safety_concerns": [string], "prioritized_action_plan": [string], "summary": string }`;
    const result = await callAI('You are an AI parking-facility audit consultant assessing condition, compliance, ADA, and safety.', prompt);
    await persistAIResult({ userId: req.user.id, endpoint: 'facility-audit-recommend', entityTable: 'facilities', entityId: facility_id || null, result: result.content, entityUpdateCol: facility_id ? 'ai_prediction' : null });
    res.json({ feature: 'Facility Audit Recommend', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ------- AI Intrusion Detection -------
router.post('/intrusion-detect', auth, aiRateLimiter, async (req, res) => {
  try {
    const { facility_id, time_window_hours } = req.body || {};
    let entryEvents = [], cameras = [];
    try { const r = await db.query('SELECT * FROM access_events WHERE facility_id = $1 ORDER BY occurred_at DESC LIMIT 200', [facility_id]); entryEvents = r.rows; } catch {}
    try { const r = await db.query('SELECT * FROM security_cameras WHERE facility_id = $1', [facility_id]); cameras = r.rows; } catch {}
    const prompt = `Detect possible intrusion patterns: unusual entry attempts, after-hours activity, loitering, tailgating.
Time window (hours): ${time_window_hours || 24}
Facility: ${facility_id || 'unknown'}
Access events: ${JSON.stringify(entryEvents).slice(0, 5000)}
Cameras: ${JSON.stringify(cameras).slice(0, 2000)}

Provide JSON only: { "incidents": [{"type": string, "severity": "low|medium|high|critical", "when": string, "where": string, "evidence": [string], "recommended_response": string}], "patterns_detected": [string], "watchlist": [string], "summary": string }`;
    const result = await callAI('You analyze parking-facility access logs and CCTV metadata for intrusion patterns.', prompt);
    await persistAIResult({ userId: req.user.id, endpoint: 'intrusion-detect', entityTable: null, entityId: null, result: result.content });
    res.json({ feature: 'Intrusion Detection', ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
