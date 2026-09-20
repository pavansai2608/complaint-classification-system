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
const { registerUser } = require('../src/services/authService');
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
