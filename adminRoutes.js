const express = require('express');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const User = require('../models/User');
const auth = require('../auth');
const studentsData = require('../students');

const router = express.Router();

// Middleware to restrict access to admin only
function permitAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Add single student
router.post('/students', auth, permitAdmin, async (req, res) => {
  const { name, class: cls } = req.body;
  if (!name || !cls) return res.status(400).json({ error: 'Name & class required' });

  try {
    const student = await Student.create({ name, class: cls, attendance: [], scores: [], remarks: [], assignments: [] });
    res.json({ status: 'Student added', student });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// Bulk add students
router.post('/bulk-add-students', auth, permitAdmin, async (req, res) => {
  try {
    const inserted = await Student.insertMany(studentsData, { ordered: false });
    res.json({ status: 'Students added', count: inserted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add students' });
  }
});

// Add staff (admin only)
router.post('/staff', auth, permitAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if (!['teacher', 'head'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const staff = await User.create({ name, email, password: hashedPassword, role });

    res.json({ status: `${role} added`, staff });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: 'Failed to add staff' });
  }
});

module.exports = router;