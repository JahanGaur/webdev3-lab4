require("dotenv").config();

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const { PORT, JWT_SECRET } = require("./src/config");
const { ensureStore } = require("./src/services/store");
const { authenticateToken, requireRole } = require("./src/middleware/auth");
const authRoutes = require("./src/routes/auth.routes");
const notesRoutes = require("./src/routes/notes.routes");
const adminRoutes = require("./src/routes/admin.routes");

if (!JWT_SECRET || JWT_SECRET === "replace_this_with_a_long_random_secret") {
  console.error("Set a strong JWT_SECRET in your .env file before starting the server.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Secure Connect Platform" }));
app.use("/api/auth", authRoutes);
app.use("/api/notes", authenticateToken, notesRoutes);
app.use("/api/admin", authenticateToken, requireRole("admin"), adminRoutes);

// Socket.IO authenticates the connection using the same JWT as the REST API.
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required: provide a JWT token"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid or expired JWT token"));
  }
});

io.on("connection", socket => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);
  socket.join("general");

  socket.on("chat:join", roomName => {
    if (typeof roomName !== "string" || !/^[a-zA-Z0-9_-]{1,30}$/.test(roomName)) {
      return socket.emit("chat:error", { message: "Room name must be 1-30 letters, numbers, _ or -" });
    }
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    socket.join(roomName);
    socket.emit("chat:joined", { room: roomName });
    console.log(`${socket.user.username} joined room ${roomName}`);
  });

  socket.on("chat:message", payload => {
    if (!payload || typeof payload.message !== "string") return;
    const message = payload.message.trim();
    const room = typeof payload.room === "string" && /^[a-zA-Z0-9_-]{1,30}$/.test(payload.room)
      ? payload.room : "general";
    if (!message || message.length > 1000) {
      return socket.emit("chat:error", { message: "Message must be between 1 and 1000 characters" });
    }
    // The server supplies the sender identity; clients cannot impersonate another user.
    const chatMessage = {
      id: require("crypto").randomUUID(),
      sender: socket.user.username,
      userId: socket.user.sub,
      message,
      room,
      sentAt: new Date().toISOString()
    };
    console.log(`[${room}] ${chatMessage.sender}: ${message}`);
    io.to(room).emit("chat:message", chatMessage);
  });

  socket.on("disconnect", reason => {
    console.log(`User disconnected: ${socket.user.username} (${reason})`);
  });
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

ensureStore().then(() => {
  server.listen(PORT, () => {
    console.log(`Secure Connect Platform listening on http://localhost:${PORT}`);
    console.log("REST API ready; Socket.IO chat ready.");
  });
}).catch(error => {
  console.error("Could not initialize data store:", error);
  process.exit(1);
});
