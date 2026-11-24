// OpenAPI description of every Express route, shown by Swagger UI at
// /api/docs. Each route lists the security it uses:
//   bearerAuth    - JWT access token in the Authorization header
//   refreshCookie - httpOnly refresh-token cookie
//   []            - public
const { VALID_STATUSES, VALID_PRIORITIES } = require('../validators/complaintValidators');

const bearer = [{ bearerAuth: [] }];
const cookie = [{ refreshCookie: [] }];
const open = [];

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const ok = (description, schema) => ({ description, ...json(schema) });
const body = (name) => ({ required: true, ...json(ref(name)) });
const wrap = (key, schema) => ({ type: 'object', properties: { [key]: schema } });

const ERROR_TEXT = {
  400: 'Invalid or unknown fields',
  401: 'Not logged in, or wrong credentials',
  403: 'Logged in, but the role is not allowed',
  404: 'Not found (also returned for another customer’s complaint)',
  409: 'Conflict with existing data',
  423: 'Account locked after too many failed logins',
  429: 'Too many requests',
  503: 'The AI service did not answer',
};

const errors = (...codes) =>
  Object.fromEntries(codes.map((code) => [code, { description: ERROR_TEXT[code], ...json(ref('Error')) }]));

const complaintId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Complaint id',
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
};

const session = { type: 'object', properties: { user: ref('User'), accessToken: { type: 'string' } } };
const oneComplaint = wrap('complaint', ref('Complaint'));
const counts = (key) => ({
  type: 'array',
  items: { type: 'object', properties: { [key]: { type: 'string' }, count: { type: 'integer' } } },
});

const paths = {
  '/api/health': {
    get: {
      tags: ['0. Public'],
      summary: '1. GET - server and database status',
      description: 'Public.',
      security: open,
      responses: {
        200: ok('Status', {
          type: 'object',
          properties: { status: { type: 'string' }, database: { type: 'string' } },
        }),
      },
    },
  },

  '/api/auth/register': {
    post: {
      tags: ['1. Auth'],
      summary: '1. POST - create a customer account',
      description: 'Public. Protected by a per-IP rate limit and input validation.',
      security: open,
      requestBody: body('RegisterRequest'),
      responses: { 201: ok('Account created', wrap('user', ref('User'))), ...errors(400, 409, 429) },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['1. Auth'],
      summary: '2. POST - log in and get a Bearer token',
      description:
        'Public. Protected by a per-IP rate limit and account lockout. The page saves accessToken into Authorize. Also sets the refresh cookie.',
      security: open,
      requestBody: body('LoginRequest'),
      responses: { 200: ok('Logged in', session), ...errors(400, 401, 423, 429) },
    },
  },
  '/api/auth/google': {
    post: {
      tags: ['1. Auth'],
      summary: '3. POST - log in with Google',
      description: 'Public. The server verifies the Google ID token.',
      security: open,
      requestBody: body('GoogleRequest'),
      responses: { 200: ok('Logged in', session), ...errors(400, 401, 409, 429) },
    },
  },
  '/api/auth/refresh': {
    post: {
      tags: ['1. Auth'],
      summary: '4. POST - get a new access token',
      description: 'Uses the httpOnly refresh cookie set at login. The browser sends it automatically.',
      security: cookie,
      responses: { 200: ok('New tokens', session), ...errors(401, 429) },
    },
  },
  '/api/auth/logout': {
    post: {
      tags: ['1. Auth'],
      summary: '5. POST - log out',
      description: 'Public. Clears the refresh cookie.',
      security: open,
      responses: { 204: { description: 'Logged out' }, ...errors(429) },
    },
  },

  '/api/users/me': {
    get: {
      tags: ['2. Users'],
      summary: '1. GET - the logged-in user',
      description: 'Bearer token. Any role.',
      security: bearer,
      responses: { 200: ok('User', wrap('user', ref('User'))), ...errors(401, 429) },
    },
  },

  '/api/complaints': {
    post: {
      tags: ['3. Complaints - customer'],
      summary: '1. POST - submit a complaint',
      description: 'Bearer token. Role: customer.',
      security: bearer,
      requestBody: body('CreateComplaintRequest'),
      responses: { 201: ok('Complaint saved', oneComplaint), ...errors(400, 401, 403, 429) },
    },
  },
  '/api/complaints/mine': {
    get: {
      tags: ['3. Complaints - customer'],
      summary: '2. GET - list my complaints',
      description: 'Bearer token. Role: customer.',
      security: bearer,
      responses: {
        200: ok('Complaints', wrap('complaints', { type: 'array', items: ref('Complaint') })),
        ...errors(401, 403, 429),
      },
    },
  },
  '/api/complaints/{id}': {
    get: {
      tags: ['3. Complaints - customer'],
      summary: '3. GET - read one complaint',
      description: 'Bearer token. Role: customer (own complaints only) or admin.',
      security: bearer,
      parameters: [complaintId],
      responses: { 200: ok('Complaint', oneComplaint), ...errors(400, 401, 403, 404, 429) },
    },
  },
  '/api/complaints/{id}/analyze': {
    post: {
      tags: ['5. Complaints - admin'],
      summary: '1. POST - run the AI analysis',
      description: 'Bearer token. Role: admin. No body.',
      security: bearer,
      parameters: [complaintId],
      responses: { 200: ok('Complaint', oneComplaint), ...errors(400, 401, 403, 404, 409, 429, 503) },
    },
  },
  '/api/complaints/{id}/status': {
    patch: {
      tags: ['5. Complaints - admin'],
      summary: '2. PATCH - change the status',
      description: 'Bearer token. Role: admin.',
      security: bearer,
      parameters: [complaintId],
      requestBody: body('UpdateStatusRequest'),
      responses: { 200: ok('Complaint', oneComplaint), ...errors(400, 401, 403, 404, 429) },
    },
  },
  '/api/complaints/{id}/reply': {
    post: {
      tags: ['5. Complaints - admin'],
      summary: '3. POST - send a reply',
      description: 'Bearer token. Role: admin.',
      security: bearer,
      parameters: [complaintId],
      requestBody: body('ReplyRequest'),
      responses: { 200: ok('Complaint', oneComplaint), ...errors(400, 401, 403, 404, 429) },
    },
  },

  '/api/admin/queue': {
    get: {
      tags: ['4. Admin dashboard'],
      summary: '1. GET - complaint queue, most urgent first',
      description: 'Bearer token. Role: admin.',
      security: bearer,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: VALID_STATUSES, default: 'Open' } },
        { name: 'category', in: 'query', schema: { type: 'string', maxLength: 60 } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: ok('Queue page', {
          type: 'object',
          properties: {
            items: { type: 'array', items: ref('Complaint') },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        }),
        ...errors(400, 401, 403, 429),
      },
    },
  },
  '/api/admin/summary': {
    get: {
      tags: ['4. Admin dashboard'],
      summary: '2. GET - complaint counts by status',
      description: 'Bearer token. Role: admin.',
      security: bearer,
      responses: {
        200: ok('Counts', {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            open: { type: 'integer' },
            inProgress: { type: 'integer' },
            resolved: { type: 'integer' },
          },
        }),
        ...errors(401, 403, 429),
      },
    },
  },
  '/api/admin/analytics': {
    get: {
      tags: ['4. Admin dashboard'],
      summary: '3. GET - numbers for the admin charts',
      description: 'Bearer token. Role: admin.',
      security: bearer,
      responses: {
        200: ok('Analytics', {
          type: 'object',
          properties: { byCategory: counts('label'), byPriority: counts('label'), daily: counts('date') },
        }),
        ...errors(401, 403, 429),
      },
    },
  },
};

// additionalProperties: false mirrors rejectUnknownFields on the real routes.
const request = (properties, required) => ({ type: 'object', additionalProperties: false, required, properties });

const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'UNAUTHORIZED' },
          message: { type: 'string', example: 'Please log in to continue' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['customer', 'admin'] },
    },
  },
  Complaint: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      customer: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      orderReference: { type: 'string', nullable: true },
      status: { type: 'string', enum: VALID_STATUSES },
      category: { type: 'string', nullable: true },
      priority: { type: 'string', enum: VALID_PRIORITIES },
      analysisPending: { type: 'boolean' },
      agentReply: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  RegisterRequest: request(
    {
      name: { type: 'string', minLength: 2, maxLength: 60, example: 'Asha Rao' },
      email: { type: 'string', format: 'email', example: 'asha@example.com' },
      password: { type: 'string', format: 'password', minLength: 8, description: 'At least one letter and one number' },
    },
    ['name', 'email', 'password'],
  ),
  LoginRequest: request(
    {
      email: { type: 'string', format: 'email', example: 'asha@example.com' },
      password: { type: 'string', format: 'password' },
    },
    ['email', 'password'],
  ),
  GoogleRequest: request({ credential: { type: 'string', description: 'Google ID token' } }, ['credential']),
  CreateComplaintRequest: request(
    {
      title: { type: 'string', minLength: 5, maxLength: 120, example: 'Parcel has not arrived' },
      description: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        example: 'My parcel was due last week and the tracking page has not changed.',
      },
      orderReference: { type: 'string', maxLength: 60, example: 'ORD-1001' },
    },
    ['title', 'description'],
  ),
  UpdateStatusRequest: request({ status: { type: 'string', enum: VALID_STATUSES } }, ['status']),
  ReplyRequest: request(
    {
      reply: { type: 'string', minLength: 1, maxLength: 2000 },
      category: { type: 'string', maxLength: 60 },
      priority: { type: 'string', enum: VALID_PRIORITIES },
    },
    ['reply'],
  ),
};

// The groups, in the order Swagger UI shows them. Inside a group the routes
// are shown in the order of paths above.
const tags = [
  { name: '0. Public', description: 'No login' },
  { name: '1. Auth', description: 'Accounts and tokens' },
  { name: '2. Users', description: 'Bearer token, any role' },
  { name: '3. Complaints - customer', description: 'Bearer token of a customer' },
  { name: '4. Admin dashboard', description: 'Bearer token of an admin' },
  { name: '5. Complaints - admin', description: 'Bearer token of an admin' },
];

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Complaint Triage API',
    version: '1.0.0',
    description: 'Log in with POST /api/auth/login. The page saves the accessToken into Authorize.',
  },
  servers: [{ url: '/' }],
  tags,
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
    },
    schemas,
  },
  paths,
};

module.exports = { openapi };
