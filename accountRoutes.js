const express = require('express');
const auth = require('../auth');

const router = express.Router();

// Middleware to restrict access to accountants only
function permitAccountant(req, res, next) {
  if (req.user.role !== 'accountant') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// View all fees (placeholder, you can extend to real DB logic)
router.get('/fees', auth, permitAccountant, async (req, res) => {
  try {
    // Example: replace with actual fee retrieval from DB
    const fees = [
      { student: 'John Doe', class: 'Stage 1', amount: 250 },
      { student: 'Jane Smith', class: 'Stage 2', amount: 300 }
    ];
    res.json({ fees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
