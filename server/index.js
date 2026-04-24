require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`🚗 AI Parking Management Server running on port ${PORT}`);
});
