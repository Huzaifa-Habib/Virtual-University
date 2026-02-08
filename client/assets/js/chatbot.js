// Student Chatbot Frontend Logic
const API_BASE = "http://localhost:5000/api";

let chatHistory = [];

// Initialize chatbot
document.addEventListener("DOMContentLoaded", () => {
  loadQuickPrompts();
  displayWelcomeMessage();
  
  const form = document.getElementById("chatForm");
  form.addEventListener("submit", handleChatSubmit);
  
  // Auto-resize input as user types
  const input = document.getElementById("chatInput");
  input.addEventListener("input", autoResizeInput);
});

/**
 * Display welcome message
 */
function displayWelcomeMessage() {
  const welcomeMsg = {
    role: "assistant",
    content: "👋 Hello! I'm your Virtual University AI assistant. I can help you with:\n\n• Finding the perfect course for your goals\n• Recommending top mentors\n• Career guidance and salary insights\n• Budget-friendly learning options\n\nWhat would you like to know?"
  };
  
  chatHistory.push(welcomeMsg);
  renderChatHistory();
}

/**
 * Load quick prompt buttons
 */
function loadQuickPrompts() {
  const prompts = [
    "Best AI/ML courses under $500",
    "Top-rated mentors",
    "High-demand tech courses",
    "Career outlook for data science",
    "Courses for beginners"
  ];

  const container = document.getElementById("quickPrompts");
  container.innerHTML = prompts
    .map(
      (p) =>
        `<button class="quick-prompt-btn" onclick="useQuickPrompt('${p}')">${p}</button>`
    )
    .join("");
}

/**
 * Use a quick prompt
 */
function useQuickPrompt(prompt) {
  document.getElementById("chatInput").value = prompt;
  document.getElementById("chatForm").dispatchEvent(new Event("submit"));
}

/**
 * Auto-resize input field
 */
function autoResizeInput(e) {
  const input = e.target;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
}

/**
 * Handle chat form submission
 */
async function handleChatSubmit(e) {
  e.preventDefault();

  const input = document.getElementById("chatInput");
  const prompt = input.value.trim();

  if (!prompt) return;

  // Add user message to history
  chatHistory.push({ role: "user", content: prompt });
  renderChatHistory();

  // Clear input and reset height
  input.value = "";
  input.style.height = "auto";

  // Show loading state
  showLoadingMessage();

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/chatbot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Chatbot API Response:", data); // Debug log

    // Remove loading message
    chatHistory = chatHistory.filter((msg) => msg.role !== "loading");

    // Add assistant response
    chatHistory.push({
      role: "assistant",
      content: data.answer || "I'm sorry, I couldn't process that request.",
    });

    renderChatHistory();

    // Update insights panel
    updateInsightsPanel(data);
  } catch (error) {
    console.error("Chatbot error:", error);
    
    // Remove loading message
    chatHistory = chatHistory.filter((msg) => msg.role !== "loading");

    chatHistory.push({
      role: "assistant",
      content: `❌ Sorry, I encountered an error: ${error.message}. Please make sure you're logged in and try again.`,
    });

    renderChatHistory();
  }
}

/**
 * Show loading message
 */
function showLoadingMessage() {
  chatHistory.push({
    role: "loading",
    content: "🤔 Analyzing your question...",
  });
  renderChatHistory();
}

/**
 * Render chat history
 */
function renderChatHistory() {
  const container = document.getElementById("chatHistory");
  
  container.innerHTML = chatHistory
    .map((msg) => {
      let className = "chat-message";
      let icon = "";

      if (msg.role === "user") {
        className += " user-message";
        icon = "👤";
      } else if (msg.role === "loading") {
        className += " loading-message";
        icon = "⏳";
      } else {
        className += " assistant-message";
        icon = "🤖";
      }

      // Convert markdown-like formatting to HTML
      let formattedContent = msg.content
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
        .replace(/\n/g, "<br>") // Line breaks
        .replace(/•/g, "&#8226;"); // Bullet points

      return `
        <div class="${className}">
          <div class="message-icon">${icon}</div>
          <div class="message-content">${formattedContent}</div>
        </div>
      `;
    })
    .join("");

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Update insights panel with data
 */
function updateInsightsPanel(data) {
  console.log("Updating insights with data:", data); // Debug log

  // Top Courses
  if (data.topCourses && Array.isArray(data.topCourses) && data.topCourses.length > 0) {
    const coursesList = data.topCourses
      .map((c, idx) => `${idx + 1}. ${c.course_name} ($${c.price || c.min_price})`)
      .join("<br>");
    document.getElementById("topCourses").innerHTML = coursesList;
  } else if (data.topCourses) {
    // If topCourses exists but isn't an array, show as string
    document.getElementById("topCourses").innerHTML = String(data.topCourses);
  }

  // Future Scope
  if (data.futureScope) {
    document.getElementById("futureScope").innerHTML = data.futureScope;
  }

  // Best Pricing
  if (data.bestPricing) {
    document.getElementById("bestPricing").innerHTML = data.bestPricing;
  }

  // Best Mentor
  if (data.topMentors && Array.isArray(data.topMentors) && data.topMentors.length > 0) {
    const mentor = data.topMentors[0];
    const mentorInfo = `${mentor.username} ⭐ ${mentor.rating || "N/A"}/5.0`;
    document.getElementById("bestMentor").innerHTML = mentorInfo;
  } else if (data.bestMentor) {
    document.getElementById("bestMentor").innerHTML = data.bestMentor;
  }
}