// File: client/assets/js/video.js
// Robust unified video call logic for /views/video.html
// Requires socket.io client and simple-peer included on the page

const serverUrl = window.API_BASE || "http://localhost:5000";
const userToken = localStorage.getItem("token") || "";
const bookingId = new URLSearchParams(window.location.search).get("bookingId") || "";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");
const endCallBtn = document.getElementById("endCallBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const shareScreenBtn = document.getElementById("shareScreenBtn");

const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const statusText = document.getElementById("statusText");
const timerEl = document.getElementById("timer");
const tokenExpiryEl = document.getElementById("tokenExpiry");
const bookingIdLabel = document.getElementById("bookingIdLabel");
const localNameEl = document.getElementById("localName");
const remoteNameEl = document.getElementById("remoteName");
const localRoleEl = document.getElementById("localRole");
const remoteRoleEl = document.getElementById("remoteRole");
// Show toolbar with animation
const toolbar = document.querySelector(".toolbar");
let toolbarTimeout;
let localStream = null;
let peer = null;
let pendingSignal = null;
let socket = null;
let roomId = null;
let joinToken = null;
let callTimer = 0;
let callInterval = null;
let tokenExpiryInterval = null;
let isMuted = false;
let isCameraOff = false;
let currentInitiator = false;
let remoteSocketId = null;

bookingIdLabel && (bookingIdLabel.textContent = bookingId || "—");




function showToolbar(duration = 5000) {
  if (!toolbar) return;

  toolbar.classList.add("show");

  // clear previous timeout
  if (toolbarTimeout) clearTimeout(toolbarTimeout);

  // auto-hide after duration
  toolbarTimeout = setTimeout(() => {
    toolbar.classList.remove("show");
  }, duration);
}

// show on video start
window.addEventListener("load", () => showToolbar());

// show when user interacts (click anywhere on video)
const videoStage = document.querySelector(".video-stage");
videoStage.addEventListener("click", () => showToolbar());



// -------- helpers ----------
function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(decoded)));
  } catch (e) {
    return null;
  }
}

function showOverlay(text) {
  if (overlayText) overlayText.textContent = text;
  overlay && overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay && overlay.classList.add("hidden");
}
function setStatus(txt) {
  if (statusText) statusText.textContent = txt;
}

function startCallTimer() {
  clearInterval(callInterval);
  callTimer = 0;
  if (timerEl) timerEl.textContent = "00:00";
  callInterval = setInterval(() => {
    callTimer++;
    const m = String(Math.floor(callTimer / 60)).padStart(2, "0");
    const s = String(callTimer % 60).padStart(2, "0");
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}
function stopCallTimer() {
  clearInterval(callInterval);
}

function startTokenExpiryCountdown(jwt) {
  clearInterval(tokenExpiryInterval);
  if (!jwt) return;
  const payload = parseJwt(jwt);
  if (!payload || !payload.exp) return;
  function tick() {
    const secs = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    if (secs <= 0) {
      if (tokenExpiryEl) tokenExpiryEl.textContent = "token expired";
      clearInterval(tokenExpiryInterval);
      return;
    }
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    if (tokenExpiryEl)
      tokenExpiryEl.textContent = `token ${m}:${s}`;
  }
  tick();
  tokenExpiryInterval = setInterval(tick, 1000);
}

function setControlsState(joined) {
  [muteBtn, cameraBtn, leaveBtn, endCallBtn].forEach(
    (b) => b && (b.disabled = !joined)
  );
  if (joinBtn) joinBtn.disabled = joined;
  if (startBtn) startBtn.disabled = joined;
}

function setLocalFromToken(jwt) {
  const p = parseJwt(jwt);
  if (!p) return;
  const name = p.name || p.fullName || p.email || "User" + (p.userId || "");
  const role = p.role || p.roleName || "user";
  if (localNameEl) localNameEl.textContent = name;
  if (localRoleEl) localRoleEl.textContent = role;
}
function setRemoteFromRole(role) {
  if (remoteRoleEl) remoteRoleEl.textContent = role || "user";
  if (remoteNameEl)
    remoteNameEl.textContent = role === "teacher" ? "Teacher" : "Student";
}

// ------------- CREATE PEER ---------------
function createPeer(initiatorFlag, socketRef) {
  if (peer) {
    try { peer.destroy(); } catch {}
    peer = null;
  }

  const opts = { initiator: !!initiatorFlag, trickle: false };
  if (localStream) opts.stream = localStream;
  peer = new SimplePeer(opts);

  // ---------------- SIGNAL OUT ----------------
  peer.on("signal", (data) => {
    if (socketRef && socketRef.connected && remoteSocketId) {
      socketRef.emit("signal", { data, to: remoteSocketId });
      console.log("[peer] sending signal", data);
    }
  });

  // ---------------- REMOTE STREAM ----------------
  peer.on("stream", (stream) => {
    if (remoteVideo) remoteVideo.srcObject = stream;
    hideOverlay();
    setStatus("In call");
    startCallTimer();
  });

  // ---------------- DATA CHANNEL ----------------
  peer.on("connect", () => {
    console.log("[peer] connected — data channel open");

    // Force renegotiation if teacher joined first
    if (currentInitiator) {
      setTimeout(() => {
        try {
          peer.send(JSON.stringify({ type: "force-offer" }));
        } catch (err) {
          console.warn("[video] renegotiation trigger failed", err);
        }
      }, 200);
    }
  });

  // ---------------- CLOSE ----------------
  peer.on("close", () => {
    if (remoteVideo) remoteVideo.srcObject = null;
    stopCallTimer();
    setStatus("Call closed");
  });

  peer.on("error", (err) => console.error("[peer] error", err));

  // ---------------- APPLY PENDING SIGNAL IF ANY ----------------
  if (pendingSignal) {
    try {
      peer.signal(pendingSignal);
      pendingSignal = null;
      console.log("[peer] applied pending signal");
    } catch (err) {
      console.warn("[peer] applying pending signal failed", err);
    }
  }

  // ---------------- DATA CHANNEL FOR FORCE-OFFER ----------------
  peer.on("data", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "force-offer" && currentInitiator) {
        if (peer && pendingSignal) {
          peer.signal(pendingSignal);
          pendingSignal = null;
        }
      }
    } catch {}
  });

  return peer;
}


// ---------- START CAMERA ----------
startBtn &&
  (startBtn.onclick = async () => {
    try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log("Local stream tracks:", localStream.getTracks());
    if (localVideo) localVideo.srcObject = localStream;
    setStatus("Camera ready");
    joinBtn.disabled = false;
  } catch (err) {
    console.error("getUserMedia failed", err);
    alert("Allow camera & microphone");
  }
  });

// ---------- JOIN ----------
joinBtn &&
  (joinBtn.onclick = async () => {
    if (!bookingId) return alert("Missing bookingId");
    if (!userToken) return alert("Login first");

    showOverlay("Requesting join token...");
    setStatus("Requesting join token");

    try {
      const res = await fetch(`${serverUrl}/api/video/${bookingId}/join`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Join token fetch failed");
      const data = await res.json();
      joinToken = data.joinToken;
      roomId = data.roomId;

      setLocalFromToken(userToken);
      startTokenExpiryCountdown(joinToken);

      const payload = parseJwt(joinToken) || {};
      const myRole = payload.role || payload.roleName || "user";
      currentInitiator = myRole === "teacher";

      socket = io(serverUrl, {
        auth: { token: joinToken },
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        setStatus("Connected to signaling");
        showOverlay("Waiting for other participant...");
        console.log("[socket] connected, role:", myRole);
      });

      // --- THIS TRIGGERS WHEN OTHER PARTICIPANT JOINS ---
     socket.on("user-joined", (payload) => {
  remoteSocketId = payload.socketId;

  // Correct remote role display
  const myPayload = parseJwt(joinToken) || {};
  const myRole = myPayload.role || myPayload.roleName || "user";

  // If I'm teacher, remote is student; if I'm student, remote is teacher
  const remoteRole = myRole === "teacher" ? "student" : "teacher";
  setRemoteFromRole(remoteRole);

  hideOverlay();
  setStatus("Participant joined");

  if (!peer) {
    createPeer(currentInitiator, socket);
    setControlsState(true);
  } else if (currentInitiator) {
    // Teacher triggers new offer for late joiner
    setTimeout(() => {
      try {
        peer.send(JSON.stringify({ type: "force-offer" }));
      } catch {}
    }, 500);
  }
});


fullscreenBtn && (fullscreenBtn.onclick = () => {
  const videoEl = remoteVideo; // or localVideo if you want local fullscreen
  if (!videoEl) return;

  if (!document.fullscreenElement) {
    videoEl.requestFullscreen().catch(err => console.warn(err));
  } else {
    document.exitFullscreen().catch(err => console.warn(err));
  }
});


shareScreenBtn && (shareScreenBtn.onclick = async () => {
  if (!peer) return alert("Join call first");
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false // optional: can set to true if you want system audio
    });

    // Replace current video track with screen
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peer._pc
      .getSenders()
      .find(s => s.track.kind === "video");

    if (sender) sender.replaceTrack(screenTrack);

    screenTrack.onended = () => {
      // revert back to camera when screen sharing stops
      const camTrack = localStream.getVideoTracks()[0];
      if (sender) sender.replaceTrack(camTrack);
    };

    console.log("Screen sharing started");
  } catch (err) {
    console.error("Screen sharing failed", err);
  }
});


      // --- SIGNALING ---
      socket.on("signal", (payload) => {
        if (!payload) return;
        let sig = payload.data || payload.signal || payload;
        const isValid = sig && (sig.sdp || sig.candidate);
        if (!isValid) return;

        if (!peer) {
          // Buffer signal until peer exists
          pendingSignal = sig;
          return;
        }
        try {
          peer.signal(sig);
        } catch (e) {
          console.error("[peer] signal failed", e);
        }
      });

      socket.on("user-left", () => {
        setStatus("Participant left");
        showOverlay("The other participant left");
        stopCallTimer();
      });

      socket.on("disconnect", () => {
        setStatus("Disconnected");
        showOverlay("Disconnected from signaling");
        stopCallTimer();
      });
    } catch (e) {
      console.error(e);
      showOverlay("Error joining call");
    }
  });


// ---------- LEAVE / END ----------
function cleanup() {
  if (peer) try { peer.destroy(); } catch {}
  if (socket) try { socket.disconnect(); } catch {}
  if (remoteVideo) remoteVideo.srcObject = null;
  stopCallTimer();
  setControlsState(false);
  peer = null;
}

leaveBtn && (leaveBtn.onclick = cleanup);
endCallBtn && (endCallBtn.onclick = cleanup);

// ---------- MUTE / CAMERA ----------
muteBtn &&
  (muteBtn.onclick = () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
    muteBtn.innerText = isMuted ? "🔈 Unmute" : "🔇 Mute";
  });
cameraBtn &&
  (cameraBtn.onclick = () => {
    if (!localStream) return;
    isCameraOff = !isCameraOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));
    cameraBtn.innerText = isCameraOff ? "📷 On" : "📷 Off";
  });

window.addEventListener("beforeunload", cleanup);
