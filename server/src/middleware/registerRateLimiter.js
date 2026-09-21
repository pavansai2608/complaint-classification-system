const { createRateLimiter } = require('./rateLimiter');

// Slows down bulk fake-account creation from a single IP without getting
// in the way of a real person signing up.
const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'Too many accounts created from this network. Try again later.',
});

module.exports = { registerRateLimiter };
