// File: client/assets/js/teacher.js
// Modern, clean teacher dashboard implementation

/* ==================== CONFIGURATION ==================== */
// Dynamically determine API base URL
const API_BASE = (() => {
  // Check if we're on a specific port (like :8080 client, :5000 server)
  if (window.location.port === '8080' || window.location.hostname === 'localhost') {
    return 'http://localhost:5000/api';
  }
  // Production - same domain
  return '/api';
})();

console.log('🔧 API Base URL:', API_BASE); // Debug log

const getToken = () => localStorage.getItem('token') || '';
const getUserName = () => localStorage.getItem('userName') || 'Teacher';

/* ==================== DOM REFERENCES ==================== */
const DOM = {
  // Dashboard elements
  pendingGrid: document.getElementById('pendingGrid'),
  acceptedGrid: document.getElementById('acceptedGrid'),
   sessionsGrid: document.getElementById('sessionsGrid'),
  studentsGrid: document.getElementById('studentsGrid'),
  emptyState: document.getElementById('emptyState'),
  toast: document.getElementById('toast'),
  teacherName: document.getElementById('teacherNameSidebar'),
  refreshBtn: document.getElementById('refreshBtn'),
  searchInput: document.getElementById('searchInput'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Materials elements
  courseSelect: document.getElementById('courseSelect'),
  matTitle: document.getElementById('matTitle'),
  matDesc: document.getElementById('matDesc'),
  matFile: document.getElementById('matFile'),
  matVideo: document.getElementById('matVideo'),
  uploadBtn: document.getElementById('uploadMatBtn'),
  materialList: document.getElementById('materialList'),
  
  // Sections
  sections: {
    dashboard: document.getElementById('dashboardSection'),
    sessions: document.getElementById('sessionsSection'),
    students: document.getElementById('studentsSection'),
    materials: document.getElementById('materialsSection')
  },
  
  navItems: document.querySelectorAll('aside nav button')
};

/* ==================== STATE MANAGEMENT ==================== */
const state = {
  bookings: [],
  students: [],
  courses: [],
  activeCourseId: localStorage.getItem('activeCourseId') || '',
  currentSection: 'dashboard'
};

/* ==================== UTILITY FUNCTIONS ==================== */
const utils = {
  // Create headers for API requests
  headers: (isFormData = false) => {
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Escape HTML to prevent XSS
  escapeHtml: (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Show toast notification
  toast: (message, duration = 3000) => {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), duration);
  },

  // Handle API errors
  handleError: (error, context = 'Operation') => {
    console.error(`${context} error:`, error);
    const message = error.message || 'An error occurred';
    utils.toast(`${context} failed: ${message}`);
  },

  // Format date/time
  formatDateTime: (dateStr, timeStr) => {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return timeStr ? `${formatted} at ${timeStr}` : formatted;
    } catch {
      return dateStr;
    }
  }
};

/* ==================== API FUNCTIONS ==================== */
const api = {
  // Fetch all bookings
  fetchBookings: async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        headers: utils.headers()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      state.bookings = Array.isArray(data) ? data : [];
      return state.bookings;
    } catch (error) {
      utils.handleError(error, 'Fetch bookings');
      return [];
    }
  },

  // Accept a booking
  acceptBooking: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: utils.headers()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Accept failed');
      }
      
      utils.toast('Booking accepted! Video room created.');
      return true;
    } catch (error) {
      utils.handleError(error, 'Accept booking');
      return false;
    }
  },

  // Fetch teacher courses
  fetchTeacherCourses: async () => {
    try {
      const response = await fetch(`${API_BASE}/materials/teacher/courses`, {
        headers: utils.headers()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      state.courses = Array.isArray(data) ? data : [];
      return state.courses;
    } catch (error) {
      utils.handleError(error, 'Fetch courses');
      return [];
    }
  },

  // Fetch materials for a course
  fetchMaterials: async (courseId) => {
    try {
      const response = await fetch(
        `${API_BASE}/materials/teacher/courses/${courseId}/materials`,
        { headers: utils.headers() }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      utils.handleError(error, 'Fetch materials');
      return [];
    }
  },

  // Create video room for booking
  createVideoRoom: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE}/video/${bookingId}/create`, {
        method: 'POST',
        headers: utils.headers()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Create room failed');
      }

      return await response.json();
    } catch (error) {
      utils.handleError(error, 'Create video room');
      return null;
    }
  },

// Fetch students for teacher
  fetchStudents: async () => {
    try {
      const response = await fetch(`${API_BASE}/students`, {
        headers: utils.headers()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      state.students = Array.isArray(data) ? data : [];
      return state.students;
    } catch (error) {
      utils.handleError(error, 'Fetch students');
      return [];
    }
  },

  // Upload material
  uploadMaterial: async (courseId, formData) => {
    try {
      const response = await fetch(
        `${API_BASE}/materials/teacher/courses/${courseId}/materials`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` }, // Only auth header for FormData
          body: formData
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return await response.json();
    } catch (error) {
      utils.handleError(error, 'Upload material');
      return null;
    }
  }
};

/* ==================== UI RENDER FUNCTIONS ==================== */
const render = {
  // Render bookings on dashboard
  bookings: (bookings) => {
    const searchQuery = (DOM.searchInput?.value || '').toLowerCase().trim();
    
    // Filter bookings based on search
    const filtered = bookings.filter(booking => {
      if (!searchQuery) return true;
      const searchText = [
        booking.studentName,
        booking.courseTitle,
        booking.date,
        booking.time
      ].join(' ').toLowerCase();
      return searchText.includes(searchQuery);
    });

    // Separate pending and accepted
    const pending = filtered.filter(b => b.status === 'requested');
    const accepted = filtered.filter(b => 
      b.status === 'accepted' || b.status === 'confirmed'
    );

    // Render pending bookings
    if (DOM.pendingGrid) {
      DOM.pendingGrid.innerHTML = pending.length
        ? pending.map(render.pendingCard).join('')
        : '<div class="card">No pending requests.</div>';
    }

    // Render accepted bookings
    if (DOM.acceptedGrid) {
      DOM.acceptedGrid.innerHTML = accepted.length
        ? accepted.map(render.acceptedCard).join('')
        : '<div class="card">No accepted sessions.</div>';
    }

    // Show/hide empty state
    if (DOM.emptyState) {
      DOM.emptyState.classList.toggle('hidden', bookings.length > 0);
    }
  },

  // Render pending booking card
  pendingCard: (booking) => {
    const { id, courseTitle, studentName, date, time } = booking;
    return `
      <div class="bg-glass border border-white/10 p-5 rounded-2xl hover:border-violetGlow/50 transition animate-fade">
        <h3 class="text-lg font-semibold mb-2">${utils.escapeHtml(courseTitle)}</h3>
        <p class="text-gray-300 mb-1">
          Student: <strong>${utils.escapeHtml(studentName)}</strong>
        </p>
        <p class="text-gray-400 text-sm mb-4">
          ${utils.formatDateTime(date, time)}
        </p>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
            Pending
          </span>
          <div class="flex-1"></div>
          <button 
            onclick="handleAcceptBooking(${id})"
            class="px-4 py-2 bg-gradient-to-r from-violetGlow to-neonBlue rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Accept
          </button>
          <button 
            onclick="handleViewDetails(${id})"
            class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
            View
          </button>
        </div>
      </div>
    `;
  },

  // Render accepted booking card
  acceptedCard: (booking) => {
    const { id, courseTitle, studentName, date, time, roomId } = booking;
    const hasRoom = Boolean(roomId);
    return `
      <div class="bg-glass border border-white/10 p-5 rounded-2xl hover:border-neonBlue/50 transition animate-fade">
        <h3 class="text-lg font-semibold mb-2">${utils.escapeHtml(courseTitle)}</h3>
        <p class="text-gray-300 mb-1">
          Student: <strong>${utils.escapeHtml(studentName)}</strong>
        </p>
        <p class="text-gray-400 text-sm mb-4">
          ${utils.formatDateTime(date, time)}
        </p>
        <p class="text-xs text-gray-400 mb-4">
          ${hasRoom ? 'Video link ready to share.' : 'Video link will be generated on start.'}
        </p>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
            Accepted
          </span>
          <div class="flex-1"></div>
          <button 
            onclick="handleCopyLink(${id})"
            class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
            Copy Link
          </button>
          <button 
            onclick="handleShareLink(${id})"
            class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
            Share Link
          </button>
          <button 
            onclick="handleStartSession(${id})"
            class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Start Session
          </button>
          <button 
            onclick="handleViewDetails(${id})"
            class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
            Details
          </button>
        </div>
      </div>
    `;
  },

  // Render sessions list
  sessions: (bookings) => {
    if (!DOM.sessionsGrid) return;
    const sessions = bookings.slice().sort((a, b) => {
      const aDate = new Date(`${a.date || ''} ${a.time || ''}`.trim());
      const bDate = new Date(`${b.date || ''} ${b.time || ''}`.trim());
      return aDate - bDate;
    });

    if (!sessions.length) {
      DOM.sessionsGrid.innerHTML = '<div class="card">No sessions found.</div>';
      return;
    }

    DOM.sessionsGrid.innerHTML = sessions.map(render.sessionCard).join('');
  },

  // Render session card
  sessionCard: (booking) => {
    const { id, courseTitle, studentName, date, time, status, roomId } = booking;
    const statusLabel = status || 'requested';
    const statusStyles = {
      requested: 'bg-yellow-500/20 text-yellow-400',
      accepted: 'bg-green-500/20 text-green-400',
      confirmed: 'bg-emerald-500/20 text-emerald-400'
    };
    const badgeClass = statusStyles[statusLabel] || 'bg-white/10 text-gray-300';
    const canStart = statusLabel === 'accepted' || statusLabel === 'confirmed';
    const hasRoom = Boolean(roomId);

    return `
      <div class="bg-glass border border-white/10 p-5 rounded-2xl hover:border-neonBlue/40 transition animate-fade">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">${utils.escapeHtml(courseTitle)}</h3>
            <p class="text-gray-300 mb-1">
              Student: <strong>${utils.escapeHtml(studentName)}</strong>
            </p>
            <p class="text-gray-400 text-sm">${utils.formatDateTime(date, time)}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}">
            ${utils.escapeHtml(statusLabel)}
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-3">
          ${hasRoom ? 'Video link ready to share.' : 'Video link will be generated on start.'}
        </p>
        <div class="flex items-center gap-2 mt-4 flex-wrap">
          ${statusLabel === 'requested' ? `
            <button 
              onclick="handleAcceptBooking(${id})"
              class="px-4 py-2 bg-gradient-to-r from-violetGlow to-neonBlue rounded-lg text-sm font-semibold hover:opacity-90 transition">
              Accept
            </button>
          ` : ''}
          ${canStart ? `
            <button 
              onclick="handleStartSession(${id})"
              class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg text-sm font-semibold hover:opacity-90 transition">
              Start Session
            </button>
            <button 
              onclick="handleCopyLink(${id})"
              class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
              Copy Link
            </button>
            <button 
              onclick="handleShareLink(${id})"
              class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
              Share Link
            </button>
          ` : ''}
          <button 
            onclick="handleViewDetails(${id})"
            class="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm hover:bg-white/20 transition">
            View Details
          </button>
        </div>
      </div>
    `;
  },

  // Render students list
  students: (students) => {
    if (!DOM.studentsGrid) return;
    if (!students.length) {
      DOM.studentsGrid.innerHTML = '<div class="card">No students found.</div>';
      return;
    }

    DOM.studentsGrid.innerHTML = students.map(render.studentCard).join('');
  },

  // Render student card
  studentCard: (student) => {
    const lastSession = student.last_session_date
      ? new Date(student.last_session_date).toLocaleDateString()
      : 'No sessions yet';
    return `
      <div class="bg-glass border border-white/10 p-5 rounded-2xl hover:border-violetGlow/40 transition animate-fade">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violetGlow to-neonBlue flex items-center justify-center text-white font-bold text-lg">
            ${utils.escapeHtml(student.name?.charAt(0)?.toUpperCase() || '?')}
          </div>
          <div>
            <h3 class="text-lg font-semibold">${utils.escapeHtml(student.name)}</h3>
            <p class="text-xs text-gray-400">Student ID: <span class="font-mono text-neonBlue">${student.id}</span></p>
          </div>
        </div>
        ${student.email ? `<p class="text-sm text-gray-400 mb-3">📧 ${utils.escapeHtml(student.email)}</p>` : ''}
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>Sessions: <strong class="text-white">${student.session_count || 0}</strong></span>
          <span>Last session: <strong class="text-white">${utils.escapeHtml(lastSession)}</strong></span>
        </div>
      </div>
    `;
  },

  // Render course options
  courseOptions: (courses) => {
    if (!DOM.courseSelect) return;
    
    const options = courses.map(course => 
      `<option value="${course.id}" ${course.id == state.activeCourseId ? 'selected' : ''}>
        ${utils.escapeHtml(course.title)}
      </option>`
    ).join('');
    
    DOM.courseSelect.innerHTML = 
      '<option value="">-- Select a course --</option>' + options;
  },

  // Render materials list
  materials: (materials) => {
    if (!DOM.materialList) return;
    
    if (!materials.length) {
      DOM.materialList.innerHTML = 
        '<p class="text-gray-400 text-center py-8">No materials uploaded yet</p>';
      return;
    }

    DOM.materialList.innerHTML = materials.map(material => `
      <div class="bg-glass border border-white/10 p-5 rounded-2xl hover:border-violetGlow/30 transition animate-fade">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1">
            <h4 class="text-lg font-semibold mb-2">${utils.escapeHtml(material.title)}</h4>
            <p class="text-gray-400 text-sm mb-3">${utils.escapeHtml(material.description || '')}</p>
            <div class="flex gap-3 flex-wrap">
              ${material.file_url ? 
                `<a href="${material.file_url}" target="_blank" 
                   class="text-violetGlow text-sm hover:underline flex items-center gap-1">
                  📄 Download File
                </a>` : ''}
              ${material.video_url ? 
                `<a href="${material.video_url}" target="_blank" 
                   class="text-neonBlue text-sm hover:underline flex items-center gap-1">
                  🎥 Watch Video
                </a>` : ''}
            </div>
          </div>
          <div class="text-gray-500 text-xs">
            ${new Date(material.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    `).join('');
  }
};

/* ==================== EVENT HANDLERS ==================== */
const handlers = {
  // Load bookings
  loadBookings: async () => {
    if (DOM.pendingGrid) {
      DOM.pendingGrid.innerHTML = '<div class="card animate-pulse">Loading bookings...</div>';
    }
    if (DOM.acceptedGrid) {
      DOM.acceptedGrid.innerHTML = '<div class="card animate-pulse">Loading...</div>';
    }

    const bookings = await api.fetchBookings();
    render.bookings(bookings);
  },

  // Load sessions
  loadSessions: async () => {
    if (DOM.sessionsGrid) {
      DOM.sessionsGrid.innerHTML = '<div class="card animate-pulse">Loading sessions...</div>';
    }
    const bookings = await api.fetchBookings();
    render.sessions(bookings);
  },

  // Load students
  loadStudents: async () => {
    if (DOM.studentsGrid) {
      DOM.studentsGrid.innerHTML = '<div class="card animate-pulse">Loading students...</div>';
    }
    const students = await api.fetchStudents();
    render.students(students);
  },

  // Accept booking handler
  acceptBooking: async (bookingId) => {
    if (!confirm('Accept this booking and create a video room?')) return;
    
    const success = await api.acceptBooking(bookingId);
    if (success) {
      await handlers.loadBookings();
    }
  },

  // Start session handler
  startSession: async (bookingId) => {
    const booking = state.bookings.find(item => item.id === bookingId);
    if (!booking?.roomId) {
      await api.createVideoRoom(bookingId);
      await handlers.loadBookings();
    }
    const url = `${window.location.origin}/views/video.html?bookingId=${bookingId}`;
    window.open(url, '_blank');
  },

  // Copy session link
  copyLink: async (bookingId) => {
    const url = `${window.location.origin}/views/video.html?bookingId=${bookingId}`;
    try {
      await navigator.clipboard.writeText(url);
      utils.toast('Session link copied to clipboard!');
    } catch (error) {
      utils.handleError(error, 'Copy link');
    }
  },

  // Share session link with student (create room if needed)
  shareLink: async (bookingId) => {
    const booking = state.bookings.find(item => item.id === bookingId);
    if (!booking?.roomId) {
      await api.createVideoRoom(bookingId);
      await handlers.loadBookings();
    }

    const url = `${window.location.origin}/views/video.html?bookingId=${bookingId}`;
    try {
      await navigator.clipboard.writeText(url);
      utils.toast('Session link shared. Student can join now!');
    } catch (error) {
      utils.handleError(error, 'Share link');
    }
  },

  // View details handler
  viewDetails: (bookingId) => {
    window.location.href = `${window.location.origin}/views/booking.html?id=${bookingId}`;
  },

  // Load courses
  loadCourses: async () => {
    if (DOM.courseSelect) {
      DOM.courseSelect.innerHTML = '<option value="">Loading courses...</option>';
    }

    const courses = await api.fetchTeacherCourses();
    render.courseOptions(courses);

    // Load materials for active course if selected
    if (state.activeCourseId && courses.length > 0) {
      await handlers.loadMaterials(state.activeCourseId);
    }
  },

  // Load materials for a course
  loadMaterials: async (courseId) => {
    if (!courseId) {
      if (DOM.materialList) {
        DOM.materialList.innerHTML = 
          '<p class="text-gray-400 text-center py-8">Select a course to view materials</p>';
      }
      return;
    }

    if (DOM.materialList) {
      DOM.materialList.innerHTML = '<p class="text-gray-400 animate-pulse">Loading materials...</p>';
    }

    const materials = await api.fetchMaterials(courseId);
    render.materials(materials);
  },

  // Upload material handler
  uploadMaterial: async () => {
    const courseId = state.activeCourseId;
    if (!courseId) {
      utils.toast('Please select a course first');
      return;
    }

    const title = DOM.matTitle?.value.trim();
    if (!title) {
      utils.toast('Please enter a title');
      return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', DOM.matDesc?.value.trim() || '');
    formData.append('video_url', DOM.matVideo?.value.trim() || '');
    
    if (DOM.matFile?.files?.[0]) {
      formData.append('material_file', DOM.matFile.files[0]);
    }

    // Upload
    const result = await api.uploadMaterial(courseId, formData);
    
    if (result) {
      utils.toast('Material uploaded successfully!');
      
      // Clear form
      if (DOM.matTitle) DOM.matTitle.value = '';
      if (DOM.matDesc) DOM.matDesc.value = '';
      if (DOM.matVideo) DOM.matVideo.value = '';
      if (DOM.matFile) DOM.matFile.value = '';
      
      // Reload materials
      await handlers.loadMaterials(courseId);
    }
  },

  // Course selection change
  courseChange: (event) => {
    state.activeCourseId = event.target.value;
    localStorage.setItem('activeCourseId', state.activeCourseId);
    handlers.loadMaterials(state.activeCourseId);
  },

  // Section navigation
  navigateSection: (sectionName) => {
    // Hide all sections
    Object.values(DOM.sections).forEach(section => {
      if (section) section.classList.add('hidden');
    });

    // Show selected section
    const selectedSection = DOM.sections[sectionName];
    if (selectedSection) {
      selectedSection.classList.remove('hidden');
      state.currentSection = sectionName;

      // Load section-specific data
      if (sectionName === 'materials') {
        handlers.loadCourses();
      }
       if (sectionName === 'sessions') {
        handlers.loadSessions();
      }
      if (sectionName === 'students') {
        handlers.loadStudents();
      }
    }
  },

  // Logout
  logout: () => {
    localStorage.clear();
    window.location.href = '/';
  }
};

/* ==================== INITIALIZATION ==================== */
const init = () => {
  // Set teacher name
  if (DOM.teacherName) {
    DOM.teacherName.textContent = getUserName();
  }

  // Attach event listeners
  DOM.refreshBtn?.addEventListener('click', handlers.loadBookings);
  DOM.searchInput?.addEventListener('input', () => render.bookings(state.bookings));
  DOM.logoutBtn?.addEventListener('click', handlers.logout);
  DOM.courseSelect?.addEventListener('change', handlers.courseChange);
  DOM.uploadBtn?.addEventListener('click', handlers.uploadMaterial);

  // Navigation
  DOM.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      DOM.navItems.forEach(b => b.classList.remove('bg-white/5'));
      btn.classList.add('bg-white/5');

      // Navigate to section
      const sectionName = btn.dataset.section?.replace('Section', '');
      if (sectionName) {
        handlers.navigateSection(sectionName);
      }
    });
  });

  // Load initial data
  handlers.loadBookings();
};

/* ==================== GLOBAL FUNCTIONS (for onclick handlers) ==================== */
window.handleAcceptBooking = handlers.acceptBooking;
window.handleStartSession = handlers.startSession;
window.handleViewDetails = handlers.viewDetails;
window.handleCopyLink = handlers.copyLink;
window.handleShareLink = handlers.shareLink;
/* ==================== START APPLICATION ==================== */
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}