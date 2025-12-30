// ======================
// server.js - Newings School Backend
// ======================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

/* ====================== MIDDLEWARE ====================== */
app.use(express.json());
app.use(cors({ origin: '*' }));

/* ====================== DATABASE ====================== */
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('❌ MONGODB_URI or JWT_SECRET missing in .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

/* ====================== SCHEMAS ====================== */
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [{ date: Date, status: String, teacher: String }],
  scores: [{ date: Date, subject: String, data: Object, teacher: String }],
  remarks: [{ conduct: String, teacherRemark: String, teacher: String, date: Date }]
});
const Student = mongoose.model('Student', studentSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, lowercase: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','teacher','head','accountant','student'], required: true }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function(pw) {
  return bcrypt.compare(pw, this.password);
};

const User = mongoose.model('User', userSchema);

/* ====================== AUTH MIDDLEWARE ====================== */
const auth = async (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Authorization header missing' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/* ====================== ROUTES ====================== */

// ----- Login -----
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'Email & password required' });

  try {
    const user = await User.findOne({ email });
    if(!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if(!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, name: user.name, email: user.email, role: user.role });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- Get current user -----
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ====================== TEACHER ROUTES ====================== */

// Get students in a class (for dropdowns)
app.get('/api/teacher/attendance', auth, async (req,res)=>{
  if(req.user.role!=='teacher') return res.status(403).json({ error: 'Forbidden' });

  const cls = req.query.class;
  try{
    const students = cls ? await Student.find({ class: cls }) : await Student.find();
    res.json({ items: students.map(s=>s.name) });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save attendance
app.post('/api/teacher/attendance', auth, async (req,res)=>{
  if(req.user.role!=='teacher') return res.status(403).json({ error: 'Forbidden' });
  const { class: cls, attendance } = req.body;
  if(!cls || !attendance) return res.status(400).json({ error: 'Class & attendance required' });

  try{
    const updates = Object.entries(attendance).map(([name,status])=>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { attendance: { status, date: new Date(), teacher: req.user.id } } },
        { new: true }
      )
    );
    await Promise.all(updates);
    res.json({ status: 'Attendance saved' });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Save scores
app.post('/api/teacher/scores', auth, async (req,res)=>{
  if(req.user.role!=='teacher') return res.status(403).json({ error: 'Forbidden' });
  const { class: cls, scores } = req.body;
  if(!cls || !scores) return res.status(400).json({ error: 'Class & scores required' });

  try{
    const updates = Object.entries(scores).map(([name,data])=>
      Student.findOneAndUpdate(
        { name, class: cls },
        { $push: { scores: { data, date: new Date(), teacher: req.user.id } } },
        { new: true }
      )
    );
    await Promise.all(updates);
    res.json({ status: 'Scores saved' });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get full history
app.get('/api/teacher/history', auth, async (req,res)=>{
  if(req.user.role!=='teacher') return res.status(403).json({ error: 'Forbidden' });
  const cls = req.query.class;
  if(!cls) return res.status(400).json({ error: 'Class required' });

  try{
    const students = await Student.find({ class: cls });
    const history = students.map(s=>({
      name: s.name,
      attendance: s.attendance,
      scores: s.scores,
      remarks: s.remarks
    }));
    res.json({ items: history });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

/* ====================== REMARKS ====================== */
app.post('/api/teacher/remarks', auth, async (req,res)=>{
  if(req.user.role!=='teacher') return res.status(403).json({ error: 'Forbidden' });
  const { class: cls, student, conduct, teacherRemark } = req.body;
  if(!cls || !student || !conduct || !teacherRemark) return res.status(400).json({ error: 'All fields required' });

  try{
    await Student.findOneAndUpdate(
      { name: student, class: cls },
      { $push: { remarks: { conduct, teacherRemark, teacher: req.user.id, date: new Date() } } },
      { new: true }
    );
    res.json({ status: 'Remark saved' });
  } catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

/* ====================== ADMIN ROUTES ====================== */
// Example: create new staff or admin
app.post('/api/admin/staff', auth, async (req,res)=>{
  if(!['admin','head'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { name,email,password,role } = req.body;
  if(!name||!email||!password||!role) return res.status(400).json({ error:'All fields required' });

  try{
    const exists = await User.findOne({ email });
    if(exists) return res.status(409).json({ error:'User already exists' });

    const user = await User.create({ name,email,password,role });
    res.json({ status: 'User created', user });
  } catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});

/* ====================== SERVER ====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`✅ Server running at http://localhost:${PORT}`));