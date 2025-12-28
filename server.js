// =====================
// server.js for Newings School Management
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

const app = express();

// ---------------- CSP HEADER ----------------
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

// ---------------- DATABASE ----------------
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ---------------- MIDDLEWARE ----------------
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins, adjust for production
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// ---------------- RATE LIMITER ----------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, try later.' }
});

// ---------------- AUTH MIDDLEWARE ----------------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ---------------- SCHEMAS ----------------
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [{ date: Date, status: String }],
  scores: Object,
  remarks: [{ date: Date, teacher: String, conduct: String, remark: String }],
  assignments: [{ date: Date, title: String, options: [String], selectedOption: String }]
});
const Student = mongoose.model('Student', studentSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','teacher','head','accountant'], required: true }
});
const User = mongoose.model('User', userSchema);

// ---------------- CLASS SUBJECTS ----------------
const CLASS_SUBJECTS = {
  CRECHE: [],
  NURS1: [],
  NURS2: ["Numeracy","Literacy","Creative Arts"],
  KG1: ["Numeracy","Literacy","Creative Arts"],
  KG2: ["Numeracy","Literacy","Creative Arts"],
  STAGE1: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"],
  STAGE2: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"],
  STAGE3: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"],
  STAGE4: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"],
  STAGE5: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"],
  STAGE6: ["Math","English","Science","Social Studies","ICT","RME","Creative Arts","French"]
};

// ---------------- ROUTES ----------------

// Setup admin
app.post('/api/setup/admin', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(403).json({ error: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ name, email, password: hashedPassword, role: 'admin' });

    res.json({ status: 'Admin created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', loginLimiter, async (req,res)=>{
  const {email,password} = req.body;
  if(!email||!password) return res.status(400).json({error:'Email & password required'});
  try{
    const user = await User.findOne({email});
    if(!user) return res.status(401).json({error:'Invalid credentials'});

    const valid = await bcrypt.compare(password,user.password);
    if(!valid) return res.status(401).json({error:'Invalid credentials'});

    const token = jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET,{expiresIn:'365d'});
    res.json({token,name:user.name,email:user.email,role:user.role});
  }catch(err){
    console.error('Login error:', err);
    res.status(500).json({error:'Server error'});
  }
});

// Get current user
app.get('/api/auth/me', auth, async(req,res)=>{
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch(err) {
    console.error(err);
    res.status(500).json({error:'Server error'});
  }
});

// Admin: add student
app.post('/api/admin/students', auth, async(req,res)=>{
  if(req.role!=='admin') return res.status(403).json({error:'Forbidden'});
  const {name,class:cls} = req.body;
  if(!name||!cls) return res.status(400).json({error:'Name & class required'});
  try{
    const student = await Student.create({name,class:cls,attendance:[],scores:{},remarks:[],assignments:[]});
    res.json({status:'Student added',student});
  }catch(err){ 
    console.error('Add student error:', err); 
    res.status(500).json({error:'Failed to add student'});
  }
});

// ---------------- MORE ROUTES ----------------
// Teacher attendance, scores, remarks, assignments
// Student assignments
// Head overview
// (Keep your existing route code here as you already have it)

// ---------------- SERVE FRONTEND ----------------
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`✅ Server running at http://localhost:${PORT}`));