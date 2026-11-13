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
  it('saves the complaint at once and fills in the AI analysis in the background', async () => {
    const { token, user } = await createUser('customer');

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaint);

    expect(res.status).toBe(201);
    expect(res.body.complaint.analysisPending).toBe(true);
    expect(res.body.complaint.priority).toBe('Medium');

    // The analysis is filled in in the background, just after the response.
    let saved;
    for (let i = 0; i < 50; i += 1) {
      saved = await Complaint.findOne({ customer: user.id });
      if (!saved.analysisPending) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(saved.title).toBe(validComplaint.title);
    expect(saved.analysisPending).toBe(false);
    expect(saved.category).toBe('billing');
    expect(saved.suggestedReply).toBe('Thanks, we are looking into it.');
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

  it('blocks the admin from submitting a complaint', async () => {
    const { token } = await createUser('admin');

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaint);

    expect(res.status).toBe(403);
    expect(await Complaint.countDocuments()).toBe(0);
  });
});

describe('admin and complaints (integration)', () => {
  it('lets an admin open any complaint with its suggested reply', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken } = await createUser('admin');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Charged twice',
      description: 'a'.repeat(15),
      priority: 'High',
      suggestedReply: 'Sorry about the double charge, we are refunding it.',
    });

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.complaint.suggestedReply).toBe('Sorry about the double charge, we are refunding it.');
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

  it('blocks the admin from using the customer-only list', async () => {
    const { token } = await createUser('admin');
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

  it('lets the admin view any complaint, regardless of who owns it', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken } = await createUser('admin');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .get(`/api/complaints/${complaint.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

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

describe('GET /api/admin/queue (integration)', () => {
  it('returns open complaints sorted by priority, highest first', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken } = await createUser('admin');

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

    const res = await request(app).get('/api/admin/queue').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Resolved complaints are excluded by the default status filter.
    expect(res.body.items.map((i) => i.title)).toEqual(['Urgent one', 'Low one']);
  });

  it('blocks a customer from the admin queue', async () => {
    const { token } = await createUser('customer');
    const res = await request(app).get('/api/admin/queue').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid status filter', async () => {
    const { token } = await createUser('admin');
    const res = await request(app)
      .get('/api/admin/queue?status=NotARealStatus')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/complaints/:id/status (integration)', () => {
  it('lets the admin update the status and records who did it', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken, user: admin } = await createUser('admin');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.complaint.status).toBe('In Progress');

    const saved = await Complaint.findById(complaint.id);
    expect(saved.status).toBe('In Progress');
    expect(saved.statusUpdatedBy.toString()).toBe(admin.id);
  });

  it('rejects an invalid status value', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken } = await createUser('admin');
    const complaint = await Complaint.create({
      customer: customer.id,
      title: 'Order damaged',
      description: 'a'.repeat(15),
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
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

describe('GET /api/admin/analytics (integration)', () => {
  it('counts real complaints by category, priority and day', async () => {
    const { user: customer } = await createUser('customer');
    const { token: adminToken } = await createUser('admin');
    const base = { customer: customer.id, title: 'Order damaged', description: 'a'.repeat(15) };

    await Complaint.create({ ...base, category: 'billing', priority: 'Urgent' });
    await Complaint.create({ ...base, category: 'billing', priority: 'Low' });
    await Complaint.create({ ...base, category: 'delivery', priority: 'Low' });
    // No category yet: the AI analysis is still pending for this one.
    await Complaint.create({ ...base });
    // Older than the 14-day window: counted in the totals, not in the daily chart.
    const old = await Complaint.create({ ...base, category: 'delivery', priority: 'High' });
    await Complaint.collection.updateOne(
      { _id: old._id },
      { $set: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    );

    const res = await request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.byCategory).toEqual([
      { label: 'billing', count: 2 },
      { label: 'delivery', count: 2 },
      { label: 'Not analysed yet', count: 1 },
    ]);
    expect(res.body.byPriority).toEqual([
      { label: 'Urgent', count: 1 },
      { label: 'High', count: 1 },
      { label: 'Medium', count: 1 },
      { label: 'Low', count: 2 },
    ]);
    expect(res.body.daily).toHaveLength(14);
    const today = new Date().toISOString().slice(0, 10);
    expect(res.body.daily[13]).toEqual({ date: today, count: 4 });
    expect(res.body.daily.reduce((sum, day) => sum + day.count, 0)).toBe(4);
  });

});
