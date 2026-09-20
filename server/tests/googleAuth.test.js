const originalClientId = process.env.GOOGLE_CLIENT_ID;

afterEach(() => {
  jest.resetModules();
  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
});

describe('verifyGoogleIdToken', () => {
  it('fails closed instead of skipping the audience check when GOOGLE_CLIENT_ID is not set', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const { verifyGoogleIdToken } = require('../src/services/googleAuth');

    await expect(verifyGoogleIdToken('any-token')).rejects.toThrow('GOOGLE_CLIENT_ID is not set');
  });
});
