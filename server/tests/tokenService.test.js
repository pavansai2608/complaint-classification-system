process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const jwt = require('jsonwebtoken');
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../src/services/tokenService');

const user = { id: 'user-1', role: 'agent' };

describe('tokenService', () => {
  it('signs an access token carrying the user id and role', () => {
    const token = signAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('agent');
  });

  it('signs a refresh token that does not carry the role', () => {
    const token = signRefreshToken(user);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBeUndefined();
  });

  it('rejects an access token verified with the refresh secret', () => {
    const token = signAccessToken(user);
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it('rejects a token signed with a different secret entirely', () => {
    const forged = jwt.sign({ sub: 'user-1', role: 'agent' }, 'wrong-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });
});
