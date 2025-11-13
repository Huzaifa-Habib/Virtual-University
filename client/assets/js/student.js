// File: client/assets/js/student.js
// Clean student dashboard — booking + UI only (video handled by video.js on video.html)

const API_BASE = window.API_BASE || "http://localhost:5000";
const authToken = localStorage.getItem("token");
const userName = localStorage.getItem("userName") || "Student";

if (!authToken) {
  console.warn("No authToken found in localStorage.authToken");
}

/* DOM refs */
const upcomingGrid = document.getElementById("upcomingGrid");
const requestsGrid = document.getElementById("requestsGrid");
const toastEl = document.getElementById("toast");
const emptyState = document.getElementById("emptyState");
const welcomeName = document.getElementById("welcomeName");
const studentNameSidebar = document.getElementById("studentNameSidebar");

const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const logoutBtn = document.getElementById("logoutBtn");

const teacherIdInput = document.getElementById("teacherIdInput");
const courseIdInput = document.getElementById("courseIdInput");
const sessionTimeInput = document.getElementById("sessionTimeInput");
const requestBtn = document.getElementById("requestBtn");

/* basic init */
welcomeName && (welcomeName.textContent = `Welcome, ${userName}`);
studentNameSidebar && (studentNameSidebar.textContent = userName);

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: authToken ? `Bearer ${authToken}` : "",
  };
}

function toast(msg, ms = 3000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), ms);
}



/* Fetch bookings for logged-in student */
async function fetchBookings() {
  try {
    upcomingGrid.innerHTML = `<div class="student-card">Loading…</div>`;
    requestsGrid.innerHTML = `<div class="student-card">Loading…</div>`;

    const res = await fetch(`${API_BASE}/api/bookings/student`, {
      headers: headers(),
    });

    if (!res.ok) {
      upcomingGrid.innerHTML = `<div class="student-card">Failed to load (${res.status})</div>`;
      requestsGrid.innerHTML = "";
      return;
    }

    const data = await res.json();
    renderBookings(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    upcomingGrid.innerHTML = `<div class="student-card">Network error</div>`;
    requestsGrid.innerHTML = "";
  }
}

/* Render bookings */
function renderBookings(list) {
  const q = (searchInput && searchInput.value || "").toLowerCase().trim();
  const filtered = list.filter((b) => {
    if (!q) return true;
    const text = `${b.teacherName||""} ${b.courseTitle||""} ${b.time||""}`.toLowerCase();
    return text.includes(q);
  });

  const upcoming = filtered.filter((b) => b.status === "accepted" || b.status === "confirmed");
  const pending = filtered.filter((b) => b.status === "requested" || b.status === "pending");

  upcomingGrid.innerHTML = upcoming.length ? upcoming.map(cardUpcoming).join("") : `<div class="student-card">No upcoming sessions.</div>`;
  requestsGrid.innerHTML = pending.length ? pending.map(cardPending).join("") : `<div class="student-card">No pending requests.</div>`;

  if (!list.length) emptyState.classList.remove("hidden"); else emptyState.classList.add("hidden");
}
async function loadCalendarBookings() {
  const res = await fetch(`${API_BASE}/api/bookings/student`, {
    headers: headers(),
  });

  const data = await res.json();

  console.log("BOOKINGS FOR CALENDAR >>", data);

  const dates = data.map(b => {
    const d = new Date(b.date);
    if (!isNaN(d)) {
      return d.toISOString().slice(0, 10);
    }
    return null;
  }).filter(Boolean);

  console.log("CALENDAR NORMALIZED DATES >>", dates);

  studentCalendar.set("disable", dates);
}





loadCalendarBookings();


function esc(s){ if(!s) return ""; return String(s).replace(/[&<>"'`=\/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }

function cardUpcoming(b){
  const hasVideo = b.room_id || b.video_room_id || b.roomId;
  return `
    <div class="student-card">
      <h3>${esc(b.courseTitle || "Course")}</h3>
      <p>Teacher: <strong>${esc(b.teacherName || "Teacher")}</strong></p>
      <p style="color:var(--muted)">${esc(b.time || "TBD")}</p>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
        <span class="pill acc">Accepted</span>
        <div style="flex:1"></div>
        ${
          hasVideo
            ? `<a href="/views/video.html?bookingId=${b.id}" target="_blank" class="student-btn primary">Join Live Session</a>`
            : `<button class="student-btn secondary" disabled>Waiting for link...</button>`
        }
        <button class="student-btn secondary" onclick="viewBooking(${b.id})">Details</button>
      </div>
    </div>
  `;
}

function cardPending(b){
  return `
    <div class="student-card">
      <h3>${esc(b.courseTitle||"Course")}</h3>
      <p>Teacher: <strong>${esc(b.teacherName||"Teacher")}</strong></p>
      <p style="color:var(--muted)">${esc(b.time||"TBD")}</p>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
        <span class="pill pend">Pending</span>
        <div style="flex:1"></div>
        <button class="student-btn secondary" onclick="viewBooking(${b.id})">View</button>
        <button class="student-btn secondary" onclick="cancelRequest(${b.id})">Cancel</button>
      </div>
    </div>
  `;
}

/* Request booking */
async function requestBooking() {
  const teacherId = teacherIdInput.value.trim();
  const courseId = courseIdInput.value.trim() || null;
  const datetime = sessionTimeInput.value.trim(); // flatpickr already gives "2025-11-10 12:00"

  console.log("DEBUG REQUEST >>", { teacherId, courseId, datetime });

  if (!teacherId || !datetime) {
    toast("Missing teacher or time");
    return;
  }

  // Convert "2025-11-10 12:00" → "2025-11-10T12:00"
  const dtISO = datetime.replace(" ", "T");

  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      teacherId,
      courseId,
      datetime: dtISO
    })
  });

  const out = await res.json();
  console.log("BACKEND RESPONSE >>", out);

  if (!res.ok) {
    toast(out.message || "Request failed");
    return;
  }

  toast("Booking requested");
  sessionTimeInput.value = "";
  courseIdInput.value = "";
  teacherIdInput.value = "";
  fetchBookings();
}



/* Cancel request */
async function cancelRequest(id){
  if(!confirm("Cancel this booking?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: "DELETE",
      headers: headers()
    });
    if(!res.ok){ toast("Cancel failed"); return; }
    toast("Cancelled");
    fetchBookings();
  } catch(err){ console.error(err); toast("Network error"); }
}

/* View booking */
function viewBooking(id){ window.location.href = `${location.origin}/views/booking.html?id=${id}`; }

/* Chat helpers (for dashboard chat if used) */
function appendChatSystem(text){
  if(!toastEl) return;
  toast(text, 3000);
}

function appendChatUser(text){
  if(!toastEl) return;
  toast(text, 3000);
}
flatpickr("#sessionTimeInput", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  minDate: "today", // disables all past dates
  time_24hr: true,
  theme: "dark",
  disableMobile: true,
  minuteIncrement: 15,
});

// calendar for dashboard showing booked days
const studentCalendar = flatpickr("#studentCalendar", {
    inline: true,
    dateFormat: "Y-m-d",
    disable: [], // we’ll fill this with booked dates
});


/* UI wiring */
if(refreshBtn) refreshBtn.addEventListener("click", fetchBookings);
if(searchInput) searchInput.addEventListener("input", fetchBookings);
if(logoutBtn) logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  window.location.href = "/";
});
if(requestBtn) requestBtn.addEventListener("click", requestBooking);

/* initial load */
fetchBookings();
