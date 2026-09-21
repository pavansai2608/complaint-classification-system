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
jest.mock('../src/services/userService');
jest.mock('../src/services/complaintService');

const request = require('supertest');
const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/services/tokenService');
const { getCurrentUser } = require('../src/services/userService');
const { getAgentQueue } = require('../src/services/complaintService');

const app = createApp({ clientOrigin: 'http://localhost:5173' });

function tokenFor(role) {
  return signAccessToken({ id: `${role}-id`, role });
}

describe('GET /api/agent/queue', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/agent/queue');
    expect(res.status).toBe(401);
    expect(getAgentQueue).not.toHaveBeenCalled();
  });

  it('blocks a customer from seeing the queue', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app)
      .get('/api/agent/queue')
      .set('Authorization', `Bearer ${tokenFor('customer')}`);
    expect(res.status).toBe(403);
    expect(getAgentQueue).not.toHaveBeenCalled();
  });

  it('lets an agent see the queue in priority order', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    getAgentQueue.mockResolvedValueOnce({
      items: [
        { id: 'c1', priority: 'Urgent' },
        { id: 'c2', priority: 'High' },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    const res = await request(app)
      .get('/api/agent/queue')
      .set('Authorization', `Bearer ${tokenFor('agent')}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(getAgentQueue).toHaveBeenCalledWith({
      status: undefined,
      category: undefined,
      page: undefined,
      limit: undefined,
    });
  });

  it('passes status, category and paging filters through', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    getAgentQueue.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 5 });

    const res = await request(app)
      .get('/api/agent/queue?status=In Progress&category=billing&page=2&limit=5')
      .set('Authorization', `Bearer ${tokenFor('agent')}`);

    expect(res.status).toBe(200);
    expect(getAgentQueue).toHaveBeenCalledWith({
      status: 'In Progress',
      category: 'billing',
      page: 2,
      limit: 5,
    });
  });

  it('rejects an invalid status filter', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    const res = await request(app)
      .get('/api/agent/queue?status=NotARealStatus')
      .set('Authorization', `Bearer ${tokenFor('agent')}`);

    expect(res.status).toBe(400);
    expect(getAgentQueue).not.toHaveBeenCalled();
  });

  it('rejects a limit above the allowed maximum', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    const res = await request(app)
      .get('/api/agent/queue?limit=500')
      .set('Authorization', `Bearer ${tokenFor('agent')}`);

    expect(res.status).toBe(400);
    expect(getAgentQueue).not.toHaveBeenCalled();
  });
});
