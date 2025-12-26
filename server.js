const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const app = express();

/* =====================
   MIDDLEWARE (FIRST)
===================== */
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());

app.use(express.static('public'));
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
});

// Auth (demo)
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
});
