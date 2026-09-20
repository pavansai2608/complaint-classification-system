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
jest.mock('../src/services/userService');

const request = require('supertest');
const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/services/tokenService');
const { getCurrentUser } = require('../src/services/userService');
const { ApiError } = require('../src/utils/ApiError');

const app = createApp({ clientOrigin: 'http://localhost:5173' });

function tokenFor(role) {
  return signAccessToken({ id: `${role}-id`, role });
}

describe('role-protected routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects /api/users/me with no token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it.each(['customer', 'agent', 'admin'])('lets a logged-in %s read their own profile', async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: `${role}-id`, name: 'Test', role });

    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${tokenFor(role)}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  });

  it('rejects /api/agent/queue with no token', async () => {
    const res = await request(app).get('/api/agent/queue');
    expect(res.status).toBe(401);
  });

  it('blocks a customer from /api/agent/queue', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app).get('/api/agent/queue').set('Authorization', `Bearer ${tokenFor('customer')}`);
    expect(res.status).toBe(403);
  });

  it('lets an agent read /api/agent/queue', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    const res = await request(app).get('/api/agent/queue').set('Authorization', `Bearer ${tokenFor('agent')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('blocks an agent from /api/admin/summary', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${tokenFor('agent')}`);
    expect(res.status).toBe(403);
  });

  it('lets an admin read /api/admin/summary', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'admin-id', role: 'admin' });
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalComplaints: 0, openComplaints: 0, resolvedComplaints: 0 });
  });

  it('rejects a valid token once the account behind it has been deactivated', async () => {
    getCurrentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue'));
    const res = await request(app).get('/api/agent/queue').set('Authorization', `Bearer ${tokenFor('agent')}`);
    expect(res.status).toBe(401);
  });
});
