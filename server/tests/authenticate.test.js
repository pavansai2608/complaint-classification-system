process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

jest.mock('../src/services/userService');

const { authenticate } = require('../src/middleware/authenticate');
const { signAccessToken } = require('../src/services/tokenService');
const { getCurrentUser } = require('../src/services/userService');
const { ApiError } = require('../src/utils/ApiError');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('authenticate', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} };
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects a header that is not a Bearer token', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects an invalid or expired token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('attaches the current user looked up from the database', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'user-1', role: 'agent' });
    const token = signAccessToken({ id: 'user-1', role: 'agent' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(getCurrentUser).toHaveBeenCalledWith('user-1');
    expect(req.user).toEqual({ id: 'user-1', role: 'agent' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a valid token when the user has been deactivated', async () => {
    getCurrentUser.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue'));
    const token = signAccessToken({ id: 'user-1', role: 'agent' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
