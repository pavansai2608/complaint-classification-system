require('dotenv').config({ quiet: true });
const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  try {
    await connectDB(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    // Fail fast: nothing in this app works without the database, so a bad
    // connection should stop the container and let Kubernetes restart it,
    // not run half-broken.
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const app = createApp({ clientOrigin: CLIENT_ORIGIN });
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
