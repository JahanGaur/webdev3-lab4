const fs = require("fs/promises");
const path = require("path");
const { DATA_DIR } = require("../config");

const files = {
  users: path.join(DATA_DIR, "users.json"),
  notes: path.join(DATA_DIR, "notes.json")
};

// Serialize writes so simultaneous requests do not overwrite each other's data.
let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const filePath of Object.values(files)) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "[]\n", "utf8");
    }
  }
}

async function readCollection(name) {
  const filePath = files[name];
  if (!filePath) throw new Error(`Unknown collection: ${name}`);
  await ensureStore();
  const raw = await fs.readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) throw new Error("Stored data must be an array");
    return parsed;
  } catch (error) {
    throw new Error(`Could not read ${name}.json: ${error.message}`);
  }
}

function writeCollection(name, records) {
  const filePath = files[name];
  if (!filePath) return Promise.reject(new Error(`Unknown collection: ${name}`));

  const operation = async () => {
    await ensureStore();
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(records, null, 2) + "\n", "utf8");
    await fs.rename(tempPath, filePath);
  };

  writeQueue = writeQueue.then(operation, operation);
  return writeQueue;
}

module.exports = { ensureStore, readCollection, writeCollection };
