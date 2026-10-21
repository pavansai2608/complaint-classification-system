jest.mock('bcrypt', () => ({ hash: jest.fn(() => Promise.resolve('hashed-value')) }));
jest.mock('../src/models/User', () => ({ findOneAndUpdate: jest.fn() }));

const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const { createOrUpdateAdmin } = require('../src/scripts/createAdmin');

const valid = { name: 'Site Admin', email: 'Site.Admin@Gmail.com', password: 'secret123' };

describe('createOrUpdateAdmin', () => {
  afterEach(() => jest.clearAllMocks());

  it('saves a bcrypt hash, never the plain password, with the admin role', async () => {
    User.findOneAndUpdate.mockResolvedValueOnce({ email: 'siteadmin@gmail.com' });

    await createOrUpdateAdmin(valid);

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12);
    const [, update] = User.findOneAndUpdate.mock.calls[0];
    expect(update.$set.passwordHash).toBe('hashed-value');
    expect(update.$set.role).toBe('admin');
    expect(JSON.stringify(update)).not.toContain('secret123');
  });

  it('stores the email the same way the login form normalises it', async () => {
    User.findOneAndUpdate.mockResolvedValueOnce({});

    await createOrUpdateAdmin(valid);

    const [filter] = User.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ email: 'siteadmin@gmail.com' });
  });

  it('unlocks the account and re-enables it, so a stuck admin can be repaired', async () => {
    User.findOneAndUpdate.mockResolvedValueOnce({});

    await createOrUpdateAdmin(valid);

    const [, update, options] = User.findOneAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({ isActive: true, failedLogins: 0, lockUntil: null });
    expect(options.upsert).toBe(true);
  });

  it.each([
    [{ ...valid, password: 'short1' }, 'ADMIN_PASSWORD'],
    [{ ...valid, password: 'lettersonly' }, 'ADMIN_PASSWORD'],
    [{ ...valid, email: 'not-an-email' }, 'ADMIN_EMAIL'],
    [{ ...valid, name: 'A' }, 'ADMIN_NAME'],
    [{}, 'ADMIN_NAME'],
  ])('rejects bad input without touching the database (%#)', async (input, field) => {
    await expect(createOrUpdateAdmin(input)).rejects.toThrow(field);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});
