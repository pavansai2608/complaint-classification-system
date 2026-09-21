// Real Mongoose models, a real (in-memory) MongoDB, and real JWTs - unlike
// complaintRoutes.test.js, which mocks complaintService entirely. This file
// exercises the actual Mongoose queries (ownership filters, the priority
// aggregation pipeline) that the mocked tests can't catch a mistake in.
jest.setTimeout(30000);

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

jest.mock('../src/services/aiService', () => ({
  analyzeComplaint: jest.fn().mockResolvedValue({
    category: 'billing',
    confidence: 0.9,
    needsReview: false,
    emotion: { label: 'neutral', score: 0.5 },
    priority: 'Medium',
    suggestedReply: 'Thanks, we are looking into it.',
  }),
}));

const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Complaint = require('../src/models/Complaint');
const { signAccessToken } = require('../src/services/tokenService');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  // The mongodb driver loads the "os" module via a dynamic import() internally,
  // which hangs forever under Jest's default test environment. Passing it in
  // directly skips that and lets the connection complete.
  await mongoose.connect(mongoServer.getUri(), { runtimeAdapters: { os } });
  app = createApp({ clientOrigin: 'http://localhost:5173' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Complaint.deleteMany({});
});

async function createUser(role, overrides = {}) {
  const user = await User.create({
    name: 'Test User',
    email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: 'irrelevant-for-these-tests',
    role,
    ...overrides,
  });
  const token = signAccessToken({ id: user.id, role: user.role });
  return { user, token };
}

const validComplaint = {
  title: 'Order arrived damaged',
  description: 'The package arrived with a cracked screen and missing accessories.',
  orderReference: 'ORD-1234',
};

describe('POST /api/complaints (integration)', () => {
  it('creates and persists a complaint with the AI analysis attached', async () => {
    const { token, user } = await createUser('customer');

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaint);

    expect(res.status).toBe(201);
    expect(res.body.complaint.category).toBe('billing');
    expect(res.body.complaint.priority).toBe('Medium');

    const saved = await Complaint.findOne({ customer: user.id });
    expect(saved).not.toBeNull();
    expect(saved.title).toBe(validComplaint.title);
  });

  it('rejects a description that is too short and saves nothing', async () => {
    const { token } = await createUser('customer');

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validComplaint, description: 'short' });

    expect(res.status).toBe(400);
    expect(await Complaint.countDocuments()).toBe(0);
  });

  it('blocks an agent from submitting a complaint', async () => {
    const { token } = await createUser('agent');

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaint);

    expect(res.status).toBe(403);
    expect(await Complaint.countDocuments()).toBe(0);
  });
});

describe('GET /api/complaints/mine (integration)', () => {
  it("returns only the logged-in customer's own complaints", async () => {
    const { token, user } = await createUser('customer');
    const { user: otherCustomer } = await createUser('customer');

    await Complaint.create({ customer: user.id, title: 'Mine one', description: 'a'.repeat(15) });
    await Complaint.create({ customer: user.id, title: 'Mine two', description: 'a'.repeat(15) });
    await Complaint.create({ customer: otherCustomer.id, title: 'Not mine', description: 'a'.repeat(15) });

    const res = await request(app).get('/api/complaints/mine').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.complaints).toHaveLength(2);
    expect(res.body.complaints.every((c) => c.customer === user.id)).toBe(true);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/complaints/mine');
    expect(res.status).toBe(401);
  });

  it('blocks an agent from using the customer-only list', async () => {
    const { token } = await createUser('agent');
    const res = await request(app).get('/api/complaints/mine').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/complaints/:id (integration)', () => {
  it('lets a customer view a complaint they own', async () => {
    const { token, user } = await createUser('customer');
    const complaint = await Complaint.create({
      customer: user.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.complaint._id).toBe(complaint.id);
  });

  it('lets an agent view any complaint, regardless of who owns it', async () => {
    const { user: customer } = await createUser('customer');
    const { token: agentToken } = await createUser('agent');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
  });

  it("returns 404 rather than exposing another customer's complaint", async () => {
    const { user: owner } = await createUser('customer');
    const { token: otherToken } = await createUser('customer');
    const complaint = await Complaint.create({
      customer: owner.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });

  it('rejects a malformed complaint id', async () => {
    const { token } = await createUser('customer');
    const res = await request(app)
      .get('/api/complaints/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/agent/queue (integration)', () => {
  it('returns open complaints sorted by priority, highest first', async () => {
    const { user: customer } = await createUser('customer');
    const { token: agentToken } = await createUser('agent');

    await Complaint.create({
      customer: customer.id,
      title: 'Low one',
      description: 'a'.repeat(15),
      priority: 'Low',
    });
    await Complaint.create({
      customer: customer.id,
      title: 'Urgent one',
      description: 'a'.repeat(15),
      priority: 'Urgent',
    });
    await Complaint.create({
      customer: customer.id,
      title: 'Resolved urgent',
      description: 'a'.repeat(15),
      priority: 'Urgent',
      status: 'Resolved',
    });

    const res = await request(app).get('/api/agent/queue').set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    // Resolved complaints are excluded by the default status filter.
    expect(res.body.items.map((i) => i.title)).toEqual(['Urgent one', 'Low one']);
  });

  it('blocks a customer from the agent queue', async () => {
    const { token } = await createUser('customer');
    const res = await request(app).get('/api/agent/queue').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid status filter', async () => {
    const { token } = await createUser('agent');
    const res = await request(app)
      .get('/api/agent/queue?status=NotARealStatus')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/complaints/:id/status (integration)', () => {
  it('lets an agent update the status and records who did it', async () => {
    const { user: customer } = await createUser('customer');
    const { token: agentToken, user: agent } = await createUser('agent');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.complaint.status).toBe('In Progress');

    const saved = await Complaint.findById(complaint.id);
    expect(saved.status).toBe('In Progress');
    expect(saved.statusUpdatedBy.toString()).toBe(agent.id);
  });

  it('rejects an invalid status value', async () => {
    const { user: customer } = await createUser('customer');
    const { token: agentToken } = await createUser('agent');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'Cancelled' });

    expect(res.status).toBe(400);
  });

  it('blocks a customer from updating status', async () => {
    const { token: customerToken, user: customer } = await createUser('customer');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'Resolved' });

    expect(res.status).toBe(403);
  });
});
