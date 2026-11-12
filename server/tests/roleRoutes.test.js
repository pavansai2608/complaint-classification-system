process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

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
jest.mock('../src/services/authService');
jest.mock('../src/services/userService');
jest.mock('../src/services/complaintService');

const request = require('supertest');
const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/services/tokenService');
const { getCurrentUser } = require('../src/services/userService');
const { getAgentQueue, getComplaintSummary, getComplaintAnalytics } = require('../src/services/complaintService');
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

  it.each(['customer', 'admin'])('lets a logged-in %s read their own profile', async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: `${role}-id`, name: 'Test', role });

    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${tokenFor(role)}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
  });

  it('rejects /api/admin/queue with no token', async () => {
    const res = await request(app).get('/api/admin/queue');
    expect(res.status).toBe(401);
  });

  it('blocks a customer from /api/admin/queue', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app).get('/api/admin/queue').set('Authorization', `Bearer ${tokenFor('customer')}`);
    expect(res.status).toBe(403);
  });

  it('lets the admin read /api/admin/queue', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'admin-id', role: 'admin' });
    getAgentQueue.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 });
    const res = await request(app).get('/api/admin/queue').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it.each(['customer'])('blocks a %s from /api/admin/summary', async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: `${role}-id`, role });
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${tokenFor(role)}`);
    expect(res.status).toBe(403);
    expect(getComplaintSummary).not.toHaveBeenCalled();
  });

  it('lets an admin read /api/admin/summary', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'admin-id', role: 'admin' });
    getComplaintSummary.mockResolvedValueOnce({ total: 3, open: 1, inProgress: 1, resolved: 1 });
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 3, open: 1, inProgress: 1, resolved: 1 });
  });

  it('rejects /api/admin/analytics with no token', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(401);
    expect(getComplaintAnalytics).not.toHaveBeenCalled();
  });

  it.each(['customer'])('blocks a %s from /api/admin/analytics', async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: `${role}-id`, role });
    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${tokenFor(role)}`);
    expect(res.status).toBe(403);
    expect(getComplaintAnalytics).not.toHaveBeenCalled();
  });

  it('lets an admin read /api/admin/analytics', async () => {
    const analytics = {
      byCategory: [{ label: 'billing', count: 2 }],
      byPriority: [{ label: 'Urgent', count: 1 }],
      daily: [{ date: '2026-11-11', count: 2 }],
    };
    getCurrentUser.mockResolvedValueOnce({ id: 'admin-id', role: 'admin' });
    getComplaintAnalytics.mockResolvedValueOnce(analytics);
    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(analytics);
  });


  it('rejects a valid token once the account behind it has been deactivated', async () => {
    getCurrentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue'));
    const res = await request(app).get('/api/admin/queue').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(401);
  });
});
