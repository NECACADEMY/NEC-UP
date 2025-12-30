// =====================
// auth.js - JWT Middleware for Newings School Dashboard
// =====================

const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};