const BASE = "https://nec-up.onrender.com"; // Your Render URL
let TOKEN = localStorage.getItem('token') || '';
let students = [];

// ---------------- DOM ELEMENTS ----------------
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const submitAttendanceBtn = document.getElementById('submitAttendanceBtn');
const submitScoresBtn = document.getElementById('submitScoresBtn');
const addStudentBtn = document.getElementById('addStudentBtn');
const loadFeesBtn = document.getElementById('loadFeesBtn');

// ----------------- LOGIN / LOGOUT -----------------
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if(!email || !password){ alert('Email & password required'); return; }

  try {
    const res = await fetch(BASE+'/api/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const data = await res.json();
    if(!res.ok){ alert(data.error); return; }

    TOKEN = data.token;
    localStorage.setItem('token', TOKEN);
    document.getElementById('token').textContent = TOKEN;
    logoutBtn.classList.remove('hidden');
    document.getElementById('loginBox').classList.add('hidden');
    await showDashboard(data.role);
  } catch(e){ console.error(e); alert('Login failed'); }
}

function logout() {
  TOKEN='';
  localStorage.removeItem('token');
  document.getElementById('token').textContent='-';
  logoutBtn.classList.add('hidden');
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b=>b.classList.add('hidden'));
  document.getElementById('loginBox').classList.remove('hidden');
}

// ----------------- DASHBOARD -----------------
async function showDashboard(role) {
  document.querySelectorAll('#teacherBox,#adminBox,#headBox,#accountBox').forEach(b=>b.classList.add('hidden'));
  if(role==='teacher'){ await loadTeacher(); document.getElementById('teacherBox').classList.remove('hidden'); }
  if(role==='admin'){ document.getElementById('adminBox').classList.remove('hidden'); }
  if(role==='head'){ await loadHead(); document.getElementById('headBox').classList.remove('hidden'); }
  if(role==='accountant'){ document.getElementById('accountBox').classList.remove('hidden'); }
}

// ----------------- TEACHER -----------------
async function loadTeacher() {
  try{
    const res = await fetch(BASE+'/api/teacher/attendance',{headers:{'Authorization':'Bearer '+TOKEN}});
    const data = await res.json();
    students = data.items;
    renderAttendance(); renderScores(); loadAttendanceHistory();
  }catch(e){ console.error(e); alert('Failed to load students'); }
}

function renderAttendance() {
  const container = document.getElementById('attendanceList'); container.innerHTML='';
  students.forEach(s=>{
    const row=document.createElement('div');
    row.innerHTML=`${s} <select><option>Present</option><option>Absent</option></select>`;
    container.appendChild(row);
  });
}

function renderScores() {
  const container = document.getElementById('scoresList'); container.innerHTML='';
  students.forEach(s=>{
    const row=document.createElement('div');
    row.innerHTML=`${s} <input type="number" placeholder="Math"> <input type="number" placeholder="English">`;
    container.appendChild(row);
  });
}

async function submitAttendance() {
  const attendance={};
  document.querySelectorAll('#attendanceList div').forEach(div=>{
    const name=div.childNodes[0].textContent.trim();
    const status=div.querySelector('select').value;
    attendance[name]=status;
  });
  try{
    const res = await fetch(BASE+'/api/teacher/homework',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},
      body:JSON.stringify({attendance})
    });
    const data = await res.json();
    document.getElementById('teacherOut').textContent = JSON.stringify(data,null,2);
    alert('Attendance saved!');
  }catch(e){ console.error(e); }
}

async function submitScores() {
  const scores={};
  document.querySelectorAll('#scoresList div').forEach(div=>{
    const name=div.childNodes[0].textContent.trim();
    const math=div.querySelector('input[placeholder="Math"]').value;
    const eng=div.querySelector('input[placeholder="English"]').value;
    scores[name]={}; if(math)scores[name]['Math']=Number(math); if(eng)scores[name]['English']=Number(eng);
  });
  try{
    const res = await fetch(BASE+'/api/teacher/scores',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},
      body:JSON.stringify({scores})
    });
    const data = await res.json();
    document.getElementById('teacherOut').textContent = JSON.stringify(data,null,2);
    alert('Scores saved!');
  }catch(e){ console.error(e); }
}

async function loadAttendanceHistory() {
  try{
    const res = await fetch(BASE+'/api/teacher/attendance',{headers:{'Authorization':'Bearer '+TOKEN}});
    const data = await res.json();
    const container=document.getElementById('attendanceHistory'); container.innerHTML='';
    data.items.forEach(h=>{
      const div=document.createElement('div');
      div.textContent=h;
      container.appendChild(div);
    });
  }catch(e){ console.error(e); }
}

// ----------------- ADMIN -----------------
async function addStudent() {
  const name=document.getElementById('studentName').value.trim();
  const cls=document.getElementById('studentClass').value.trim();
  if(!name||!cls){ alert('Name & class required'); return; }
  try{
    const res = await fetch(BASE+'/api/admin/students',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},
      body:JSON.stringify({name,class:cls})
    });
    const data = await res.json();
    document.getElementById('adminOut').textContent = JSON.stringify(data,null,2);
    document.getElementById('studentName').value=''; document.getElementById('studentClass').value='';
    alert('Student added!');
  }catch(e){ console.error(e); }
}

// ----------------- HEAD -----------------
async function loadHead() {
  try{
    const res = await fetch(BASE+'/api/head/overview',{headers:{'Authorization':'Bearer '+TOKEN}});
    const data = await res.json();
    const container = document.getElementById('headData'); container.innerHTML='';
    data.students.forEach(s=>{
      const div=document.createElement('div');
      div.textContent=`${s.name} (${s.class})`;
      container.appendChild(div);
    });
    document.getElementById('headOut').textContent = JSON.stringify(data,null,2);
  }catch(e){ console.error(e); }
}

// ----------------- ACCOUNTANT -----------------
async function loadFees() {
  try{
    const res = await fetch(BASE+'/api/account/fees',{headers:{'Authorization':'Bearer '+TOKEN}});
    const data = await res.json();
    document.getElementById('accountOut').textContent = JSON.stringify(data,null,2);
  }catch(e){ console.error(e); }
}

// ----------------- EVENT LISTENERS -----------------
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
submitAttendanceBtn.addEventListener('click', submitAttendance);
submitScoresBtn.addEventListener('click', submitScores);
addStudentBtn.addEventListener('click', addStudent);
loadFeesBtn.addEventListener('click', loadFees);

// ----------------- AUTO LOGIN -----------------
window.onload=async()=>{
  if(!TOKEN) return;
  try{
    const res = await fetch(BASE+'/api/auth/me',{headers:{'Authorization':'Bearer '+TOKEN}});
    if(!res.ok) throw new Error('Session expired');
    const data = await res.json();
    await showDashboard(data.role);
  }catch{ logout(); }
};