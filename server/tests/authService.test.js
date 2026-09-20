jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('../src/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}));
jest.mock('../src/services/tokenService', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  signRefreshToken: jest.fn(() => 'refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const { verifyRefreshToken } = require('../src/services/tokenService');
const { registerUser, loginUser, refreshSession } = require('../src/services/authService');

describe('registerUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('hashes the password with cost 12 before saving', async () => {
    bcrypt.hash.mockResolvedValueOnce('hashed-value');
    User.create.mockResolvedValueOnce({ id: '1', name: 'Riya', email: 'riya@example.com' });

    await registerUser({ name: 'Riya', email: 'riya@example.com', password: 'secret123' });

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12);
    expect(User.create).toHaveBeenCalledWith({
      name: 'Riya',
      email: 'riya@example.com',
      passwordHash: 'hashed-value',
    });
  });

  it('never saves the plain password', async () => {
    bcrypt.hash.mockResolvedValueOnce('hashed-value');
    User.create.mockResolvedValueOnce({});

    await registerUser({ name: 'Riya', email: 'riya@example.com', password: 'secret123' });

    const savedArgs = User.create.mock.calls[0][0];
    expect(savedArgs.password).toBeUndefined();
    expect(savedArgs.passwordHash).toBe('hashed-value');
  });

  it('turns a duplicate email into a 409 conflict error', async () => {
    bcrypt.hash.mockResolvedValueOnce('hashed-value');
    const dupError = new Error('duplicate key');
    dupError.code = 11000;
    User.create.mockRejectedValueOnce(dupError);

    await expect(
      registerUser({ name: 'Riya', email: 'riya@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('lets an unexpected database error propagate', async () => {
    bcrypt.hash.mockResolvedValueOnce('hashed-value');
    User.create.mockRejectedValueOnce(new Error('connection lost'));

    await expect(
      registerUser({ name: 'Riya', email: 'riya@example.com', password: 'secret123' }),
    ).rejects.toThrow('connection lost');
  });
});

function makeUser(overrides = {}) {
  return {
    _id: '1',
    id: '1',
    name: 'Riya',
    email: 'riya@example.com',
    passwordHash: 'hashed-value',
    role: 'customer',
    isActive: true,
    failedLogins: 0,
    lockUntil: null,
    ...overrides,
  };
}

describe('loginUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the user and tokens for a correct password', async () => {
    const user = makeUser();
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await loginUser({ email: 'riya@example.com', password: 'secret123' });

    expect(result.user).toBe(user);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    // Already at 0 failed logins with no lock, so there is nothing to reset.
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it('resets the failed-login count on a successful login after earlier failures', async () => {
    const user = makeUser({ failedLogins: 2 });
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(true);

    await loginUser({ email: 'riya@example.com', password: 'secret123' });

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: '1' },
      { $set: { failedLogins: 0, lockUntil: null } },
    );
  });

  it('rejects with the same generic error when the email does not exist', async () => {
    User.findOne.mockResolvedValueOnce(null);

    await expect(loginUser({ email: 'nobody@example.com', password: 'secret123' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects with the same generic error for a Google-only account (no password set)', async () => {
    User.findOne.mockResolvedValueOnce(makeUser({ passwordHash: undefined }));

    await expect(loginUser({ email: 'riya@example.com', password: 'secret123' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects with the same generic error for a deactivated account', async () => {
    User.findOne.mockResolvedValueOnce(makeUser({ isActive: false }));

    await expect(loginUser({ email: 'riya@example.com', password: 'secret123' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects a wrong password and atomically increments the failed-attempt count', async () => {
    const user = makeUser({ failedLogins: 2 });
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(false);
    User.findOneAndUpdate.mockResolvedValueOnce(makeUser({ failedLogins: 3 }));

    await expect(loginUser({ email: 'riya@example.com', password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    // $inc, not a read-then-write, so concurrent wrong guesses can't race
    // each other into undercounting.
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '1' },
      { $inc: { failedLogins: 1 } },
      { new: true },
    );
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it('locks the account once the atomic counter reaches the 5th failed attempt', async () => {
    const user = makeUser({ failedLogins: 4 });
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(false);
    User.findOneAndUpdate.mockResolvedValueOnce(makeUser({ failedLogins: 5 }));

    await expect(loginUser({ email: 'riya@example.com', password: 'wrong' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: '1' },
      { $set: { lockUntil: expect.any(Date), failedLogins: 0 } },
    );
    const [, update] = User.updateOne.mock.calls[0];
    expect(update.$set.lockUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('reveals the account is locked only once the correct password is given', async () => {
    const user = makeUser({ lockUntil: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(true);

    await expect(loginUser({ email: 'riya@example.com', password: 'secret123' })).rejects.toMatchObject({
      statusCode: 423,
      code: 'ACCOUNT_LOCKED',
    });
  });

  it('gives the same generic error for a locked account and a wrong password, so a guesser cannot tell the account exists', async () => {
    const user = makeUser({ lockUntil: new Date(Date.now() + 60000) });
    User.findOne.mockResolvedValueOnce(user);
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(loginUser({ email: 'riya@example.com', password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('refreshSession', () => {
  afterEach(() => jest.clearAllMocks());

  it('issues a new access and refresh token for a valid refresh token', async () => {
    verifyRefreshToken.mockReturnValueOnce({ sub: '1' });
    User.findById.mockResolvedValueOnce(makeUser());

    const result = await refreshSession('valid-refresh-token');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects a refresh token that fails verification', async () => {
    verifyRefreshToken.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });

    await expect(refreshSession('bad-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects a refresh token for a deactivated account', async () => {
    verifyRefreshToken.mockReturnValueOnce({ sub: '1' });
    User.findById.mockResolvedValueOnce(makeUser({ isActive: false }));

    await expect(refreshSession('valid-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });
});
