const express = require('express');
const auth = require('../auth');
const { Student } = require('../server');

const router = express.Router();

// Middleware to restrict access to head role
function permitHead(req, res, next) {
  if (req.user.role !== 'head') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// GET overview of all students
router.get('/overview', auth, permitHead, async (req, res) => {
  try {
    const students = await Student.find();
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
