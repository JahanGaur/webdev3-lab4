const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { readCollection, writeCollection } = require("../services/store");
const appEvents = require("../services/events");
const { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS } = require("../config");

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (username.length < 2 || username.length > 40) {
      return res.status(400).json({ message: "Username must be between 2 and 40 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email address is required" });
    }
    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({ message: "Password must be between 6 and 72 characters" });
    }

    const users = await readCollection("users");
    if (users.some(user => user.email === email)) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id: randomUUID(),
      username,
      email,
      passwordHash,
      role: "user",
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await writeCollection("users", users);
    appEvents.emit("user.registered", { userId: user.id, email: user.email });

    return res.status(201).json({
      message: "User registered",
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const users = await readCollection("users");
    const user = users.find(item => item.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    appEvents.emit("user.logged_in", { userId: user.id, email: user.email });
    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
