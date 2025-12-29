const express = require('express');
const Student = require('../models/Student');
const auth = require('../auth');

const router = express.Router();

// Middleware to restrict access to teachers only
function permitTeacher(req, res, next) {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Get attendance for a class
router.get('/attendance', auth, permitTeacher, async (req, res) => {
  const cls = req.query.class;
  if (!cls) return res.status(400).json({ error: 'Class required' });

  try {
    const students = await Student.find({ class: cls }).select('name class attendance scores');
    res.json({ items: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit attendance
router.post('/attendance', auth, permitTeacher, async (req, res) => {
  const { class: cls, attendance } = req.body;
  if (!cls || !attendance) return res.status(400).json({ error: 'Class & attendance required' });

  try {
    const updates = Object.entries(attendance).map(([name, status]) =>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { attendance: { status, className: cls, teacher: req.user.id } } },
        { new: true }
      )
    );

    await Promise.all(updates);
    res.json({ status: 'Attendance saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit scores
router.post('/scores', auth, permitTeacher, async (req, res) => {
  const { class: cls, scores } = req.body;
  if (!cls || !scores) return res.status(400).json({ error: 'Class & scores required' });

  try {
    const updates = Object.entries(scores).map(([name, data]) =>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { scores: { data, className: cls, teacher: req.user.id } } },
        { new: true }
      )
    );

    await Promise.all(updates);
    res.json({ status: 'Scores saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance & scores history
router.get('/history', auth, permitTeacher, async (req, res) => {
  const cls = req.query.class;
  if (!cls) return res.status(400).json({ error: 'Class required' });

  try {
    const students = await Student.find({ class: cls }).select('name attendance scores');
    const history = students.map(s => ({
      name: s.name,
      attendance: s.attendance.filter(a => a.className === cls),
      scores: s.scores.filter(sc => sc.className === cls)
    }));

    res.json({ items: history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;