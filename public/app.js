// =====================
// app.js for Newings School Management (CSP-Compliant)
// =====================

const BASE = "https://nec-up.onrender.com"; // Backend URL
let TOKEN = localStorage.getItem('token') || '';
let students = [];
let currentClass = 'Crèche';

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
  if (!email || !password) { alert('Email & password required'); return; }

  const data = await safeFetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!data) return;
  if (data.error) { alert(data.error); return; }

  TOKEN = data.token;
  localStorage.setItem('token', TOKEN);
  document.getElementById('token').textContent = TOKEN;
  document.getElementById('logoutBtn').classList.remove('hidden');
  document.getElementById('loginBox').classList.add('hidden');
  await showDashboard(data.role);
}

function logout() {
  TOKEN = '';
  localStorage.removeItem('token');
  document.getElementById('token').textContent = '-';
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b => b.classList.add('hidden'));
  document.getElementById('loginBox').classList.remove('hidden');
}

// ----------------- DASHBOARD -----------------
async function showDashboard(role) {
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b => b.classList.add('hidden'));
  if (role === 'teacher') { 
    await loadTeacher(currentClass); 
    document.getElementById('teacherBox').classList.remove('hidden'); 
  }
  if (role === 'admin') document.getElementById('adminBox').classList.remove('hidden');
  if (role === 'head') { await loadHead(); document.getElementById('headBox').classList.remove('hidden'); }
  if (role === 'accountant') { await loadFees(); document.getElementById('accountBox').classList.remove('hidden'); }
}

// ----------------- TEACHER -----------------
async function loadTeacher(cls) {
  currentClass = cls || currentClass;

  const data = await safeFetch(`${BASE}/api/teacher/attendance?class=${encodeURIComponent(currentClass)}`, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;

  students = data.items || [];
  renderClassSelector();
  renderAttendance();
  renderScores();
  renderHistory();
}

// Render class selector for teacher
function renderClassSelector() {
  const container = document.getElementById('teacherClassSelector');
  if (!container) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Select Class</label>
      <select id="classSelect">
        <option>Crèche</option>
        <option>Nursery 1</option>
        <option>Nursery 2</option>
        <option>Kindergarten 1</option>
        <option>Kindergarten 2</option>
        <option>Stage 1</option>
        <option>Stage 2</option>
        <option>Stage 3</option>
        <option>Stage 4</option>
        <option>Stage 5</option>
        <option>Stage 6</option>
      </select>
      <button class="submit" id="changeClassBtn">Load Class</button>
    `;
    document.getElementById('teacherBox').prepend(div);
    document.getElementById('changeClassBtn').onclick = () => {
      const sel = document.getElementById('classSelect').value;
      loadTeacher(sel);
    };
  }
}

// Render attendance input
function renderAttendance() {
  const container = document.getElementById('attendanceList'); 
  container.innerHTML = '';
  students.forEach(s => {
    const row = document.createElement('div');
    row.innerHTML = `${s.name} <select><option>Present</option><option>Absent</option></select>`;
    container.appendChild(row);
  });
}

// Render scores input
function renderScores() {
  const container = document.getElementById('scoresList'); 
  container.innerHTML = '';

  students.forEach(s => {
    const row = document.createElement('div');
    if (['Crèche','Nursery 1'].includes(currentClass)) {
      row.innerHTML = `${s.name} <input type="text" placeholder="Remark">`;
    } else if (currentClass === 'Nursery 2') {
      row.innerHTML = `${s.name} <input type="number" placeholder="Classwork 60%"> <input type="number" placeholder="Exam 40%">`;
    } else if (['Kindergarten 1','Kindergarten 2'].includes(currentClass)) {
      row.innerHTML = `${s.name} <input type="number" placeholder="Classwork 50%"> <input type="number" placeholder="Exam 50%">`;
    } else {
      row.innerHTML = `${s.name} <input type="number" placeholder="Classwork 20%"> <input type="number" placeholder="Midterm 30%"> <input type="number" placeholder="Exam 50%">`;
    }
    container.appendChild(row);
  });
}

// Submit attendance
async function submitAttendance() {
  const attendance = {};
  document.querySelectorAll('#attendanceList div').forEach(div => {
    const name = div.childNodes[0].textContent.trim();
    const status = div.querySelector('select').value;
    attendance[name] = status;
  });

  const data = await safeFetch(`${BASE}/api/teacher/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ class: currentClass, attendance })
  });
  if (!data) return;
  document.getElementById('teacherOut').textContent = JSON.stringify(data, null, 2);
  alert('Attendance saved!');
}

// Submit scores
async function submitScores() {
  const scores = {};
  document.querySelectorAll('#scoresList div').forEach(div => {
    const name = div.childNodes[0].textContent.trim();
    scores[name] = {};
    div.querySelectorAll('input').forEach(inp => {
      const val = inp.value;
      if (val) scores[name][inp.placeholder] = isNaN(val) ? val : Number(val);
    });
  });

  const data = await safeFetch(`${BASE}/api/teacher/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ class: currentClass, scores })
  });
  if (!data) return;
  document.getElementById('teacherOut').textContent = JSON.stringify(data, null, 2);
  alert('Scores saved!');
}

// Load history
async function renderHistory() {
  const data = await safeFetch(`${BASE}/api/teacher/history?class=${encodeURIComponent(currentClass)}`, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  const container = document.getElementById('attendanceHistory');
  container.innerHTML = JSON.stringify(data.items, null, 2);
}

// ----------------- ADMIN -----------------
async function addStudent() {
  const name = document.getElementById('studentName').value.trim();
  const cls = document.getElementById('studentClass').value.trim();
  if (!name || !cls) { alert('Name & class required'); return; }

  const data = await safeFetch(`${BASE}/api/admin/students`, {
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
  const data = await safeFetch(`${BASE}/api/head/overview`, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  const container = document.getElementById('headData'); 
  container.innerHTML = '';
  (data.students || []).forEach(s => {
    const div = document.createElement('div');
    div.textContent = `${s.name} (${s.class}) - Attendance:${s.attendance.length}, Scores:${s.scores.length}`;
    container.appendChild(div);
  });
  document.getElementById('headOut').textContent = JSON.stringify(data, null, 2);
}

// ----------------- ACCOUNTANT -----------------
async function loadFees() {
  const data = await safeFetch(`${BASE}/api/account/fees`, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data) return;
  document.getElementById('accountOut').textContent = JSON.stringify(data, null, 2);
}

// ----------------- EVENT LISTENERS -----------------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').onclick = login;
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('submitAttendanceBtn').onclick = submitAttendance;
  document.getElementById('submitScoresBtn').onclick = submitScores;
  document.getElementById('addStudentBtn').onclick = addStudent;
});

// ----------------- AUTO LOGIN -----------------
window.addEventListener('load', async () => {
  if (!TOKEN) return;
  const data = await safeFetch(`${BASE}/api/auth/me`, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (!data || data.error) { logout(); return; }
  await showDashboard(data.role);
});