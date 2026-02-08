const quickPromptOptions = [
  "I want a high-demand tech course under $500.",
  "Suggest AI/ML courses with strong future scope.",
  "Which mentor is best for cybersecurity?",
  "Find a data analytics course with flexible pricing.",
  "Recommend a UI/UX track for beginners."
];

const fallbackInsights = {
  topCourses: "AI & Data Science, Full-Stack Web, and Cybersecurity are trending this semester.",
  futureScope: "AI automation, cloud security, and product analytics show the strongest growth.",
  bestPricing: "Bundle plans start at $299 with student discounts and monthly options.",
  bestMentor: "Mentors with 5+ years experience in your domain are currently available."
};

function redirectToLogin() {
  window.location.href = "../views/login.html";
}

function enforceStudentAccess() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) {
    redirectToLogin();
    return null;
  }

  if (role !== "student") {
    window.location.href = "../dashboards/teacher.html";
    return null;
  }

  return token;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"'`=\/]/g, s =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s])
  );
}

function renderMessage(container, message, isUser) {
  const bubble = document.createElement("div");
  bubble.style.alignSelf = isUser ? "flex-end" : "flex-start";
  bubble.style.maxWidth = "75%";
  bubble.style.background = isUser ? "linear-gradient(135deg, var(--accent1), var(--accent2))" : "var(--glass-2)";
  bubble.style.color = isUser ? "#021218" : "#e6eef8";
  bubble.style.padding = "12px 16px";
  bubble.style.borderRadius = "16px";
  bubble.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
  bubble.style.fontSize = "0.95rem";
  bubble.innerHTML = escapeHtml(message);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function updateInsights(data) {
  document.getElementById("topCourses").textContent = data.topCourses || fallbackInsights.topCourses;
  document.getElementById("futureScope").textContent = data.futureScope || fallbackInsights.futureScope;
  document.getElementById("bestPricing").textContent = data.bestPricing || fallbackInsights.bestPricing;
  document.getElementById("bestMentor").textContent = data.bestMentor || fallbackInsights.bestMentor;
}

async function requestInsights(token, prompt) {
  try {
    const response = await fetch("http://localhost:5000/api/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      reply: data.reply || "Here's a tailored recommendation based on your goals.",
      topCourses: data.topCourses,
      futureScope: data.futureScope,
      bestPricing: data.bestPricing,
      bestMentor: data.bestMentor
    };
  } catch (error) {
    console.warn("Chatbot API error", error);
    return {
      reply: "I can still help! Share your budget, interest area, and timeline to refine suggestions.",
      ...fallbackInsights
    };
  }
}

function initializeChat(token) {
  const chatHistory = document.getElementById("chatHistory");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const quickPrompts = document.getElementById("quickPrompts");

  renderMessage(chatHistory, "Hi! Tell me your goals and I'll highlight courses, pricing, and mentors.", false);
  updateInsights(fallbackInsights);

  quickPromptOptions.forEach(prompt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-muted";
    btn.textContent = prompt;
    btn.addEventListener("click", () => {
      chatInput.value = prompt;
      chatInput.focus();
    });
    quickPrompts.appendChild(btn);
  });

  chatForm.addEventListener("submit", async event => {
    event.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    renderMessage(chatHistory, prompt, true);
    chatInput.value = "";

    const result = await requestInsights(token, prompt);
    renderMessage(chatHistory, result.reply, false);
    updateInsights(result);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const token = enforceStudentAccess();
  if (!token) return;
  initializeChat(token);
});