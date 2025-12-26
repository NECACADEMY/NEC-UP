const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');

const app = express();

<<<<<<< HEAD
// ===== MONGODB CONNECTION =====
const mongoURI = 'mongodb+srv://nec-up:Heaven220000@cluster0.d3sisou.mongodb.net/school_management?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ===== MIDDLEWARE =====
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(cors());
=======
/* =====================
   MIDDLEWARE (FIRST)
===================== */
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
>>>>>>> 819212728b2c140b75e34c18f0c7a6bd23cc9d3c
app.use(compression());
app.use(express.json());
app.use(express.static('public')); // serve index.html

<<<<<<< HEAD
// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token || !token.startsWith('demo-token-')) return res.status(403).json({ error: 'Invalid token' });

  req.role = token.split('demo-token-')[1];
  next();
}

// ===== SCHEMAS =====
const studentSchema = new mongoose.Schema({
  name: String,
  class: String,
  attendance: [{ date: Date, status: String }],
  scores: { Math: Number, English: Number },
=======

/* =====================
   ROUTES
===================== */

// Root
app.get('/', (req, res) => {
  res.send('Server is up');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'school-management',
    time: new Date().toISOString()
  });
>>>>>>> 819212728b2c140b75e34c18f0c7a6bd23cc9d3c
});
const Student = mongoose.model('Student', studentSchema);

<<<<<<< HEAD
// ===== ROUTES =====

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// LOGIN
=======
// Auth (demo)
>>>>>>> 819212728b2c140b75e34c18f0c7a6bd23cc9d3c
app.post('/api/auth/login', (req, res) => {
  const { role } = req.body || {};
  if (!role) {
    return res.status(400).json({
      error: 'role required: admin | head | teacher | accountant'
    });
  }
  res.json({
    token: 'demo-token-' + role,
    role
  });
});

<<<<<<< HEAD
// ADD STUDENT (Admin)
app.post('/api/admin/students', auth, async (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { name, class: className } = req.body;
  if (!name || !className) return res.status(400).json({ error: 'Name and class required' });

  try {
    const student = new Student({ name, class: className });
    await student.save();
    res.json({ status: 'Student added successfully', student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// TEACHER - LOAD STUDENTS
app.get('/api/teacher/attendance', auth, async (req, res) => {
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

  try {
    const students = await Student.find().select('name class');
    const items = students.map(s => `${s.name} (${s.class})`);
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load students' });
  }
});

// TEACHER - SAVE ATTENDANCE
app.post('/api/teacher/homework', auth, async (req, res) => {
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

  const { attendance } = req.body;
  if (!attendance) return res.status(400).json({ error: 'Attendance data is required' });

  try {
    const date = new Date();
    for (const key in attendance) {
      const [name] = key.split(' (');
      const student = await Student.findOne({ name });
      if (!student) continue;

      student.attendance.push({ date, status: attendance[key] });
      await student.save();
    }
    res.json({ status: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// TEACHER - SAVE SCORES
app.post('/api/teacher/scores', auth, async (req, res) => {
  if (req.role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

  const { scores } = req.body;
  if (!scores) return res.status(400).json({ error: 'Scores data is required' });

  try {
    for (const name in scores) {
      const student = await Student.findOne({ name });
      if (!student) continue;

      student.scores = { ...student.scores, ...scores[name] };
      await student.save();
    }
    res.json({ status: 'Scores saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save scores' });
  }
});

// HEAD - OVERVIEW
app.get('/api/head/overview', auth, async (req, res) => {
  if (req.role !== 'head') return res.status(403).json({ error: 'Forbidden' });
  try {
    const students = await Student.find();
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load head data' });
  }
=======
// Teacher
app.get('/api/teacher/attendance', (req, res) => {
  res.json({ items: [] });
});

app.post('/api/teacher/homework', (req, res) => {
  res.json({ status: 'saved' });
});

// Head
app.get('/api/head/overview', (req, res) => {
  res.json({ performance: [], intake: [] });
});

// Accountant
app.get('/api/account/fees', (req, res) => {
  res.json({ receipts: [] });
});

// Admin
app.post('/api/admin/students', (req, res) => {
  res.json({ status: 'student-added' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

/* =====================
   START SERVER (LAST)
===================== */
app.listen(3000, () => {
  console.log('School management server running on http://localhost:3000');
>>>>>>> 819212728b2c140b75e34c18f0c7a6bd23cc9d3c
});

// ACCOUNTANT - FEES (demo)
app.get('/api/account/fees', auth, (req, res) => {
  if (req.role !== 'accountant') return res.status(403).json({ error: 'Forbidden' });
  res.json({ receipts: ['Receipt 001', 'Receipt 002', 'Receipt 003'] });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// START SERVER
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));