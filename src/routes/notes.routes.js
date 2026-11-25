const express = require("express");
const { randomUUID } = require("crypto");
const { readCollection, writeCollection } = require("../services/store");
const appEvents = require("../services/events");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const notes = await readCollection("notes");
    // A user can only see their own notes.
    res.json(notes.filter(note => note.owner === req.user.sub));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!title || title.length > 120) {
      return res.status(400).json({ message: "Title is required (maximum 120 characters)" });
    }
    if (!content || content.length > 10000) {
      return res.status(400).json({ message: "Content is required (maximum 10000 characters)" });
    }

    const notes = await readCollection("notes");
    const now = new Date().toISOString();
    const note = {
      id: randomUUID(),
      title,
      content,
      owner: req.user.sub,
      createdAt: now,
      updatedAt: now
    };
    notes.push(note);
    await writeCollection("notes", notes);
    appEvents.emit("note.created", { noteId: note.id, userId: req.user.sub });
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const notes = await readCollection("notes");
    const note = notes.find(item => item.id === req.params.id && item.owner === req.user.sub);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const title = typeof req.body.title === "string" ? req.body.title.trim() : note.title;
    const content = typeof req.body.content === "string" ? req.body.content.trim() : note.content;
    if (!title || title.length > 120 || !content || content.length > 10000) {
      return res.status(400).json({ message: "Provide a valid title and content" });
    }

    note.title = title;
    note.content = content;
    note.updatedAt = new Date().toISOString();
    await writeCollection("notes", notes);
    appEvents.emit("note.updated", { noteId: note.id, userId: req.user.sub });
    res.json(note);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const notes = await readCollection("notes");
    const index = notes.findIndex(item => item.id === req.params.id && item.owner === req.user.sub);
    if (index === -1) return res.status(404).json({ message: "Note not found" });

    const [deleted] = notes.splice(index, 1);
    await writeCollection("notes", notes);
    appEvents.emit("note.deleted", { noteId: deleted.id, userId: req.user.sub });
    res.json({ message: "Note deleted successfully", id: deleted.id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
