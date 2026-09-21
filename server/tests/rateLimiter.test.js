const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../src/middleware/rateLimiter');

function appWithLimiter(limit) {
  const app = express();
  app.use(
    createRateLimiter({ windowMs: 60 * 1000, limit, message: 'Too many requests. Try again later.' }),
  );
  app.get('/ping', (req, res) => res.json({ ok: true }));
  return app;
}

describe('createRateLimiter', () => {
  it('allows requests under the limit', async () => {
    const app = appWithLimiter(2);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
  });

  it('returns 429 in the standard error shape once the limit is exceeded', async () => {
    const app = appWithLimiter(2);
    await request(app).get('/ping');
    await request(app).get('/ping');
    const res = await request(app).get('/ping');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Try again later.' },
    });
  });
});
