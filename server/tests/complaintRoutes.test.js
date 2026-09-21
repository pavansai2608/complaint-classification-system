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
const {
  createComplaint,
  listComplaintsForCustomer,
  getComplaintForCustomer,
} = require('../src/services/complaintService');
const { ApiError } = require('../src/utils/ApiError');

const app = createApp({ clientOrigin: 'http://localhost:5173' });

function tokenFor(role) {
  return signAccessToken({ id: `${role}-id`, role });
}

const validBody = {
  title: 'Order arrived damaged',
  description: 'The package arrived with a cracked screen and missing accessories.',
  orderReference: 'ORD-1234',
};

describe('POST /api/complaints', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a request with no token', async () => {
    const res = await request(app).post('/api/complaints').send(validBody);
    expect(res.status).toBe(401);
    expect(createComplaint).not.toHaveBeenCalled();
  });

  it('blocks an agent from submitting a complaint', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'agent-id', role: 'agent' });
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenFor('agent')}`)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(createComplaint).not.toHaveBeenCalled();
  });

  it('lets a customer submit a complaint and saves it with status Open', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    createComplaint.mockResolvedValueOnce({
      id: 'complaint-1',
      customer: 'customer-id',
      status: 'Open',
      ...validBody,
    });

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenFor('customer')}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.complaint.status).toBe('Open');
    expect(createComplaint).toHaveBeenCalledWith({
      customerId: 'customer-id',
      title: validBody.title,
      description: validBody.description,
      orderReference: validBody.orderReference,
    });
  });

  it('lets a customer submit a complaint with no order reference', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    createComplaint.mockResolvedValueOnce({ id: 'complaint-2', status: 'Open' });

    const { orderReference, ...withoutOrderRef } = validBody;
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenFor('customer')}`)
      .send(withoutOrderRef);

    expect(res.status).toBe(201);
    expect(createComplaint).toHaveBeenCalledWith(
      expect.objectContaining({ orderReference: undefined }),
    );
  });

  it('rejects a title that is too short before it reaches the service', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenFor('customer')}`)
      .send({ ...validBody, title: 'Bad' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'title')).toBe(true);
    expect(createComplaint).not.toHaveBeenCalled();
  });

  it('rejects a description that is too short before it reaches the service', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${tokenFor('customer')}`)
      .send({ ...validBody, description: 'too short' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'description')).toBe(true);
    expect(createComplaint).not.toHaveBeenCalled();
  });
});

describe('GET /api/complaints/mine', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/complaints/mine');
    expect(res.status).toBe(401);
  });

  it('returns only the logged-in customer\'s complaints', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    listComplaintsForCustomer.mockResolvedValueOnce([
      { id: 'complaint-1', title: 'Order damaged', status: 'Open' },
    ]);

    const res = await request(app)
      .get('/api/complaints/mine')
      .set('Authorization', `Bearer ${tokenFor('customer')}`);

    expect(res.status).toBe(200);
    expect(res.body.complaints).toHaveLength(1);
    expect(listComplaintsForCustomer).toHaveBeenCalledWith('customer-id');
  });
});

describe('GET /api/complaints/:id', () => {
  const validId = '507f1f77bcf86cd799439011';

  afterEach(() => jest.clearAllMocks());

  it('rejects a request with no token', async () => {
    const res = await request(app).get(`/api/complaints/${validId}`);
    expect(res.status).toBe(401);
  });

  it('rejects a malformed complaint id before it reaches the service', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    const res = await request(app)
      .get('/api/complaints/not-a-valid-id')
      .set('Authorization', `Bearer ${tokenFor('customer')}`);

    expect(res.status).toBe(400);
    expect(getComplaintForCustomer).not.toHaveBeenCalled();
  });

  it('returns a complaint the customer owns', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    getComplaintForCustomer.mockResolvedValueOnce({ id: validId, title: 'Order damaged', status: 'Open' });

    const res = await request(app)
      .get(`/api/complaints/${validId}`)
      .set('Authorization', `Bearer ${tokenFor('customer')}`);

    expect(res.status).toBe(200);
    expect(res.body.complaint.id).toBe(validId);
    expect(getComplaintForCustomer).toHaveBeenCalledWith(validId, 'customer-id');
  });

  it('returns 404 for a complaint that belongs to another customer', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'customer-id', role: 'customer' });
    getComplaintForCustomer.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/complaints/${validId}`)
      .set('Authorization', `Bearer ${tokenFor('customer')}`);

    expect(res.status).toBe(404);
  });
});
