// =====================
// app.js for Newings School Management
// =====================

const BASE = "https://nec-up.onrender.com"; // Render backend
let TOKEN = localStorage.getItem('token') || '';
let students = [];

// ----------------- UTILITY -----------------
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response:", text);
      alert("Server error occurred. Check backend logs.");
      return null;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Network or server error.");
    return null;
  }
}

// ----------------- LOGIN -----------------
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    alert('Email & password required');
    return;
  }

  const data = await safeFetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!data) return;

  if (data.error) {
    alert(data.error);
    return;
  }

  TOKEN = data.token;
  localStorage.setItem('token', TOKEN);
  document.getElementById('token').textContent = TOKEN;
  document.getElementById('logoutBtn').classList.remove('hidden');
  document.getElementById('loginBox').classList.add('hidden');
  await showDashboard(data.role);
}

async function logout() {
  TOKEN = '';
  localStorage.removeItem('token');
  document.getElementById('token').textContent = '-';
  document.getElementById('logoutBtn').classList.add('hidden');
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b => b.classList.add('hidden'));
  document.getElementById('loginBox').classList.remove('hidden');
}

// ----------------- DASHBOARD -----------------
async function showDashboard(role) {
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b => b.classList.add('hidden'));
  if (role === 'teacher') { await loadTeacher(); document.getElementById('teacherBox').classList.remove('hidden'); }
  if (role === 'admin') document.getElementById('adminBox').classList.remove('hidden');
  if (role === 'head') { await loadHead(); document.getElementById('headBox').classList.remove('hidden'); }
  if (role === 'accountant') document.getElementById('accountBox').classList.remove('hidden');
}

// ----------------- TEACHER -----------------
async function loadTeacher() {
  const data = await safeFetch(BASE + '/api/teacher/attendance', {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  students = data.items || [];
  renderAttendance();
  renderScores();
  loadAttendanceHistory();
}

function renderAttendance() {
  const container = document.getElementById('attendanceList'); container.innerHTML = '';
  students.forEach(s => {
    const row = document.createElement('div');
    row.innerHTML = `${s} <select><option>Present</option><option>Absent</option></select>`;
    container.appendChild(row);
  });
}

function renderScores() {
  const container = document.getElementById('scoresList'); container.innerHTML = '';
  students.forEach(s => {
    const row = document.createElement('div');
    row.innerHTML = `${s} <input type="number" placeholder="Math"> <input type="number" placeholder="English">`;
    container.appendChild(row);
  });
}

async function submitAttendance() {
  const attendance = {};
  document.querySelectorAll('#attendanceList div').forEach(div => {
    const name = div.childNodes[0].textContent.trim();
    const status = div.querySelector('select').value;
    attendance[name] = status;
  });

  const data = await safeFetch(BASE + '/api/teacher/homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ attendance })
  });
  if (!data) return;
  document.getElementById('teacherOut').textContent = JSON.stringify(data, null, 2);
  alert('Attendance saved!');
}

async function submitScores() {
  const scores = {};
  document.querySelectorAll('#scoresList div').forEach(div => {
    const name = div.childNodes[0].textContent.trim();
    const math = div.querySelector('input[placeholder="Math"]').value;
    const eng = div.querySelector('input[placeholder="English"]').value;
    scores[name] = {}; if (math) scores[name]['Math'] = Number(math); if (eng) scores[name]['English'] = Number(eng);
  });

  const data = await safeFetch(BASE + '/api/teacher/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ scores })
  });
  if (!data) return;
  document.getElementById('teacherOut').textContent = JSON.stringify(data, null, 2);
  alert('Scores saved!');
}

async function loadAttendanceHistory() {
  const data = await safeFetch(BASE + '/api/teacher/attendance/history', {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  const container = document.getElementById('attendanceHistory'); container.innerHTML = '';
  (data.history || []).forEach(h => {
    const div = document.createElement('div');
    div.textContent = `${new Date(h.date).toLocaleDateString()}: ${h.name} - ${h.status}`;
    container.appendChild(div);
  });
}

// ----------------- ADMIN -----------------
async function addStudent() {
  const name = document.getElementById('studentName').value.trim();
  const cls = document.getElementById('studentClass').value.trim();
  if (!name || !cls) { alert('Name & class required'); return; }

  const data = await safeFetch(BASE + '/api/admin/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ name, class: cls })
  });
  if (!data) return;
  document.getElementById('adminOut').textContent = JSON.stringify(data, null, 2);
  document.getElementById('studentName').value = '';
  document.getElementById('studentClass').value = '';
  alert('Student added!');
}

// ----------------- HEAD -----------------
async function loadHead() {
  const data = await safeFetch(BASE + '/api/head/overview', {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  const container = document.getElementById('headData'); container.innerHTML = '';
  (data.students || []).forEach(s => {
    const div = document.createElement('div');
    div.textContent = `${s.name} (${s.class}) - Attendance:${s.attendance.length}, Scores:${JSON.stringify(s.scores)}`;
    container.appendChild(div);
  });
  document.getElementById('headOut').textContent = JSON.stringify(data, null, 2);
}

// ----------------- ACCOUNTANT -----------------
async function loadFees() {
  const data = await safeFetch(BASE + '/api/account/fees', {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  document.getElementById('accountOut').textContent = JSON.stringify(data, null, 2);
}

// ----------------- AUTO LOGIN -----------------
window.onload = async () => {
  if (!TOKEN) return;
  const data = await safeFetch(BASE + '/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) { logout(); return; }
  await showDashboard(data.role);
};