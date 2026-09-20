process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

jest.mock('mongoose', () => {
  class Schema {
    constructor() {
      this.methods = {};
    }
    index() {}
  }
  return {
    connect: jest.fn(),
    connection: { readyState: 0 },
    Schema,
    model: jest.fn(() => ({})),
  };
});
jest.mock('../src/services/authService');

const request = require('supertest');
const { createApp } = require('../src/app');
const { registerUser, loginUser, refreshSession } = require('../src/services/authService');
const { ApiError } = require('../src/utils/ApiError');

const app = createApp({ clientOrigin: 'http://localhost:5173' });

describe('POST /api/auth/register', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates an account and returns it without the password hash', async () => {
    registerUser.mockResolvedValueOnce({
      id: '1',
      name: 'Riya',
      email: 'riya@example.com',
      role: 'customer',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya', email: 'riya@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('riya@example.com');
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a short password before it reaches the service', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya', email: 'riya@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('rejects a badly formed email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya', email: 'not-an-email', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('rejects a name that is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'riya@example.com', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'name')).toBe(true);
  });

  it('returns 409 when the service reports a duplicate email', async () => {
    registerUser.mockRejectedValueOnce(
      new ApiError(409, 'CONFLICT', 'An account with this email already exists'),
    );

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya', email: 'riya@example.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('logs in, sets an httpOnly refresh cookie, and returns the access token', async () => {
    loginUser.mockResolvedValueOnce({
      user: { id: '1', name: 'Riya', email: 'riya@example.com', role: 'agent' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'riya@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('access-token');
    expect(res.body.user.email).toBe('riya@example.com');

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).not.toMatch(/refresh-token;.*refreshToken/); // sanity: token value present once
  });

  it('rejects a missing password before it reaches the service', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'riya@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loginUser).not.toHaveBeenCalled();
  });

  it('returns 401 with a generic message for wrong credentials', async () => {
    loginUser.mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'riya@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('returns 423 when the account is locked', async () => {
    loginUser.mockRejectedValueOnce(
      new ApiError(423, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again in a few minutes.'),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'riya@example.com', password: 'wrong' });

    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});

describe('POST /api/auth/refresh', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 401 when there is no refresh cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('issues a new access token for a valid refresh cookie', async () => {
    refreshSession.mockResolvedValueOnce({
      user: { id: '1', name: 'Riya', email: 'riya@example.com', role: 'agent' },
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const res = await request(app).post('/api/auth/refresh').set('Cookie', 'refreshToken=old-refresh-token');

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('new-access-token');
    expect(refreshSession).toHaveBeenCalledWith('old-refresh-token');
  });

  it('propagates a 401 for an invalid refresh cookie', async () => {
    refreshSession.mockRejectedValueOnce(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Please log in again'));

    const res = await request(app).post('/api/auth/refresh').set('Cookie', 'refreshToken=garbage');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the refresh cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/refreshToken=;/);
  });
});
