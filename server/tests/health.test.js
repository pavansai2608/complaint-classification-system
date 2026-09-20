jest.mock('mongoose', () => {
  class Schema {
    constructor() {
      this.methods = {};
    }
    index() {}
  }
  Schema.Types = { ObjectId: 'ObjectId' };
  return {
    connect: jest.fn(),
    connection: { readyState: 0 },
    Schema,
    model: jest.fn(() => ({})),
  };
});

const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const CLIENT_ORIGIN = 'http://localhost:5173';
const app = createApp({ clientOrigin: CLIENT_ORIGIN });

afterEach(() => {
  mongoose.connection.readyState = 0;
});

describe('GET /api/health', () => {
  it('returns 200 and reports the database as disconnected by default', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'disconnected' });
  });

  it('reports the database as connected when Mongoose is connected', async () => {
    mongoose.connection.readyState = 1;
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('sends security headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS for the React app origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', CLIENT_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(CLIENT_ORIGIN);
  });

  it('does not allow CORS for other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://evil.example.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
  });
});

describe('Unknown routes and bad input', () => {
  it('returns 404 in the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('rejects JSON bodies larger than 10kb', async () => {
    const bigBody = { text: 'a'.repeat(20 * 1024) };
    const res = await request(app).post('/api/health').send(bigBody);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.text).not.toMatch(/at .*\.js/);
  });

  it('returns 400 without a stack trace for broken JSON', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.text).not.toMatch(/at .*\.js/);
  });
});
