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
const { createComplaint } = require('../src/services/complaintService');
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
