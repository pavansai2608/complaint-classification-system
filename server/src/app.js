const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { isConnected } = require('./config/db');
const { ApiError } = require('./utils/ApiError');
const { authenticate } = require('./middleware/authenticate');
const { requireRole } = require('./middleware/requireRole');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const agentRoutes = require('./routes/agentRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

function createApp({ clientOrigin }) {
  const app = express();

  // Secure HTTP headers (also removes the X-Powered-By header)
  app.use(helmet());

  // Only the React app's origin may call this API from a browser
  app.use(cors({ origin: clientOrigin, credentials: true }));

  // Reject very large JSON bodies
  app.use(express.json({ limit: '10kb' }));

  // Reads the httpOnly refresh-token cookie on /api/auth/refresh
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: isConnected() ? 'connected' : 'disconnected' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authenticate, userRoutes);
  app.use('/api/agent', authenticate, requireRole('agent'), agentRoutes);
  app.use('/api/complaints', authenticate, requireRole('customer'), complaintRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  // Single error handler for the whole API, so every route returns errors in
  // the same shape (SDD 7.3). Express needs all 4 arguments to treat this as
  // the error handler.
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      if (err.statusCode >= 500) console.error(err);
      return res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });
    }

    // Anything not thrown by our own code: bad JSON, an oversized body, or a
    // genuine bug. Never send a stack trace or internal details to the client.
    const status = err.status || err.statusCode || 500;
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : status < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR';
    const message = status < 500 ? err.message || 'Bad request' : 'Internal server error';
    if (status >= 500) console.error(err);
    res.status(status).json({ error: { code, message } });
  });

  return app;
}

module.exports = { createApp };
