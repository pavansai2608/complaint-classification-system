const collection = require('../../postman/complaint-triage.postman_collection.json');
const environment = require('../../postman/complaint-triage.postman_environment.json');
const { openapi } = require('../src/docs/openapi');

const requests = collection.item.flatMap((folder) => folder.item);
const nameOf = ({ request }) => `${request.method} /${request.url.path.join('/')}`;
const inServer = requests.filter(({ request }) => request.url.host[0] === '{{baseUrl}}');
const inAi = requests.filter(({ request }) => request.url.host[0] === '{{aiBaseUrl}}');

describe('Postman collection', () => {
  it('has every server route in the OpenAPI spec', () => {
    const inSpec = Object.entries(openapi.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path.replace('{id}', '{{complaintId}}')}`),
    );
    expect([...new Set(inServer.map(nameOf))].sort()).toEqual(inSpec.sort());
    expect(inSpec).toHaveLength(16);
  });

  it('has both AI service routes, and sends the service key', () => {
    expect([...new Set(inAi.map(nameOf))].sort()).toEqual(['GET /health', 'POST /analyze']);
    const analyze = inAi.find(({ name }) => name === 'Analyze text');
    const key = Object.fromEntries(analyze.request.auth.apikey.map((item) => [item.key, item.value]));
    expect(key).toEqual({ key: 'X-Service-Key', value: '{{aiServiceKey}}', in: 'header' });
  });

  it('sends a Bearer token to every route that needs one', () => {
    const needToken = inServer.filter((item) => {
      const path = `/${item.request.url.path.join('/')}`.replace('{{complaintId}}', '{id}');
      return openapi.paths[path][item.request.method.toLowerCase()].security.some((s) => 'bearerAuth' in s);
    });
    const withoutToken = needToken.filter(({ request }) => request.auth.type !== 'bearer').map(({ name }) => name);
    expect(withoutToken).toEqual(['No token is refused']);
  });

  it('saves the token after each login', () => {
    const script = (name) =>
      requests.find((item) => item.name === name).event.find(({ listen }) => listen === 'test').script.exec.join('\n');
    expect(script('Login (customer)')).toContain("pm.environment.set('customerToken'");
    expect(script('Login (admin)')).toContain("pm.environment.set('adminToken'");
  });

  it('ships an environment with no real secrets', () => {
    const filled = environment.values.filter(({ type, value }) => type === 'secret' && value);
    expect(filled.map(({ key, value }) => [key, value])).toEqual([['googleIdToken', 'not-a-real-token']]);
  });
});
