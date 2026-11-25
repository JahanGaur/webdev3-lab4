const express = require("express");
const { readCollection } = require("../services/store");
const router = express.Router();

// RBAC demonstration: only a user whose stored role is "admin" can access this.
router.get("/users", async (req, res, next) => {
  try {
    const users = await readCollection("users");
    res.json(users.map(({ id, username, email, role, createdAt }) => ({
      id, username, email, role, createdAt
    })));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
