const serverUrl = "http://localhost:5000";
const token = localStorage.getItem("token") || "";

/* DOM Elements */
const pendingGrid = document.getElementById("pendingGrid");
const acceptedGrid = document.getElementById("acceptedGrid");
const emptyState = document.getElementById("emptyState");
const toastEl = document.getElementById("toast");
const teacherNameEl = document.getElementById("teacherName");
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

    const route = btn.dataset.route;
    dashboardSection.classList.add("hidden");
    sessionsSection.classList.add("hidden");
    studentsSection.classList.add("hidden");

    if(route === "dashboard") dashboardSection.classList.remove("hidden");
    else if(route === "sessions") {
      sessionsSection.classList.remove("hidden");
      fetchSessions();
    }
    else if(route === "students") {
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

function showEmptyIfNeeded(){
  emptyState.classList.toggle("hidden", bookingsCache.length > 0);
}

let bookingsCache = [];

/* FETCH BOOKINGS */
async function fetchBookings(){
  try {
    pendingGrid.innerHTML = "<div class='card'>Loading…</div>";
    acceptedGrid.innerHTML = "<div class='card'>Loading…</div>";

    const res = await fetch(`${serverUrl}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if(!res.ok){
      const txt = await res.text();
      pendingGrid.innerHTML = `<div class="card">Failed to load bookings: ${res.status}</div>`;
      acceptedGrid.innerHTML = "";
      console.error("fetchBookings failed", res.status, txt);
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
    if(!res.ok){
      const txt = await res.text();
      toast(`Accept failed: ${res.status}`);
      console.error("acceptBooking failed", txt);
      return;
    }

    // After accepting booking, create video session
    toast("Booking accepted. Creating video room…");

    const videoRes = await fetch(`${serverUrl}/api/video/${id}/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!videoRes.ok) {
      const txt = await videoRes.text();
      console.error("Video session creation failed", txt);
      toast("Video session creation failed.");
    } else {
      const vData = await videoRes.json();
      console.log("Video session created:", vData);
      toast("Video room created successfully!");
    }

    fetchBookings();
  } catch(err){
    console.error(err);
    toast("Network error during accept.");
  }
};


/* Start session */
window.startSession = function(id){
  const url = `${location.origin}/views/video.html?bookingId=${id}`;
  window.open(url, "_blank");
};

/* View details */
window.viewDetails = function(id){
  window.location.href = `${location.origin}/views/booking.html?id=${id}`;
};

/* Logout */
function logout(){
  localStorage.clear();
  window.location.href = '/';
}

/* --- FETCH SESSIONS --- */
async function fetchSessions(){
  const grid = document.getElementById("sessionsGrid");
  grid.innerHTML = "<div class='card'>Loading…</div>";
  try {
    const res = await fetch(`${serverUrl}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!res.ok) {
      grid.innerHTML = `<div class="card">Failed to load sessions: ${res.status}</div>`;
      return;
    }
    const data = await res.json();
    if(!Array.isArray(data) || !data.length) grid.innerHTML = `<div class="card">No sessions found.</div>`;
    else grid.innerHTML = data.map(b => `
      <div class="card">
        <h3>${escapeHtml(b.courseTitle)}</h3>
        <p>With <strong>${escapeHtml(b.studentName)}</strong></p>
        <p class="muted">Date: ${escapeHtml(b.date)} | Time: ${escapeHtml(b.time)}</p>
        <span class="pill">${escapeHtml(b.status)}</span>
      </div>
    `).join("");
  } catch(err){
    console.error(err);
    grid.innerHTML = `<div class="card">Network error</div>`;
  }
}

/* --- FETCH STUDENTS --- */
async function fetchStudents(){
  const grid = document.getElementById("studentsGrid");
  grid.innerHTML = "<div class='card'>Loading…</div>";
  try {
    const res = await fetch(`${serverUrl}/api/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!res.ok){
      grid.innerHTML = `<div class="card">Failed to load students: ${res.status}</div>`;
      return;
    }
    const data = await res.json();
    if(!Array.isArray(data) || !data.length) grid.innerHTML = `<div class="card">No students found.</div>`;
    else grid.innerHTML = data.map(s => `
      <div class="card">
        <h3>${escapeHtml(s.name)}</h3>
        <p>Email: ${escapeHtml(s.email)}</p>
        <p>Role: ${escapeHtml(s.role)}</p>
      </div>
    `).join("");
  } catch(err){
    console.error(err);
    grid.innerHTML = `<div class="card">Network error</div>`;
  }
}
function formatLocalDatetimeForServer(dtLocalValue){
  if(!dtLocalValue) return "";
  const d = new Date(dtLocalValue);
  const pad = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


(async function initMiniCalendar(){
  if(typeof FullCalendar === 'undefined') return console.warn('FullCalendar not loaded');
  const calendarEl = document.getElementById('calendar');
  if(!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    dayMaxEvents: 3,
    eventDisplay: 'block',
    events: [],
    eventDidMount: function(info){
      info.el.style.transition = 'transform .28s cubic-bezier(.2,.9,.2,1), opacity .28s';
      info.el.style.opacity = '0';
      requestAnimationFrame(()=> info.el.style.opacity = '1');
    },
    dateClick: function(info){
      const input = document.getElementById('sessionTimeInput');
      if(input) input.value = info.dateStr + 'T09:00';
    },
    eventClick: function(info){
      const ev = info.event.extendedProps || {};
      alert(`${info.event.title}\nTeacher: ${ev.teacherName||ev.teacher}\nTime: ${info.event.startStr}`);
    }
  });
  calendar.render();

  async function loadBookingsIntoCalendar(){
    try{
      const token = localStorage.getItem('token') || '';
      const url = window.location.pathname.includes('/teacher') ? `${API_BASE||'http://localhost:5000'}/api/bookings` : `${API_BASE||'http://localhost:5000'}/api/bookings/student`;
      const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!res.ok) return console.warn('calendar load failed', res.status);
      const data = await res.json();
      const events = (Array.isArray(data) ? data : []).map(b=>{
        const start = (b.time && b.time.indexOf('T')===-1) ? b.time.replace(' ','T') : (b.time || b.date || null);
        return { id: b.id || `${b.id}_${b.room_id||''}`, title: b.courseTitle || (b.teacherName ? 'Session with '+b.teacherName : 'Session'), start, allDay:false, extendedProps:{ studentName: b.studentName, teacherName: b.teacherName, status: b.status } };
      });
      calendar.removeAllEvents();
      calendar.addEventSource(events);
      highlightDays();
    }catch(e){ console.error('calendar load failed', e); }
  }

  function highlightDays(){
    const dayCells = calendarEl.querySelectorAll('.fc-daygrid-day');
    dayCells.forEach(cell => { cell.classList.remove('has-event'); cell.style.transform = ''; });
    setTimeout(()=>{
      calendar.getEvents().forEach(ev=>{
        if(!ev.start) return;
        const dateStr = ev.start.toISOString().slice(0,10);
        const cell = calendarEl.querySelector(`[data-date="${dateStr}"]`);
        if(cell){
          cell.classList.add('has-event');
          cell.style.transition = 'transform .36s cubic-bezier(.2,.9,.2,1)';
          cell.style.transform = 'translateY(-6px)';
          setTimeout(()=> cell.style.transform = '', 700);
        }
      });
    },120);
  }

  await loadBookingsIntoCalendar();

  // live updates via socket.io (optional)
  if(typeof io !== 'undefined'){
    try{
      const token = localStorage.getItem('token') || '';
      const s = io((API_BASE||'http://localhost:5000'), { auth:{ token }, transports:['websocket','polling'] });
      s.on('connect', ()=> console.log('calendar socket connected'));
      s.on('booking-created', loadBookingsIntoCalendar);
      s.on('booking-updated', loadBookingsIntoCalendar);
      s.on('booking-deleted', loadBookingsIntoCalendar);
    }catch(e){ console.warn('calendar socket failed', e); }
  }

  window.reloadCalendar = loadBookingsIntoCalendar;
})();

/* Initial fetch */
fetchBookings();
