const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const demoCredentialPairs = [
  ['DEMO_EMAIL', 'DEMO_PASSWORD'],
  ['DEMO_ADMIN_EMAIL', 'DEMO_ADMIN_PASSWORD'],
  ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'],
  ['ADMIN_EMAIL', 'ADMIN_PASSWORD'],
  ['DEFAULT_EMAIL', 'DEFAULT_PASSWORD'],
];

async function authenticate(email, password) {
  if (!email || !password) return null;
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  return await bcrypt.compare(password, user.password_hash) ? user : null;
}

function sessionFor(user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, tenantId: process.env.GOVERNANCE_TENANT_ID },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticate(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(sessionFor(user));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/demo-login', async (req, res) => {
  if (process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL !== 'true') {
    return res.status(404).json({ error: 'Demo login is not enabled' });
  }
  const pair = demoCredentialPairs.find(([emailKey, passwordKey]) => process.env[emailKey] && process.env[passwordKey]);
  if (!pair) return res.status(503).json({ error: 'Demo login is not configured' });
  try {
    const user = await authenticate(process.env[pair[0]], process.env[pair[1]]);
    if (!user) return res.status(503).json({ error: 'The configured demo account is unavailable' });
    return res.json(sessionFor(user));
  } catch (err) {
    console.error('Demo login error:', err);
    return res.status(500).json({ error: 'Demo login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || typeof password !== 'string' || password.length < 12) return res.status(400).json({ error: 'name, email, and a 12+ character password are required' });
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, 'operator']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, tenantId: process.env.GOVERNANCE_TENANT_ID },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
