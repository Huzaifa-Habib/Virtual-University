const teacherTab = document.getElementById("teacher-tab");
const studentTab = document.getElementById("student-tab");
const registerForm = document.getElementById("register-form");
const registerMsg = document.getElementById("register-msg");

let role = "teacher";

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

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

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

    registerMsg.textContent = "Registered successfully!";
    registerMsg.style.color = "lightgreen";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  } catch {
    registerMsg.textContent = "Server error.";
    registerMsg.style.color = "red";
  }
});
