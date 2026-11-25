let token = "";
let socket = null;
const $ = id => document.getElementById(id);
const status = message => { $("status").textContent = message; };

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function connectChat() {
  if (socket) socket.disconnect();
  socket = io({ auth: { token } });
  socket.on("connect", () => status("Logged in. Real-time chat connected."));
  socket.on("connect_error", error => status(`Chat connection error: ${error.message}`));
  socket.on("chat:joined", data => status(`Joined chat room: ${data.room}`));
  socket.on("chat:error", data => status(data.message));
  socket.on("chat:message", data => {
    const item = document.createElement("div");
    item.className = "message";
    const time = new Date(data.sentAt).toLocaleTimeString();
    item.textContent = `[${time}] ${data.sender}: ${data.message}`;
    $("messages").appendChild(item);
    $("messages").scrollTop = $("messages").scrollHeight;
  });
}

$("signupForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: $("signupUsername").value,
        email: $("signupEmail").value,
        password: $("signupPassword").value
      })
    });
    status(result.message + ". Now log in.");
    $("loginEmail").value = $("signupEmail").value;
  } catch (error) { status(error.message); }
});

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("loginEmail").value, password: $("loginPassword").value })
    });
    token = result.token;
    connectChat();
    status(`Welcome, ${result.user.username}. JWT login successful.`);
    await loadNotes();
  } catch (error) { status(error.message); }
});

$("logoutButton").addEventListener("click", () => {
  token = "";
  if (socket) socket.disconnect();
  socket = null;
  $("notes").replaceChildren();
  $("messages").replaceChildren();
  status("Logged out.");
});

async function loadNotes() {
  const notes = await api("/api/notes");
  const container = $("notes");
  container.replaceChildren();
  if (!notes.length) {
    container.textContent = "No notes yet.";
    return;
  }
  for (const note of notes) {
    const card = document.createElement("div");
    card.className = "message";
    const heading = document.createElement("strong");
    heading.textContent = note.title;
    const content = document.createElement("p");
    content.textContent = note.content;
    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.addEventListener("click", async () => {
      const title = prompt("New title:", note.title);
      if (title === null) return;
      const contentValue = prompt("New content:", note.content);
      if (contentValue === null) return;
      try {
        await api(`/api/notes/${encodeURIComponent(note.id)}`, {
          method: "PUT", body: JSON.stringify({ title, content: contentValue })
        });
        await loadNotes();
      } catch (error) { status(error.message); }
    });
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm("Delete this note?")) return;
      try {
        await api(`/api/notes/${encodeURIComponent(note.id)}`, { method: "DELETE" });
        await loadNotes();
      } catch (error) { status(error.message); }
    });
    card.append(heading, content, edit, remove);
    container.appendChild(card);
  }
}

$("noteForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: $("noteTitle").value, content: $("noteContent").value })
    });
    $("noteForm").reset();
    await loadNotes();
    status("Note saved.");
  } catch (error) { status(error.message); }
});
$("refreshNotes").addEventListener("click", async () => {
  try { await loadNotes(); status("Notes refreshed."); }
  catch (error) { status(error.message); }
});

$("joinRoom").addEventListener("click", () => {
  if (!socket || !socket.connected) return status("Log in before joining chat.");
  socket.emit("chat:join", $("room").value.trim());
});
$("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!socket || !socket.connected) return status("Log in before sending chat messages.");
  const message = $("chatMessage").value.trim();
  const room = $("room").value.trim() || "general";
  if (!message) return;
  socket.emit("chat:message", { room, message });
  $("chatMessage").value = "";
});
