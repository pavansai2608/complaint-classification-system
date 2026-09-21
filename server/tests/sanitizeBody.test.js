const { sanitizeBody } = require('../src/middleware/sanitizeBody');

function run(body) {
  const req = { body };
  const next = jest.fn();
  sanitizeBody(req, {}, next);
  expect(next).toHaveBeenCalledWith();
  return req.body;
}

describe('sanitizeBody', () => {
  it('strips a MongoDB operator key nested inside a field', () => {
    const result = run({ email: { $ne: null }, password: 'secret123' });
    expect(result).toEqual({ email: {}, password: 'secret123' });
  });

  it('strips a nested MongoDB operator key', () => {
    const result = run({ filter: { status: { $gt: '' } } });
    expect(result).toEqual({ filter: { status: {} } });
  });

  it('strips a key containing a dot', () => {
    const result = run({ 'customer.role': 'agent', title: 'Order damaged' });
    expect(result).toEqual({ title: 'Order damaged' });
  });

  it('leaves ordinary fields untouched', () => {
    const body = { title: 'Order damaged', description: 'It broke.', orderReference: 'ORD-1' };
    expect(run(body)).toEqual(body);
  });

  it('strips operator keys inside array items', () => {
    const result = run({ tags: [{ $where: 'this' }, 'ok'] });
    expect(result).toEqual({ tags: [{}, 'ok'] });
  });

  it('does nothing when there is no body', () => {
    const req = { body: undefined };
    const next = jest.fn();
    expect(() => sanitizeBody(req, {}, next)).not.toThrow();
    expect(next).toHaveBeenCalledWith();
  });
});
