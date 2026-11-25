const path = require("path");

module.exports = {
  PORT: Number(process.env.PORT) || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  BCRYPT_ROUNDS: Math.max(8, Number(process.env.BCRYPT_ROUNDS) || 10),
  DATA_DIR: path.join(__dirname, "..", "data")
};
