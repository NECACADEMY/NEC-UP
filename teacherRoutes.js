const express = require('express');
const Student = require('../models/Student');
const auth = require('../auth');

const router = express.Router();

function permitTeacher(req, res, next) {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });
  next();
}

router.get('/attendance', auth, permitTeacher, async (req, res) => {
  const cls = req.query.class;
  if (!cls) return res.status(400).json({ error: 'Class required' });
  const students = await Student.find({ class: cls }).select('name attendance scores remarks');
  res.json({ items: students });
});

router.post('/attendance', auth, permitTeacher, async (req, res) => {
  const { class: cls, attendance } = req.body;
  if (!cls || !attendance) return res.status(400).json({ error: 'Class & attendance required' });

  try {
    const updates = Object.entries(attendance).map(([name, status]) =>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { attendance: { status, teacher: req.user.id } } },
        { new: true, upsert: true }
      )
    );
    await Promise.all(updates);
    res.json({ status: 'Attendance saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/scores', auth, permitTeacher, async (req, res) => {
  const { class: cls, scores } = req.body;
  if (!cls || !scores) return res.status(400).json({ error: 'Class & scores required' });

  try {
    const updates = Object.entries(scores).map(([name, data]) =>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { scores: { data, teacher: req.user.id } } },
        { new: true, upsert: true }
      )
    );
    await Promise.all(updates);
    res.json({ status: 'Scores saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remarks', auth, permitTeacher, async (req, res) => {
  const { class: cls, student, conduct, remark } = req.body;
  if (!cls || !student || !conduct || !remark) return res.status(400).json({ error: 'All fields required' });

  try {
    await Student.findOneAndUpdate(
      { name: student, class: cls },
      { $push: { remarks: { conduct, remark, teacher: req.user.id } } },
      { new: true, upsert: true }
    );
    res.json({ status: 'Remark saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;