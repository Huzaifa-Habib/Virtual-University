// client/assets/js/auth.js
const teacherTab = document.getElementById("teacher-tab");
const studentTab = document.getElementById("student-tab");

let role = "teacher"; // default
if (teacherTab && studentTab) {
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
}

// ✅ LOGIN
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginMsg = document.getElementById("login-msg");

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

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", role);

      loginMsg.textContent = "Login successful!";
      loginMsg.style.color = "lightgreen";

      setTimeout(() => {
        if (role === "teacher")
          window.location.href = "../dashboards/teacher.html";
        else window.location.href = "../dashboards/student.html";
      }, 800);
    } catch (err) {
      loginMsg.textContent = "Server error.";
      loginMsg.style.color = "red";
    }
  });
}

// ✅ REGISTER
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const registerMsg = document.getElementById("register-msg");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        registerMsg.textContent = data.message || "Registration failed.";
        registerMsg.style.color = "red";
        return;
      }

      registerMsg.textContent = "Registered successfully! Redirecting...";
      registerMsg.style.color = "lightgreen";

      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1000);
    } catch (err) {
      registerMsg.textContent = "Server error.";
      registerMsg.style.color = "red";
    }
  });
}
