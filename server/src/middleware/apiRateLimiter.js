const { createRateLimiter } = require('./rateLimiter');

// A general backstop on top of the stricter per-route limiters (login,
// register): catches any other route being hammered without needing a
// dedicated limiter for each one.
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Too many requests. Try again later.',
});

module.exports = { apiRateLimiter };
