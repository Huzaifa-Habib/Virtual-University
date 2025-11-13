const serverUrl = "http://localhost:5000";
const token = localStorage.getItem("token") || "";

/* DOM Elements */
const pendingGrid = document.getElementById("pendingGrid");
const acceptedGrid = document.getElementById("acceptedGrid");
const emptyState = document.getElementById("emptyState");
const toastEl = document.getElementById("toast");
const teacherNameEl = document.getElementById("teacherNameSidebar");
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const logoutBtn = document.getElementById("logoutBtn");

/* Section Elements */
const dashboardSection = document.getElementById("dashboardSection");
const sessionsSection = document.getElementById("sessionsSection");
const studentsSection = document.getElementById("studentsSection");
const navItems = document.querySelectorAll(".nav-item");

/* Initialization */
teacherNameEl.textContent = localStorage.getItem("userName") || "Teacher";
refreshBtn?.addEventListener("click", fetchBookings);
logoutBtn?.addEventListener("click", logout);
searchInput?.addEventListener("input", fetchBookings);

/* Sidebar navigation */
navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    navItems.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    dashboardSection.classList.add("hidden");
    sessionsSection.classList.add("hidden");
    studentsSection.classList.add("hidden");

    if(btn.dataset.route === "dashboard") dashboardSection.classList.remove("hidden");
    else if(btn.dataset.route === "sessions") {
      sessionsSection.classList.remove("hidden");
      fetchSessions();
    }
    else if(btn.dataset.route === "students") {
      studentsSection.classList.remove("hidden");
      fetchStudents();
    }
  });
});

/* Helpers */
function toast(msg, time = 3000){
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), time);
}

function escapeHtml(str){
  if(!str) return "";
  return String(str).replace(/[&<>"'`=\/]/g, s =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s])
  );
}

let bookingsCache = [];
function showEmptyIfNeeded(){
  emptyState.classList.toggle("hidden", bookingsCache.length > 0);
}

/* Fetch Bookings */
async function fetchBookings(){
  try {
    pendingGrid.innerHTML = "<div class='card'>Loading…</div>";
    acceptedGrid.innerHTML = "<div class='card'>Loading…</div>";

    const res = await fetch(`${serverUrl}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
    if(!res.ok){
      pendingGrid.innerHTML = `<div class="card">Failed to load bookings: ${res.status}</div>`;
      acceptedGrid.innerHTML = "";
      return;
    }

    const data = await res.json();
    bookingsCache = Array.isArray(data) ? data : [];
    renderBookings(bookingsCache);
  } catch(err){
    console.error(err);
    pendingGrid.innerHTML = `<div class="card">Network error</div>`;
    acceptedGrid.innerHTML = "";
  }
}

/* Render bookings */
function renderBookings(list){
  const q = (searchInput?.value || "").toLowerCase().trim();
  const filtered = list.filter(b => {
    if(!q) return true;
    return `${b.studentName || ""} ${b.courseTitle || ""} ${b.date || ""} ${b.time || ""}`.toLowerCase().includes(q);
  });

  const pending = filtered.filter(b => b.status === "requested");
  const accepted = filtered.filter(b => b.status === "accepted" || b.status === "confirmed");

  pendingGrid.innerHTML = pending.length ? pending.map(cardPending).join("") : `<div class="card">No pending requests.</div>`;
  acceptedGrid.innerHTML = accepted.length ? accepted.map(cardAccepted).join("") : `<div class="card">No accepted sessions.</div>`;

  showEmptyIfNeeded();
}

/* Card templates */
function cardPending(b){
  return `
    <div class="card">
      <h3>${escapeHtml(b.courseTitle)}</h3>
      <p>With <strong>${escapeHtml(b.studentName)}</strong></p>
      <p class="muted">Date: ${escapeHtml(b.date)} | Time: ${escapeHtml(b.time)}</p>
      <div class="actions">
        <span class="pill pend">Pending</span>
        <div style="flex:1"></div>
        <button class="btn" onclick="acceptBooking(${b.id})">Accept & Generate Link</button>
        <button class="btn secondary" onclick="viewDetails(${b.id})">View</button>
      </div>
    </div>
  `;
}

function cardAccepted(b){
  return `
    <div class="card">
      <h3>${escapeHtml(b.courseTitle)}</h3>
      <p>With <strong>${escapeHtml(b.studentName)}</strong></p>
      <p class="muted">Date: ${escapeHtml(b.date)} | Time: ${escapeHtml(b.time)}</p>
      <div class="actions">
        <span class="pill acc">Accepted</span>
        <div style="flex:1"></div>
        <button class="btn" onclick="startSession(${b.id})">Start Session</button>
        <button class="btn secondary" onclick="viewDetails(${b.id})">Details</button>
      </div>
    </div>
  `;
}

/* Accept booking */
window.acceptBooking = async function(id){
  if(!confirm("Accept this booking and generate the video link?")) return;
  try {
    const res = await fetch(`${serverUrl}/api/bookings/${id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if(!res.ok) return toast(`Accept failed: ${res.status}`);
    toast("Booking accepted. Video room created!");
    fetchBookings();
  } catch(err){ console.error(err); toast("Network error during accept."); }
};

/* Start session */
window.startSession = id => window.open(`${location.origin}/views/video.html?bookingId=${id}`, "_blank");

/* View details */
window.viewDetails = id => window.location.href = `${location.origin}/views/booking.html?id=${id}`;

/* Logout */
function logout(){
  localStorage.clear();
  window.location.href = '/';
}

/* Fetch My Sessions */
async function fetchSessions(){
  const grid = document.getElementById("sessionsGrid");
  grid.innerHTML = "<div class='card'>Loading…</div>";
  try{
    const res = await fetch(`${serverUrl}/api/bookings`, { headers:{ Authorization: `Bearer ${token}` } });
    if(!res.ok){ grid.innerHTML = `<div class="card">Failed to load sessions: ${res.status}</div>`; return; }
    const data = await res.json();
    grid.innerHTML = data.length ? data.map(b => `
      <div class="card">
        <h3>${escapeHtml(b.courseTitle)}</h3>
        <p>With <strong>${escapeHtml(b.studentName)}</strong></p>
        <p class="muted">Date: ${escapeHtml(b.date)} | Time: ${escapeHtml(b.time)}</p>
        <span class="pill">${escapeHtml(b.status)}</span>
      </div>
    `).join("") : `<div class="card">No sessions found.</div>`;
  }catch(err){ console.error(err); grid.innerHTML = `<div class="card">Network error</div>`; }
}

/* Fetch Students */
async function fetchStudents(){
  const grid = document.getElementById("studentsGrid");
  grid.innerHTML = "<div class='card'>Loading…</div>";
  try{
    const res = await fetch(`${serverUrl}/api/students`, { headers:{ Authorization: `Bearer ${token}` } });
    if(!res.ok){ grid.innerHTML = `<div class="card">Failed to load students: ${res.status}</div>`; return; }
    const data = await res.json();
    grid.innerHTML = data.length ? data.map(s => `
      <div class="card">
        <h3>${escapeHtml(s.name)}</h3>
        <p>Email: ${escapeHtml(s.email)}</p>
        <p>Role: ${escapeHtml(s.role)}</p>
      </div>
    `).join("") : `<div class="card">No students found.</div>`;
  }catch(err){ console.error(err); grid.innerHTML = `<div class="card">Network error</div>`; }
}

/* Initial fetch */
fetchBookings();
