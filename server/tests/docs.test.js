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

const request = require('supertest');
const { createApp } = require('../src/app');
const { openapi } = require('../src/docs/openapi');
const { saveToken } = require('../src/docs/swaggerOptions');

function appWithDocs(value) {
  if (value === undefined) delete process.env.ENABLE_DOCS;
  else process.env.ENABLE_DOCS = value;
  return createApp({ clientOrigin: 'http://localhost:5173' });
}

// ["GET /api/health", spec of that route]
const operations = Object.entries(openapi.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, spec]) => ({ name: `${method.toUpperCase()} ${path}`, method, path, spec })),
);
const usesBearer = ({ spec }) => spec.security.some((item) => 'bearerAuth' in item);

afterEach(() => {
  delete process.env.ENABLE_DOCS;
});

describe('Swagger UI at /api/docs', () => {
  it.each([undefined, 'false', ''])('is off when ENABLE_DOCS is %p', async (value) => {
    const res = await request(appWithDocs(value)).get('/api/docs/');
    expect(res.status).toBe(404);
  });

  it('is served when ENABLE_DOCS=true', async () => {
    const res = await request(appWithDocs('true')).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});

describe('OpenAPI spec', () => {
  it('lists all 16 routes', () => {
    expect(operations.map((operation) => operation.name).sort()).toEqual(
      [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/google',
        'POST /api/auth/refresh',
        'POST /api/auth/logout',
        'GET /api/users/me',
        'POST /api/complaints',
        'GET /api/complaints/mine',
        'GET /api/complaints/{id}',
        'PATCH /api/complaints/{id}/status',
        'POST /api/complaints/{id}/reply',
        'POST /api/complaints/{id}/analyze',
        'GET /api/admin/queue',
        'GET /api/admin/summary',
        'GET /api/admin/analytics',
      ].sort(),
    );
  });

  it('lists the routes in numbered groups and steps', () => {
    for (const { name } of openapi.tags) {
      const steps = operations.filter(({ spec }) => spec.tags[0] === name);
      expect(steps.length).toBeGreaterThan(0);
      steps.forEach(({ method, spec }, i) => {
        expect(spec.summary.startsWith(`${i + 1}. ${method.toUpperCase()} - `)).toBe(true);
      });
    }
    const groups = new Set(openapi.tags.map(({ name }) => name));
    expect(operations.every(({ spec }) => groups.has(spec.tags[0]))).toBe(true);
  });

  it.each(operations.filter(usesBearer))('$name needs a Bearer token in the real app', async ({ method, path }) => {
    const res = await request(appWithDocs())[method](path.replace('{id}', '507f1f77bcf86cd799439011'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it.each(operations.filter((operation) => !usesBearer(operation)))(
    '$name exists and does not ask for a Bearer token',
    async ({ method, path }) => {
      const res = await request(appWithDocs())[method](path).send(method === 'get' ? undefined : {});
      expect(res.status).not.toBe(404);
      expect(res.body.error?.code).not.toBe('UNAUTHORIZED');
    },
  );
});

describe('Swagger UI token', () => {
  const ui = { preauthorizeApiKey: jest.fn(), authActions: { logout: jest.fn() } };
  const response = (path, ok = true) => ({ url: path, ok, body: ok ? { accessToken: 'token-1' } : {} });

  beforeEach(() => {
    jest.clearAllMocks();
    global.window = { ui, location: { href: 'https://complaint.localhost:8443/api/docs/' } };
  });
  afterEach(() => delete global.window);

  it.each(['/api/auth/login', '/api/auth/google', '/api/auth/refresh'])('is saved after %s', (path) => {
    saveToken(response(path));
    expect(ui.preauthorizeApiKey).toHaveBeenCalledWith('bearerAuth', 'token-1');
  });

  it('is not saved after a failed login or another route', () => {
    saveToken(response('/api/auth/login', false));
    saveToken(response('/api/users/me'));
    expect(ui.preauthorizeApiKey).not.toHaveBeenCalled();
  });

  it('is removed after logout', () => {
    saveToken(response('/api/auth/logout'));
    expect(ui.authActions.logout).toHaveBeenCalledWith(['bearerAuth']);
  });

  it('is sent to the page', async () => {
    const res = await request(appWithDocs('true')).get('/api/docs/swagger-ui-init.js');
    expect(res.text).toContain('responseInterceptor');
  });
});
