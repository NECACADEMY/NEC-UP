// Basic secure Express server for School Management
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'school-management', time: new Date().toISOString() });
});

// Simple role-based example routes
app.post('/api/auth/login', (req, res) => {
  // Temporary demo only: no real auth yet
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: 'role required: admin | head | teacher | accountant' });
  res.json({ token: 'demo-token-' + role, role });
});

app.get('/api/teacher/attendance', (req,res) => {
  res.json({ items: [] }); // will connect to database later
});
app.post('/api/teacher/homework', (req, res) => {
  res.json({ status: 'saved' });
});

app.get('/api/head/overview', (req, res) => {
  res.json({ performance: [], intake: [] });
});

app.get('/api/account/fees', (req, res) => {
  res.json({ receipts: [] });
});

app.post('/api/admin/students', (req, res) => {
  res.json({ status: 'student-added' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`School management server running on http://localhost:${PORT}`);
});
