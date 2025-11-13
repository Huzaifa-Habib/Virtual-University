// File: client/assets/js/login.js
const teacherTab = document.getElementById("teacher-tab");
const studentTab = document.getElementById("student-tab");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-msg");

let role = "teacher";

// Tab switching
teacherTab.addEventListener("click", () => {
  role = "teacher";
  teacherTab.classList.add("active");
  studentTab.classList.remove("active");
});

studentTab.addEventListener("click", () => {
  role = "student";
  studentTab.classList.add("active");
  teacherTab.classList.remove("active");
});

// Form submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    loginMsg.textContent = "Please enter email and password.";
    loginMsg.style.color = "red";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginMsg.textContent = data.message || "Login failed.";
      loginMsg.style.color = "red";
      return;
    }

    // ✅ Store token & user info for dashboard
    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.userName || "User");
    localStorage.setItem("role", role);

    loginMsg.textContent = "Login successful!";
    loginMsg.style.color = "lightgreen";

    // Redirect after short delay
    setTimeout(() => {
      if (role === "teacher") window.location.href = "../dashboards/teacher-dashboard.html";
      else window.location.href = "../dashboards/student-dashboard.html";
    }, 700);
  } catch (err) {
    console.error(err);
    loginMsg.textContent = "Server error. Try again.";
    loginMsg.style.color = "red";
  }
});
