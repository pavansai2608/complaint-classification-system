const rateLimit = require('express-rate-limit');

// FR-08 / rule 11: slow down password guessing without locking out the
// whole app for everyone else (limit is per IP, not global).
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' },
    });
  },
});

module.exports = { loginRateLimiter };
