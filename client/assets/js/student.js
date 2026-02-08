// File: client/assets/js/student.js
// Student Dashboard — shows enrolled courses + bookings + enrolled teachers + UI

const API_BASE = window.API_BASE || "http://localhost:5000";

/* === Decode JWT Helper === */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    console.error("Invalid token");
    return null;
  }
}

/* === Auth + User Info === */
const token = localStorage.getItem("token");
const decoded = token ? parseJwt(token) : null;
const studentId = decoded ? decoded.id : null;
const userName = localStorage.getItem("userName") || "Student";

if (!token) console.warn("No token found in localStorage.token");
if (!studentId) console.warn("No student ID found in token payload");

/* === DOM References === */
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
const enrolledCoursesGrid = document.getElementById("enrolledCoursesGrid");
const enrolledTeachersGrid = document.getElementById("enrolledTeachersGrid");

let bookedDates = [];

/* === Init UI === */
welcomeName && (welcomeName.textContent = `Welcome, ${userName}`);
studentNameSidebar && (studentNameSidebar.textContent = userName);

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function toast(msg, ms = 3000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), ms);
}

/* === Load Enrolled Teachers === */
async function loadEnrolledTeachers() {
  try {
    if (!studentId) {
      console.warn("No student ID found in token");
      if (enrolledTeachersGrid) {
        enrolledTeachersGrid.innerHTML = `<p class="text-gray-400 text-center">Login required to view teachers.</p>`;
      }
      return;
    }

    const res = await fetch(`${API_BASE}/api/enrollments/student/${studentId}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch enrollments");

    const enrollments = await res.json();

    if (!enrollments.length) {
      if (enrolledTeachersGrid) {
        enrolledTeachersGrid.innerHTML = `<p class="text-gray-400 text-center">You haven't enrolled in any courses yet.</p>`;
      }
      return;
    }

    // Extract unique teachers from enrollments
    const teacherMap = new Map();
    
    for (const enrollment of enrollments) {
      const teacherId = enrollment.teacher_id;
      
      if (!teacherMap.has(teacherId)) {
        // Fetch teacher details
        try {
          const teacherRes = await fetch(`${API_BASE}/api/users/${teacherId}`, {
            headers: headers(),
          });
          
          if (teacherRes.ok) {
            const teacherData = await teacherRes.json();
            teacherMap.set(teacherId, {
              id: teacherId,
              name: teacherData.name || enrollment.teacher_name || 'Unknown Teacher',
              email: teacherData.email || '',
              bio: teacherData.bio || 'No bio available',
              expertise: teacherData.expertise_tags || '',
              courses: []
            });
          }
        } catch (err) {
          console.error(`Failed to fetch teacher ${teacherId}:`, err);
          // Fallback to enrollment data
          teacherMap.set(teacherId, {
            id: teacherId,
            name: enrollment.teacher_name || 'Unknown Teacher',
            email: '',
            bio: 'No bio available',
            expertise: '',
            courses: []
          });
        }
      }
      
      // Add course to teacher's course list
      teacherMap.get(teacherId).courses.push({
        title: enrollment.course_title,
        package: enrollment.package_name,
        status: enrollment.status
      });
    }

    // Render teachers
    if (enrolledTeachersGrid) {
      enrolledTeachersGrid.innerHTML = Array.from(teacherMap.values())
        .map(teacher => renderTeacherCard(teacher))
        .join("");
    }
  } catch (err) {
    console.error(err);
    if (enrolledTeachersGrid) {
      enrolledTeachersGrid.innerHTML = `<p class="text-center text-red-400">Failed to load teachers.</p>`;
    }
  }
}

/* === Render Teacher Card === */
function renderTeacherCard(teacher) {
  const coursesHtml = teacher.courses
    .map(c => `<span class="text-xs px-2 py-1 bg-white/5 rounded-md">${c.title}</span>`)
    .join(' ');
    
  return `
    <div class="bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition">
      <div class="flex flex-col md:flex-row justify-between items-start gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violetGlow to-neonBlue flex items-center justify-center text-white font-bold text-lg">
              ${teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 class="text-lg font-bold text-white">${esc(teacher.name)}</h4>
              <p class="text-xs text-gray-400">Teacher ID: <span class="font-mono text-neonBlue">${teacher.id}</span></p>
            </div>
          </div>
          
          ${teacher.email ? `<p class="text-sm text-gray-400 mb-2">📧 ${esc(teacher.email)}</p>` : ''}
          ${teacher.bio ? `<p class="text-sm text-gray-300 mb-3">${esc(teacher.bio)}</p>` : ''}
          ${teacher.expertise ? `<p class="text-xs text-gray-400 mb-3">🎯 ${esc(teacher.expertise)}</p>` : ''}
          
          <div class="mb-3">
            <p class="text-xs text-gray-400 mb-2">Your enrolled courses with this teacher:</p>
            <div class="flex flex-wrap gap-2">
              ${coursesHtml}
            </div>
          </div>
        </div>
        
        <div class="flex flex-col gap-2 w-full md:w-auto">
          <button 
            onclick="fillTeacherId('${teacher.id}')"
            class="px-4 py-2 bg-gradient-to-r from-violetGlow to-neonBlue rounded-lg text-sm font-semibold hover:opacity-90 whitespace-nowrap">
            Request Session
          </button>
          <button 
            onclick="viewTeacherProfile('${teacher.id}')"
            class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 whitespace-nowrap">
            View Profile
          </button>
        </div>
      </div>
    </div>
  `;
}

/* === Helper Functions === */
window.fillTeacherId = function(teacherId) {
  if (teacherIdInput) {
    teacherIdInput.value = teacherId;
    // Scroll to request form
    document.querySelector('#requestBtn').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    toast(`Teacher ID ${teacherId} filled in request form`);
  }
};

window.viewTeacherProfile = function(teacherId) {
  window.location.href = `/views/mentor-profile.html?id=${teacherId}`;
};

/* === Load Enrolled Courses === */
async function loadEnrolledCourses() {
  try {
    if (!studentId) {
      console.warn("No student ID found in token");
      enrolledCoursesGrid.innerHTML = `<p class="text-gray-400 text-center">Login required to view courses.</p>`;
      return;
    }

    const res = await fetch(`${API_BASE}/api/enrollments/student/${studentId}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch enrollments");

    const enrollments = await res.json();

    if (!enrollments.length) {
      enrolledCoursesGrid.innerHTML = `<p class="text-gray-400 text-center">You have not enrolled in any courses yet.</p>`;
      return;
    }

    enrolledCoursesGrid.innerHTML = enrollments
      .map(
        (e) => `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition">
        <div>
          <h4 class="text-lg font-bold text-white">${e.course_title || 'Untitled Course'}</h4>
          <p class="text-gray-400 text-sm">By ${e.teacher_name || 'Unknown Teacher'}</p>
          <p class="text-gray-200 text-sm">Package: ${e.package_name}</p>
          <p class="text-gray-200 text-sm">Price Paid: $${e.price_paid}</p>
          <p class="text-gray-400 text-xs mt-1">Enrolled on: ${new Date(
            e.enrolled_at
          ).toLocaleDateString()}</p>
        </div>
        <div class="mt-2 sm:mt-0">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${
            e.status === "active"
              ? "bg-emerald-400 text-black"
              : "bg-gray-500 text-white"
          }">
            ${e.status.toUpperCase()}
          </span>
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error(err);
    enrolledCoursesGrid.innerHTML = `<p class="text-center text-red-400">Failed to load enrolled courses.</p>`;
  }
}

/* === Fetch Bookings === */
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

/* === Render Bookings === */
function renderBookings(list) {
  if (!upcomingGrid || !requestsGrid) return;

  const q = (searchInput && searchInput.value || "").toLowerCase().trim();

  const filtered = list.filter((b) => {
    if (!q) return true;
    const text = `${b.teacherName || ""} ${b.courseTitle || ""} ${
      b.time || ""
    }`.toLowerCase();
    return text.includes(q);
  });

  const upcoming = filtered.filter(
    (b) => b.status === "accepted" || b.status === "confirmed"
  );
  const pending = filtered.filter(
    (b) => b.status === "requested" || b.status === "pending"
  );

  upcomingGrid.innerHTML = upcoming.length
    ? upcoming.map(cardUpcoming).join("")
    : `<div class="student-card">No upcoming sessions.</div>`;

  requestsGrid.innerHTML = pending.length
    ? pending.map(cardPending).join("")
    : `<div class="student-card">No pending requests.</div>`;

  if (emptyState) {
    if (!list.length) emptyState.classList.remove("hidden");
    else emptyState.classList.add("hidden");
  }
}

/* === Card Templates === */
function esc(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"'`=\/]/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;",
    }[c])
  );
}

function cardUpcoming(b) {
  const hasVideo = b.room_id || b.video_room_id || b.roomId;
  return `
    <div class="student-card">
      <h3>${esc(b.courseTitle || "Course")}</h3>
      <p>Teacher: <strong>${esc(b.teacherName || "Teacher")}</strong></p>
      <p style="color:var(--muted)">${esc(b.time || "TBD")}</p>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
        <span class="status-pill accepted">Accepted</span>
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

function cardPending(b) {
  return `
    <div class="student-card">
      <h3>${esc(b.courseTitle || "Course")}</h3>
      <p>Teacher: <strong>${esc(b.teacherName || "Teacher")}</strong></p>
      <p style="color:var(--muted)">${esc(b.time || "TBD")}</p>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
        <span class="status-pill pending">Pending</span>
        <div style="flex:1"></div>
        <button class="student-btn secondary" onclick="viewBooking(${b.id})">View</button>
        <button class="student-btn secondary" onclick="cancelRequest(${b.id})">Cancel</button>
      </div>
    </div>
  `;
}

/* === Bookings API Actions === */
async function requestBooking() {
  const teacherId = teacherIdInput.value.trim();
  const courseId = courseIdInput.value.trim() || null;
  const datetime = sessionTimeInput.value.trim();

  if (!teacherId || !datetime) {
    toast("Missing teacher or time");
    return;
  }

  const dtISO = datetime.replace(" ", "T");

  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      teacherId,
      courseId,
      datetime: dtISO,
    }),
  });

  const out = await res.json();
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

async function cancelRequest(id) {
  if (!confirm("Cancel this booking?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) {
      toast("Cancel failed");
      return;
    }
    toast("Cancelled");
    fetchBookings();
  } catch (err) {
    console.error(err);
    toast("Network error");
  }
}

function viewBooking(id) {
  window.location.href = `${location.origin}/views/booking.html?id=${id}`;
}

/* === Calendar Bookings === */
async function loadCalendarBookings() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/student`, {
      headers: headers(),
    });
    if (!res.ok) return;

    const data = await res.json();
    bookedDates = data
      .map((b) => {
        const d = new Date(b.date || b.time);
        return isNaN(d) ? null : d.toISOString().slice(0, 10);
      })
      .filter(Boolean);

    console.log("CALENDAR NORMALIZED DATES >>", bookedDates);
    studentCalendar.redraw();
  } catch (err) {
    console.error("Failed to load calendar bookings:", err);
  }
}

/* === Calendar Setup === */
flatpickr("#sessionTimeInput", {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  minDate: "today",
  time_24hr: true,
  theme: "dark",
  disableMobile: true,
  minuteIncrement: 15,
});

const studentCalendar = flatpickr("#studentCalendar", {
  inline: true,
  dateFormat: "Y-m-d",
  minDate: "today",
  disableMobile: true,
  onDayCreate: function (dObj, dStr, fp, dayElem) {
    const date = dayElem.dateObj.toISOString().slice(0, 10);
    if (bookedDates.includes(date)) {
      dayElem.classList.add("booked-highlight");
    }
  },
});

/* === UI Buttons === */
if (refreshBtn) refreshBtn.addEventListener("click", fetchBookings);
if (searchInput) searchInput.addEventListener("input", fetchBookings);
if (logoutBtn)
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/";
  });
if (requestBtn) requestBtn.addEventListener("click", requestBooking);

/* === Initial Load === */
loadCalendarBookings();
fetchBookings();
loadEnrolledCourses();
loadEnrolledTeachers();


// File: client/assets/js/student-materials-addon.js
// ADD THIS CODE TO THE END OF YOUR student.js FILE

/* ==================== MATERIALS SECTION ==================== */

// DOM References for Materials
const DOM_MATERIALS = {
  courseSelect: document.getElementById('studentCourseSelect'),
  materialList: document.getElementById('studentMaterialList'),
  noMaterialsState: document.getElementById('noMaterialsState')
};

// State for materials
const materialsState = {
  enrolledCourses: [],
  activeCourseId: localStorage.getItem('studentActiveCourseId') || '',
  materials: []
};

/* === API Functions for Materials === */
const materialsAPI = {
  // Fetch enrolled courses with material counts
  fetchEnrolledCourses: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/materials/student/enrollments`, {
        headers: headers()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      materialsState.enrolledCourses = Array.isArray(data) ? data : [];
      return materialsState.enrolledCourses;
    } catch (error) {
      console.error('Fetch enrolled courses error:', error);
      toast('Failed to load courses');
      return [];
    }
  },

  // Fetch materials for a specific course
  fetchCourseMaterials: async (courseId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/materials/student/courses/${courseId}/materials`,
        { headers: headers() }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Not enrolled in this course');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      materialsState.materials = Array.isArray(data) ? data : [];
      return materialsState.materials;
    } catch (error) {
      console.error('Fetch materials error:', error);
      toast(error.message || 'Failed to load materials');
      return [];
    }
  }
};

/* === Render Functions for Materials === */
const materialsRender = {
  // Render course options
  courseOptions: (courses) => {
    if (!DOM_MATERIALS.courseSelect) return;
    
    if (!courses.length) {
      DOM_MATERIALS.courseSelect.innerHTML = 
        '<option value="">No enrolled courses</option>';
      return;
    }
    
    const options = courses.map(course => {
      const materialCount = course.material_count || 0;
      return `<option value="${course.course_id}" ${course.course_id == materialsState.activeCourseId ? 'selected' : ''}>
        ${esc(course.course_title)} (${materialCount} materials)
      </option>`;
    }).join('');
    
    DOM_MATERIALS.courseSelect.innerHTML = 
      '<option value="">-- Select a course --</option>' + options;
  },

  // Render materials list
  materials: (materials) => {
    if (!DOM_MATERIALS.materialList) return;
    
    if (!materials.length) {
      if (DOM_MATERIALS.materialList) {
        DOM_MATERIALS.materialList.innerHTML = '';
      }
      if (DOM_MATERIALS.noMaterialsState) {
        DOM_MATERIALS.noMaterialsState.classList.remove('hidden');
      }
      return;
    }

    if (DOM_MATERIALS.noMaterialsState) {
      DOM_MATERIALS.noMaterialsState.classList.add('hidden');
    }

    DOM_MATERIALS.materialList.innerHTML = materials.map(material => `
      <div class="bg-glass border border-white/10 p-6 rounded-2xl hover:border-violetGlow/30 transition backdrop-blur-md animate-fade">
        <div class="flex flex-col md:flex-row justify-between items-start gap-4">
          <div class="flex-1">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h4 class="text-xl font-semibold mb-2">${esc(material.title)}</h4>
                ${material.teacher_name ? 
                  `<p class="text-sm text-gray-400">By ${esc(material.teacher_name)}</p>` : ''}
              </div>
              <span class="text-xs text-gray-500">
                ${new Date(material.created_at).toLocaleDateString()}
              </span>
            </div>
            
            ${material.description ? 
              `<p class="text-gray-300 mb-4">${esc(material.description)}</p>` : ''}
            
            <div class="flex flex-wrap gap-3">
              ${material.file_url ? `
                <a href="${material.file_url}" 
                   target="_blank" 
                   download
                   class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violetGlow to-purple-600 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download File
                </a>
              ` : ''}
              
              ${material.video_url ? `
                <a href="${esc(material.video_url)}" 
                   target="_blank"
                   class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neonBlue to-blue-600 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Video
                </a>
              ` : ''}
              
              ${!material.file_url && !material.video_url ? `
                <span class="text-gray-500 text-sm italic">No downloadable content</span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }
};

/* === Event Handlers for Materials === */
const materialsHandlers = {
  // Load enrolled courses
  loadCourses: async () => {
    if (DOM_MATERIALS.courseSelect) {
      DOM_MATERIALS.courseSelect.innerHTML = '<option value="">Loading courses...</option>';
    }

    const courses = await materialsAPI.fetchEnrolledCourses();
    materialsRender.courseOptions(courses);

    // Auto-load materials if there's an active course
    if (materialsState.activeCourseId && courses.length > 0) {
      await materialsHandlers.loadMaterials(materialsState.activeCourseId);
    }
  },

  // Load materials for selected course
  loadMaterials: async (courseId) => {
    if (!courseId) {
      if (DOM_MATERIALS.materialList) {
        DOM_MATERIALS.materialList.innerHTML = 
          '<p class="text-gray-400 text-center py-8">Select a course to view materials</p>';
      }
      if (DOM_MATERIALS.noMaterialsState) {
        DOM_MATERIALS.noMaterialsState.classList.add('hidden');
      }
      return;
    }

    if (DOM_MATERIALS.materialList) {
      DOM_MATERIALS.materialList.innerHTML = 
        '<p class="text-gray-400 text-center py-8 animate-pulse">Loading materials...</p>';
    }

    const materials = await materialsAPI.fetchCourseMaterials(courseId);
    materialsRender.materials(materials);
  },

  // Handle course selection change
  courseChange: (event) => {
    materialsState.activeCourseId = event.target.value;
    localStorage.setItem('studentActiveCourseId', materialsState.activeCourseId);
    materialsHandlers.loadMaterials(materialsState.activeCourseId);
  }
};

/* === Initialize Materials Event Listeners === */
function initMaterialsListeners() {
  if (DOM_MATERIALS.courseSelect) {
    DOM_MATERIALS.courseSelect.addEventListener('change', materialsHandlers.courseChange);
  }

  // Load courses when materials section becomes visible
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const materialsSection = document.getElementById('materialsSection');
      if (materialsSection && !materialsSection.classList.contains('hidden')) {
        // Materials section is now visible, load courses
        if (materialsState.enrolledCourses.length === 0) {
          materialsHandlers.loadCourses();
        }
      }
    });
  });

  const materialsSection = document.getElementById('materialsSection');
  if (materialsSection) {
    observer.observe(materialsSection, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
  }
}

/* === CALL THIS AFTER DOM LOADS === */
// Add to your existing init function or call separately
initMaterialsListeners();

// Export for use in console (debugging)
window.materialsDebug = {
  state: materialsState,
  api: materialsAPI,
  handlers: materialsHandlers
};
