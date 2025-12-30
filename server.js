// ======================
// server.js - Newings School Backend (FINAL)
// ======================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

/* ====================== MIDDLEWARE ====================== */
app.use(express.json());
app.use(cors({ origin: '*' }));

/* ====================== SERVE FRONTEND ====================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ====================== ENV CHECK ====================== */
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('❌ MONGODB_URI or JWT_SECRET missing');
  process.exit(1);
}

/* ====================== DATABASE ====================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

/* ====================== MODELS ====================== */

// Student
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [{ status: String, date: Date, teacher: String }],
  scores: [{ data: Object, date: Date, teacher: String }],
  remarks: [{ conduct: String, teacherRemark: String, teacher: String, date: Date }]
});
const Student = mongoose.model('Student', studentSchema);

// User
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, lowercase: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','teacher','head','accountant'], required: true }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

const User = mongoose.model('User', userSchema);

/* ====================== AUTH MIDDLEWARE ====================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ====================== AUTH ROUTES ====================== */

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email & password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ====================== TEACHER ROUTES ====================== */

// Get students by class
app.get('/api/teacher/attendance', auth, async (req, res) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ error: 'Forbidden' });

  const cls = req.query.class;
  try {
    const students = cls
      ? await Student.find({ class: cls })
      : await Student.find();

    res.json({ items: students.map(s => ({ name: s.name })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save attendance
app.post('/api/teacher/attendance', auth, async (req, res) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ error: 'Forbidden' });

  const { class: cls, attendance } = req.body;
  if (!cls || !attendance)
    return res.status(400).json({ error: 'Class & attendance required' });

  try {
    await Promise.all(
      Object.entries(attendance).map(([name, status]) =>
        Student.findOneAndUpdate(
          { name, class: cls },
          { $push: { attendance: { status, date: new Date(), teacher: req.user.id } } }
        )
      )
    );
    res.json({ status: 'Attendance saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save scores
app.post('/api/teacher/scores', auth, async (req, res) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ error: 'Forbidden' });

  const { class: cls, scores } = req.body;
  if (!cls || !scores)
    return res.status(400).json({ error: 'Class & scores required' });

  try {
    await Promise.all(
      Object.entries(scores).map(([name, data]) =>
        Student.findOneAndUpdate(
          { name, class: cls },
          { $push: { scores: { data, date: new Date(), teacher: req.user.id } } }
        )
      )
    );
    res.json({ status: 'Scores saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save remarks
app.post('/api/teacher/remarks', auth, async (req, res) => {
  if (req.user.role !== 'teacher')
    return res.status(403).json({ error: 'Forbidden' });

  const { class: cls, student, conduct, teacherRemark } = req.body;
  if (!cls || !student || !conduct || !teacherRemark)
    return res.status(400).json({ error: 'All fields required' });

  try {
    await Student.findOneAndUpdate(
      { name: student, class: cls },
      { $push: { remarks: { conduct, teacherRemark, teacher: req.user.id, date: new Date() } } }
    );
    res.json({ status: 'Remark saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ====================== FRONTEND FALLBACK ====================== */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ====================== SERVER ====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));