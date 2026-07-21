const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  if ((process.env.JWT_SECRET || '').length < 32) return res.status(503).json({ error: 'Secure authentication is not configured' });
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};
