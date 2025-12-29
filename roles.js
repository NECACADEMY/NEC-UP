// middleware/roles.js

function permit(...allowedRoles) {
  return (req, res, next) => {
    if (!req.role) return res.status(401).json({ error: 'No role information' });
    if (allowedRoles.includes(req.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
  };
}

module.exports = permit;