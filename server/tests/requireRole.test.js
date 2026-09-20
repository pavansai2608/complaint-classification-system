const { requireRole } = require('../src/middleware/requireRole');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('requireRole', () => {
  it.each(['customer', 'agent', 'admin'])('lets a %s through when they are on the allowed list', (role) => {
    const req = { user: { id: '1', role } };
    const next = jest.fn();

    requireRole(role)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a role that is not on the allowed list', () => {
    const req = { user: { id: '1', role: 'customer' } };
    const next = jest.fn();

    requireRole('agent', 'admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
