const { rejectUnknownFields } = require('../src/middleware/rejectUnknownFields');

function run(allowed, body) {
  const req = { body };
  const next = jest.fn();
  rejectUnknownFields(allowed)(req, {}, next);
  return next;
}

describe('rejectUnknownFields', () => {
  it('lets a request through when every field is allowed', () => {
    const next = run(['title', 'description'], { title: 'a', description: 'b' });
    expect(next).toHaveBeenCalledWith();
  });

  it('lets a request through when only some allowed fields are sent', () => {
    const next = run(['title', 'description', 'orderReference'], { title: 'a', description: 'b' });
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a field that is not on the allowed list', () => {
    const next = run(['name', 'email', 'password'], {
      name: 'Riya',
      email: 'riya@example.com',
      password: 'secret123',
      role: 'admin',
    });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: [{ field: 'role', message: 'Unknown field' }],
      }),
    );
  });

  it('lists every unknown field, not just the first', () => {
    const next = run(['status'], { status: 'Resolved', statusUpdatedBy: 'me', extra: 1 });

    const err = next.mock.calls[0][0];
    expect(err.details.map((d) => d.field)).toEqual(['statusUpdatedBy', 'extra']);
  });

  it('does nothing when the body is empty', () => {
    const next = run(['status'], {});
    expect(next).toHaveBeenCalledWith();
  });
});
