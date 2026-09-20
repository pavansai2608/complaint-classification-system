const mongoose = require('mongoose');

// Opens the connection to MongoDB. Throws if no URI is configured or if the
// connection itself fails, so the caller decides what to do (server.js exits).
async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri);
}

// Read-only check used by the health endpoint. 1 = connected.
// https://mongoosejs.com/docs/api/connection.html#Connection.prototype.readyState
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected };
