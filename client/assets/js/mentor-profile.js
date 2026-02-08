const API_BASE = (() => {
  if (window.location.port === '8080' || window.location.hostname === 'localhost') {
    return 'http://localhost:5000/api';
  }
  return '/api';
})();

const getToken = () => localStorage.getItem('token') || '';

const DOM = {
  mentorAvatar: document.getElementById('mentorAvatar'),
  mentorName: document.getElementById('mentorName'),
  mentorBio: document.getElementById('mentorBio'),
  mentorEmail: document.getElementById('mentorEmail'),
  mentorJoined: document.getElementById('mentorJoined'),
  mentorCourseCount: document.getElementById('mentorCourseCount'),
  mentorStudentCount: document.getElementById('mentorStudentCount'),
  mentorCourses: document.getElementById('mentorCourses'),
  mentorAbout: document.getElementById('mentorAbout'),
  toast: document.getElementById('toast')
};

const utils = {
  toast: (message, duration = 3000) => {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), duration);
  },
  escapeHtml: (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

const getTeacherId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
};

const fetchTeacherProfile = async (teacherId) => {
  const response = await fetch(`${API_BASE}/teachers/${teacherId}/profile`, {
    headers: {
      Authorization: getToken() ? `Bearer ${getToken()}` : ''
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};

const renderProfile = (data) => {
  const { profile, courses, stats } = data;
  const avatarUrl = profile.profile_image_url 
    ? `http://localhost:5000${profile.profile_image_url}` 
    : '../assets/images/icon.png';

  if (DOM.mentorAvatar) DOM.mentorAvatar.src = avatarUrl;
  if (DOM.mentorName) DOM.mentorName.textContent = profile.name || 'Teacher';
  if (DOM.mentorBio) DOM.mentorBio.textContent = profile.bio || 'No bio available.';
  if (DOM.mentorEmail) DOM.mentorEmail.textContent = profile.email || '--';
  if (DOM.mentorJoined) {
    DOM.mentorJoined.textContent = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString()
      : '--';
  }
  if (DOM.mentorCourseCount) {
    DOM.mentorCourseCount.textContent = stats?.totalCourses ?? courses.length;
  }
  if (DOM.mentorStudentCount) {
    DOM.mentorStudentCount.textContent = stats?.totalStudents ?? 0;
  }
  if (DOM.mentorAbout) {
    DOM.mentorAbout.textContent = profile.bio || 'This mentor has not added a bio yet.';
  }

  if (DOM.mentorCourses) {
    if (!courses.length) {
      DOM.mentorCourses.innerHTML = '<p class="text-gray-400">No courses found.</p>';
      return;
    }

    DOM.mentorCourses.innerHTML = courses.map((course) => `
      <div class="bg-white/5 border border-white/10 p-4 rounded-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h4 class="text-lg font-semibold">${utils.escapeHtml(course.title)}</h4>
            <p class="text-sm text-gray-400">${utils.escapeHtml(course.description || 'No description')}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-400">Students</p>
            <p class="text-xl font-semibold text-neonBlue">${course.student_count || 0}</p>
          </div>
        </div>
      </div>
    `).join('');
  }
};

const init = async () => {
  const teacherId = getTeacherId();
  if (!teacherId) {
    utils.toast('Teacher not found.');
    if (DOM.mentorName) DOM.mentorName.textContent = 'Teacher not found';
    return;
  }

  try {
    const data = await fetchTeacherProfile(teacherId);
    renderProfile(data);
  } catch (error) {
    console.error('Failed to load mentor profile:', error);
    utils.toast('Failed to load mentor profile.');
    if (DOM.mentorCourses) {
      DOM.mentorCourses.innerHTML = '<p class="text-red-400">Unable to load courses.</p>';
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}