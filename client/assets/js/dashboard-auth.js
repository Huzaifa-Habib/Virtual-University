// dashboard-auth.js
async function verifyUser() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) {
    window.location.href = "../views/login.html";
    return;
  }

  try {
    // Decode JWT client-side (for name display only)
    const payload = JSON.parse(atob(token.split(".")[1]));

    const nameEl = document.querySelector(".user-name");
    if (nameEl) nameEl.textContent = payload.name || "User";

    // role-based safety check
    if (role === "teacher" && window.location.pathname.includes("student.html")) {
      window.location.href = "../dashboards/teacher.html";
    } else if (role === "student" && window.location.pathname.includes("teacher.html")) {
      window.location.href = "../dashboards/student.html";
    }
  } catch (err) {
    console.error("Invalid token:", err);
    localStorage.removeItem("token");
    window.location.href = "../views/login.html";
  }
}

// Run check on page load
verifyUser();

// Logout function
function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "../views/login.html";
}

// Add logout click handler if element exists
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
});
