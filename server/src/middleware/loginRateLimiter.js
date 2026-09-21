const { createRateLimiter } = require('./rateLimiter');

// FR-08 / rule 11: slow down password guessing without locking out the
// whole app for everyone else (limit is per IP, not global).
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many login attempts. Try again later.',
});

module.exports = { loginRateLimiter };
