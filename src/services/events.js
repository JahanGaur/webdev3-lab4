const EventEmitter = require("events");

class AppEventBus extends EventEmitter {}
const appEvents = new AppEventBus();

appEvents.on("user.registered", ({ userId, email }) => {
  console.log(`[event] user.registered id=${userId} email=${email}`);
});
appEvents.on("user.logged_in", ({ userId, email }) => {
  console.log(`[event] user.logged_in id=${userId} email=${email}`);
});
appEvents.on("note.created", ({ noteId, userId }) => {
  console.log(`[event] note.created id=${noteId} owner=${userId}`);
});
appEvents.on("note.updated", ({ noteId, userId }) => {
  console.log(`[event] note.updated id=${noteId} owner=${userId}`);
});
appEvents.on("note.deleted", ({ noteId, userId }) => {
  console.log(`[event] note.deleted id=${noteId} owner=${userId}`);
});

module.exports = appEvents;
