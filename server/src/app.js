const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { isConnected } = require('./config/db');

function createApp({ clientOrigin }) {
  const app = express();

  // Secure HTTP headers (also removes the X-Powered-By header)
  app.use(helmet());

  // Only the React app's origin may call this API from a browser
  app.use(cors({ origin: clientOrigin, credentials: true }));

  // Reject very large JSON bodies
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: isConnected() ? 'connected' : 'disconnected' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Never send stack traces or internal details to the client.
  // Express needs all 4 arguments to treat this as the error handler.
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? err.message : 'Internal server error';
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
