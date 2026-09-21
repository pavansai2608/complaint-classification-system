const rateLimit = require('express-rate-limit');

// Shared shape for every rate limiter in the app: a 429 in the same error
// format every other route uses, keyed per IP so one abusive client can't
// lock everyone else out.
function createRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message } });
    },
  });
}

module.exports = { createRateLimiter };
