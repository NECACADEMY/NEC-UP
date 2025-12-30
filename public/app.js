// ======================
// Fused app.js for Newings School Dashboard (Role-Based & Smart + Export Word/PDF)
// ======================

// ---------------- ELEMENT REFERENCES ----------------
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logoutBtn');

const classSelect = document.getElementById('classSelect');
const loadAttendanceBtn = document.getElementById('loadAttendance');
const loadScoresBtn = document.getElementById('loadScores');
const loadHistoryBtn = document.getElementById('loadHistory');
const saveChangesBtn = document.getElementById('saveChanges');

const tableHeader = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');
const contentMessage = document.getElementById('contentMessage');

let token = localStorage.getItem('token');
let currentClass = '';
let currentMode = '';
let currentData = [];
let changes = {};

// ---------------- ROLE-BASED DASHBOARD SETUP ----------------
async function setupDashboardForRole(token){
  try {
    const resUser = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userInfoData = await resUser.json();
    const role = userInfoData.role;
    window.currentRole = role;
    userInfo.textContent = `${userInfoData.name} (${role})`;

    // Hide everything by default
    classSelect.style.display = 'none';
    loadAttendanceBtn.style.display = 'none';
    loadScoresBtn.style.display = 'none';
    loadHistoryBtn.style.display = 'none';
    saveChangesBtn.style.display = 'none';
    contentMessage.textContent = '';

    if(role === 'teacher'){
      classSelect.style.display = 'inline-block';
      loadAttendanceBtn.style.display = 'inline-block';
      loadScoresBtn.style.display = 'inline-block';
      loadHistoryBtn.style.display = 'inline-block';
    } else if(role === 'accountant'){
      contentMessage.textContent = "Fees management will be available here.";
    } else if(role === 'admin' || role === 'head'){
      classSelect.style.display = 'inline-block';
      loadAttendanceBtn.style.display = 'inline-block';
      loadScoresBtn.style.display = 'inline-block';
      loadHistoryBtn.style.display = 'inline-block';
      saveChangesBtn.style.display = 'inline-block';
    } else if(role === 'student'){
      contentMessage.textContent = "Welcome student! Your dashboard will appear here.";
    }
  } catch(err){
    console.error('Dashboard setup error:', err);
    contentMessage.textContent = 'Failed to setup dashboard.';
  }
}

// ---------------- LOGIN ----------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Login failed');

    token = data.token;
    localStorage.setItem('token', token);
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    loadClasses();
    await setupDashboardForRole(token);
  } catch(err) {
    loginError.textContent = err.message;
  }
});

// ---------------- LOGOUT ----------------
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  token = null;
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  tableBody.innerHTML = '';
  tableHeader.innerHTML = '';
  saveChangesBtn.style.display = 'none';
  contentMessage.textContent = '';
});

// ---------------- LOAD CLASSES ----------------
function loadClasses() {
  const classes = ['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Stage 6','Nursery 1','Nursery 2','Kindergarten 1','Crèche'];
  classSelect.innerHTML = '<option value="">Select Class</option>';
  classes.forEach(cls => {
    const option = document.createElement('option');
    option.value = cls;
    option.textContent = cls;
    classSelect.appendChild(option);
  });
}

// ---------------- LOAD DATA ----------------
async function loadData(mode){
  currentMode = mode;
  const cls = classSelect.value;
  if(!cls){
    contentMessage.textContent='Please select a class.';
    return;
  }
  currentClass = cls;
  changes = {};
  saveChangesBtn.style.display = 'none';
  contentMessage.textContent = '';

  let endpoint = '';
  if(mode==='attendance') endpoint='/api/teacher/attendance';
  else if(mode==='scores') endpoint='/api/teacher/scores';
  else endpoint='/api/teacher/history';

  try {
    const res = await fetch(`${endpoint}?class=${cls}`, {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Failed to load data');

    currentData = data.items || data;
    renderTable(mode);
  } catch(err){
    contentMessage.textContent = err.message;
  }
}

// ---------------- RENDER TABLE ----------------
function renderTable(type){
  tableHeader.innerHTML = '';
  tableBody.innerHTML = '';
  saveChangesBtn.style.display = 'none';

  if(!currentData.length){
    contentMessage.textContent='No data available';
    return;
  }

  const headers = ['Name'];
  if(type==='attendance') headers.push('Attendance');
  else if(type==='scores') headers.push('Scores (JSON)');
  else headers.push('Attendance','Scores');

  headers.forEach(h=>{
    const th = document.createElement('th');
    th.textContent = h;
    th.style.fontWeight = 'bold';
    th.style.fontSize = '16px';
    tableHeader.appendChild(th);
  });

  currentData.forEach(item=>{
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = item.name;
    tdName.style.fontWeight='bold';
    tdName.style.color='red';
    tr.appendChild(tdName);

    if(type==='attendance'){
      const td = document.createElement('td');
      const select = document.createElement('select');
      ['Present','Absent','Late'].forEach(opt=>{
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if(item.attendance?.length) option.selected = item.attendance[item.attendance.length-1].status===opt;
        select.appendChild(option);
      });
      select.addEventListener('change', ()=>{
        changes[item.name] = select.value;
        saveChangesBtn.style.display='inline-block';
      });
      td.appendChild(select);
      td.style.fontWeight='bold';
      td.style.color='red';
      tr.appendChild(td);
    } else if(type==='scores'){
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type='text';
      input.value = JSON.stringify(item.scores?.[item.scores.length-1]?.data || {});
      input.style.fontWeight='bold';
      input.style.color='red';
      input.addEventListener('input', ()=>{
        try{ changes[item.name]=JSON.parse(input.value); saveChangesBtn.style.display='inline-block'; }catch(err){}
      });
      td.appendChild(input);
      tr.appendChild(td);
    } else { // history
      const tdAtt = document.createElement('td');
      tdAtt.textContent = item.attendance.map(a=>`${a.date.split('T')[0]}:${a.status}`).join(', ');
      tdAtt.style.fontWeight='bold';
      tdAtt.style.color='red';
      tr.appendChild(tdAtt);

      const tdSc = document.createElement('td');
      tdSc.textContent = item.scores.map(s=>JSON.stringify(s.data)).join('; ');
      tdSc.style.fontWeight='bold';
      tdSc.style.color='red';
      tr.appendChild(tdSc);
    }

    tableBody.appendChild(tr);
  });
}

// ---------------- SAVE CHANGES ----------------
saveChangesBtn.addEventListener('click', async ()=>{
  if(!currentClass || !currentMode || !Object.keys(changes).length) return;
  const endpoint = currentMode==='attendance' ? '/api/teacher/attendance' : '/api/teacher/scores';
  let payload = { class: currentClass, [currentMode]: changes };

  try{
    const res = await fetch(endpoint,{
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Failed to save');

    contentMessage.textContent='Changes saved successfully!';
    saveChangesBtn.style.display = 'none';
    changes={};
    loadData(currentMode);
  }catch(err){
    contentMessage.textContent=err.message;
  }
});

// ---------------- BUTTON EVENTS ----------------
loadAttendanceBtn.addEventListener('click', ()=>loadData('attendance'));
loadScoresBtn.addEventListener('click', ()=>loadData('scores'));
loadHistoryBtn.addEventListener('click', ()=>loadData('history'));

// ---------------- AUTO LOGIN ----------------
if(token){
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  userInfo.textContent='Loading...';
  loadClasses();
  setupDashboardForRole(token);
}

// ================= EXPORT WORD/PDF =================
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from "docx";
import { saveAs } from "file-saver";
import PDFDocument from "pdfkit";
import blobStream from "blob-stream";

// --- EXPORT TO WORD ---
function exportToWord(tableId, fileName) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const rows = Array.from(table.rows);
  const docTableRows = rows.map(row => {
    const cells = Array.from(row.cells).map(cell =>
      new TableCell({
        children: [new Paragraph(cell.innerText)],
      })
    );
    return new TableRow({ children: cells });
  });

  const doc = new Document({
    sections: [{ children: [new Paragraph({ text: "Report", bold: true }), new Table({ rows: docTableRows })] }]
  });

  Packer.toBlob(doc).then(blob => saveAs(blob, fileName));
}

// --- EXPORT TO PDF ---
function exportToPDF(tableId, fileName) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const doc = new PDFDocument();
  const stream = doc.pipe(blobStream());

  doc.fontSize(16).text("Report", { align: "center" }).moveDown();

  const rows = Array.from(table.rows);
  rows.forEach(row => {
    const rowText = Array.from(row.cells).map(cell => cell.innerText).join(" | ");
    doc.fontSize(12).text(rowText);
  });

  doc.end();
  stream.on("finish", function () {
    const blob = stream.toBlob("application/pdf");
    saveAs(blob, fileName);
  });
}

// --- EXPORT BUTTONS ---
document.getElementById("exportWord").addEventListener("click", () => exportToWord("dataTable", "Report.docx"));
document.getElementById("exportPDF").addEventListener("click", () => exportToPDF("dataTable", "Report.pdf"));