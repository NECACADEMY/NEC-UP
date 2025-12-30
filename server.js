// =====================
// server.js for Newings School Management (Smart CSV Dashboard)
// =====================

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const auth = require('./auth'); // JWT Auth middleware

const app = express();

// ---------------- SECURITY & MIDDLEWARE ----------------
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(compression());
app.use(express.json());

// ---------------- CONTENT SECURITY POLICY ----------------
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://nec-up.onrender.com;"
  );
  next();
});

// ---------------- RATE LIMITERS ----------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try later.' }
});

// ---------------- DATABASE ----------------
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

// Updated connection: remove unsupported options
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB connection error:', err); process.exit(1); });

// ---------------- SCHEMAS ----------------
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [
    { date: { type: Date, default: Date.now }, status: String, teacher: String, className: String }
  ],
  scores: [
    { date: { type: Date, default: Date.now }, teacher: String, className: String, data: Object }
  ]
});
const Student = mongoose.model('Student', studentSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','teacher','head','accountant','student'], required: true }
});
const User = mongoose.model('User', userSchema);

// ---------------- HELPERS ----------------
const permitRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) 
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  next();
};

const updateStudentField = async (cls, data, field, teacherId) => {
  const updates = [];
  for(const [name, value] of Object.entries(data)){
    updates.push(Student.findOneAndUpdate(
      { name, class: cls },
      { $push: { [field]: { ...value, className: cls, teacher: teacherId, date: new Date() } } },
      { new: true }
    ));
  }
  await Promise.all(updates);
};

// ---------------- READ STUDENTS FROM CSV ----------------
const readStudentsCSV = async () => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, 'students.csv'))
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

// ---------------- AUTH ROUTES ----------------
app.post('/api/setup/admin', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(403).json({ error: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ name, email, password: hashedPassword, role: 'admin' });

    res.json({ status: 'Admin created successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/login', loginLimiter, async (req,res)=>{
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'Email & password required' });

  try {
    const user = await User.findOne({ email });
    if(!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if(!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, name: user.name, email: user.email, role: user.role });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', auth, async (req,res)=>{
  try{
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ---------------- ADMIN ROUTES ----------------
app.post('/api/admin/students', auth, permitRoles('admin'), async(req,res)=>{
  const { name, class: cls } = req.body;
  if(!name || !cls) return res.status(400).json({ error: 'Name & class required' });

  try {
    const student = await Student.create({ name, class: cls });
    res.json({ status: 'Student added', student });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Failed to add student' }); }
});

app.post('/api/admin/bulk-add-students', auth, permitRoles('admin'), async(req,res)=>{
  try {
    const studentsData = await readStudentsCSV();
    const inserted = await Student.insertMany(studentsData, { ordered: false });
    res.json({ status: 'Students added from CSV', count: inserted.length });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Failed to add students from CSV' }); }
});

app.post('/api/admin/staff', auth, permitRoles('admin','head'), async(req,res)=>{
  const { name, email, password, role } = req.body;
  if(!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if(!['teacher','head','accountant'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try{
    const exists = await User.findOne({ email });
    if(exists) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const staff = await User.create({ name, email, password: hashedPassword, role });
    res.json({ status: `${role} added`, staff });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Failed to add staff' }); }
});

// ---------------- TEACHER ROUTES ----------------
app.get('/api/teacher/attendance', auth, permitRoles('teacher'), async(req,res)=>{
  const cls = req.query.class;
  if(!cls) return res.status(400).json({ error: 'Class required' });

  try{
    const students = await Student.find({ class: cls }).select('name class attendance scores');
    res.json({ items: students });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/teacher/attendance', auth, permitRoles('teacher'), async(req,res)=>{
  const { class: cls, attendance } = req.body;
  if(!cls || !attendance) return res.status(400).json({ error: 'Class & attendance required' });

  try{ await updateStudentField(cls, attendance, 'attendance', req.user.id); res.json({ status: 'Attendance saved' }); }
  catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/teacher/scores', auth, permitRoles('teacher'), async(req,res)=>{
  const { class: cls, scores } = req.body;
  if(!cls || !scores) return res.status(400).json({ error: 'Class & scores required' });

  try{ await updateStudentField(cls, scores, 'scores', req.user.id); res.json({ status: 'Scores saved' }); }
  catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/teacher/history', auth, permitRoles('teacher'), async(req,res)=>{
  const cls = req.query.class;
  if(!cls) return res.status(400).json({ error: 'Class required' });

  try{
    const students = await Student.find({ class: cls }).select('name attendance scores');
    const history = students.map(s => ({
      name: s.name,
      attendance: s.attendance.filter(a => a.className === cls),
      scores: s.scores.filter(sc => sc.className === cls)
    }));
    res.json({ items: history });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ---------------- HEADMASTER ROUTES ----------------
app.get('/api/head/overview', auth, permitRoles('head'), async(req,res)=>{
  try{
    const students = await Student.find();
    res.json({ students });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ---------------- ACCOUNTANT ROUTES ----------------
app.get('/api/account/fees', auth, permitRoles('accountant'), async(req,res)=>{
  res.json({ fees: "Functionality to implement" });
});

// ---------------- SERVE FRONTEND ----------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`✅ Server running at http://localhost:${PORT}`));

module.exports = { User, Student };