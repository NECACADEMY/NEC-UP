// ======================
// app.js - Newings Dashboard
// ======================

const BASE = "http://localhost:3000"; // Change if deployed elsewhere
let TOKEN = localStorage.getItem("token") || "";
let currentClass = "";
let currentMode = "";
let currentData = [];
let changes = {};

// ---------------- ELEMENT REFERENCES ----------------
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");
const userInfo = document.getElementById("user-info");
const logoutBtn = document.getElementById("logoutBtn");

const classSelect = document.getElementById("classSelect");
const loadAttendanceBtn = document.getElementById("loadAttendance");
const loadScoresBtn = document.getElementById("loadScores");
const loadHistoryBtn = document.getElementById("loadHistory");
const saveChangesBtn = document.getElementById("saveChanges");

const tableHeader = document.getElementById("tableHeader");
const tableBody = document.getElementById("tableBody");
const contentMessage = document.getElementById("contentMessage");

// ---------------- LOGIN ----------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    TOKEN = data.token;
    localStorage.setItem("token", TOKEN);
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");

    await loadClasses();
    await setupDashboardForRole();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// ---------------- LOGOUT ----------------
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  TOKEN = "";
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  tableBody.innerHTML = "";
  tableHeader.innerHTML = "";
  saveChangesBtn.style.display = "none";
  contentMessage.textContent = "";
});

// ---------------- DASHBOARD SETUP ----------------
async function setupDashboardForRole() {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, { headers: { "Authorization": `Bearer ${TOKEN}` } });
    const user = await res.json();
    userInfo.textContent = `${user.name} (${user.role})`;

    classSelect.style.display = "none";
    loadAttendanceBtn.style.display = "none";
    loadScoresBtn.style.display = "none";
    loadHistoryBtn.style.display = "none";
    saveChangesBtn.style.display = "none";
    contentMessage.textContent = "";

    if (user.role === "teacher" || user.role === "admin" || user.role === "head") {
      classSelect.style.display = "inline-block";
      loadAttendanceBtn.style.display = "inline-block";
      loadScoresBtn.style.display = "inline-block";
      loadHistoryBtn.style.display = "inline-block";
      if (user.role === "admin" || user.role === "head") saveChangesBtn.style.display = "inline-block";
    } else if (user.role === "accountant") {
      contentMessage.textContent = "Fees management will be available here.";
    } else if (user.role === "student") {
      contentMessage.textContent = "Welcome student! Your dashboard will appear here.";
    }
  } catch (err) {
    console.error(err);
    contentMessage.textContent = "Failed to setup dashboard.";
  }
}

// ---------------- LOAD CLASSES ----------------
async function loadClasses() {
  const classes = ["Stage 1","Stage 2","Stage 3","Stage 4","Stage 5","Stage 6","Nursery 1","Nursery 2","Kindergarten 1","Crèche"];
  classSelect.innerHTML = '<option value="">Select Class</option>';
  classes.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classSelect.appendChild(option);
  });
}

// ---------------- LOAD DATA ----------------
async function loadData(mode) {
  currentMode = mode;
  const cls = classSelect.value;
  if (!cls) { contentMessage.textContent = "Please select a class."; return; }
  currentClass = cls;
  changes = {};
  saveChangesBtn.style.display = "none";
  contentMessage.textContent = "";

  let endpoint = "";
  if (mode === "attendance") endpoint = `${BASE}/api/teacher/attendance?class=${cls}`;
  else if (mode === "scores") endpoint = `${BASE}/api/teacher/history?class=${cls}`;
  else endpoint = `${BASE}/api/teacher/history?class=${cls}`;

  try {
    const res = await fetch(endpoint, { headers: { "Authorization": `Bearer ${TOKEN}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load data");
    if (mode === "attendance") currentData = data.items.map(name => ({ name }));
    else currentData = data.items || [];
    renderTable(mode);
  } catch (err) {
    contentMessage.textContent = err.message;
  }
}

// ---------------- RENDER TABLE ----------------
function renderTable(type) {
  tableHeader.innerHTML = "";
  tableBody.innerHTML = "";
  saveChangesBtn.style.display = "none";

  if (!currentData.length) { contentMessage.textContent = "No data available"; return; }

  const headers = ["Name"];
  if (type === "attendance") headers.push("Attendance");
  else if (type === "scores") headers.push("Scores (JSON)");
  else headers.push("Attendance", "Scores");

  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    tableHeader.appendChild(th);
  });

  currentData.forEach(item => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = item.name;
    tdName.style.fontWeight = "bold";
    tdName.style.color = "red";
    tr.appendChild(tdName);

    if (type === "attendance") {
      const td = document.createElement("td");
      const select = document.createElement("select");
      ["Present","Absent","Late"].forEach(opt=>{
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      select.addEventListener("change", ()=>{ changes[item.name]=select.value; saveChangesBtn.style.display="inline-block"; });
      td.appendChild(select);
      tr.appendChild(td);
    } else if (type === "scores") {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = JSON.stringify(item.scores?.[item.scores.length-1]?.data || {});
      input.addEventListener("input", ()=>{ try{ changes[item.name]=JSON.parse(input.value); saveChangesBtn.style.display="inline-block"; }catch{} });
      td.appendChild(input);
      tr.appendChild(td);
    } else {
      const tdAtt = document.createElement("td");
      tdAtt.textContent = item.attendance?.map(a=>`${new Date(a.date).toLocaleDateString()}:${a.status}`).join(", ") || "";
      tr.appendChild(tdAtt);

      const tdSc = document.createElement("td");
      tdSc.textContent = item.scores?.map(s=>JSON.stringify(s.data)).join("; ") || "";
      tr.appendChild(tdSc);
    }
    tableBody.appendChild(tr);
  });
}

// ---------------- SAVE CHANGES ----------------
saveChangesBtn.addEventListener("click", async () => {
  if (!currentClass || !currentMode || !Object.keys(changes).length) return;
  const endpoint = currentMode === "attendance" ? `${BASE}/api/teacher/attendance` : `${BASE}/api/teacher/scores`;
  const payload = { class: currentClass, [currentMode]: changes };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type":"application/json","Authorization":`Bearer ${TOKEN}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    contentMessage.textContent = "Changes saved successfully!";
    saveChangesBtn.style.display = "none";
    changes = {};
    loadData(currentMode);
  } catch (err) {
    contentMessage.textContent = err.message;
  }
});

// ---------------- BUTTON EVENTS ----------------
loadAttendanceBtn.addEventListener("click", ()=>loadData("attendance"));
loadScoresBtn.addEventListener("click", ()=>loadData("scores"));
loadHistoryBtn.addEventListener("click", ()=>loadData("history"));

// ---------------- AUTO LOGIN ----------------
if (TOKEN){
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  loadClasses();
  setupDashboardForRole();
}