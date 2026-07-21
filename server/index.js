require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const db = require('./models/db');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
if ((process.env.JWT_SECRET || '').length < 32 || !process.env.GOVERNANCE_TENANT_ID) {
  throw new Error('JWT_SECRET (32+ characters) and GOVERNANCE_TENANT_ID are required');
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/occupancy', require('./routes/occupancy'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/plates', require('./routes/plates'));
app.use('/api/violations', require('./routes/violations'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/facilities', require('./routes/facilities'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/ev-charging', require('./routes/ev-charging'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/permits', require('./routes/permits'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/security', require('./routes/security'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activity-log', require('./routes/activity-log'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/export', require('./routes/export'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server for WebSocket support
const httpServer = http.createServer(app);

// WebSocket server for real-time occupancy
let wss = null;
try {
  const { WebSocketServer } = require('ws');
  wss = new WebSocketServer({ server: httpServer });

  const broadcastOccupancy = async () => {
    if (!wss || wss.clients.size === 0) return;
    try {
      const result = await db.query(`
        SELECT f.id, f.name, f.total_spaces,
               COALESCE(SUM(z.occupied_spots), 0) AS occupied_spots,
               COALESCE(SUM(z.total_spots), 0) AS zone_total
        FROM facilities f
        LEFT JOIN parking_zones z ON z.facility_id = f.id
        GROUP BY f.id, f.name, f.total_spaces
        ORDER BY f.name
      `);
      const payload = JSON.stringify({ type: 'occupancy_update', data: result.rows, ts: Date.now() });
      wss.clients.forEach((client) => {
        const { WebSocket } = require('ws');
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    } catch (err) {
      console.error('WS broadcast error:', err.message);
    }
  };

  wss.on('connection', (ws) => {
    console.log('WS client connected');
    broadcastOccupancy(); // Send immediately on connect
    ws.on('error', (err) => console.error('WS client error:', err.message));
    ws.on('close', () => console.log('WS client disconnected'));
  });

  // Broadcast every 30 seconds
  setInterval(broadcastOccupancy, 30000);

  // Export broadcast function for use by routes
  app.locals.broadcastOccupancy = broadcastOccupancy;

  console.log('WebSocket server enabled');
} catch (e) {
  console.log('ws package not available, skipping WebSocket server:', e.message);
}

app.use('/api/governed-parking-fulfillment', require('./governance'));
if (process.env.ENABLE_GENERATED_ROUTES === 'true' && process.env.NODE_ENV !== 'production') {
  app.use('/api', require('./routes/extensions'));
  app.use('/api/cf-autonomous-pricing-engine', require('./routes/customFeat01_AutonomousPricingEngine'));
  app.use('/api/cf-computer-vision-enforcement', require('./routes/customFeat02_ComputerVisionEnforcement'));
  app.use('/api/cf-ev-charging-optimization', require('./routes/customFeat03_EvChargingOptimization'));
  app.use('/api/cf-resident-permit-fraud-detection', require('./routes/customFeat04_ResidentPermitFraudDetection'));
  app.use('/api/cf-traffic-aware-guidance', require('./routes/customFeat05_TrafficAwareGuidance'));
}

httpServer.listen(PORT, () => {
  console.log(`AI Parking Management Server running on port ${PORT}`);
});
