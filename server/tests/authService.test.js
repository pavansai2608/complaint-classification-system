jest.mock('bcrypt', () => ({ hash: jest.fn() }));
jest.mock('../src/models/User', () => ({ create: jest.fn() }));

const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const { registerUser } = require('../src/services/authService');

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
