const collection = require('../../postman/complaint-triage.postman_collection.json');
const environment = require('../../postman/complaint-triage.postman_environment.json');
const { openapi } = require('../src/docs/openapi');

// The negative tests repeat routes with bad input, so they are left out here.
const negative = collection.item.find(({ name }) => name.startsWith('Negative tests'));
const requests = collection.item.filter((folder) => folder !== negative).flatMap((folder) => folder.item);
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
    const analyze = inAi.find(({ name }) => name === '1. POST - analyze a complaint');
    const key = Object.fromEntries(analyze.request.auth.apikey.map((item) => [item.key, item.value]));
    expect(key).toEqual({ key: 'X-Service-Key', value: '{{aiServiceKey}}', in: 'header' });
  });

  it('sends a Bearer token to every route that needs one', () => {
    const needToken = inServer.filter((item) => {
      const path = `/${item.request.url.path.join('/')}`.replace('{{complaintId}}', '{id}');
      return openapi.paths[path][item.request.method.toLowerCase()].security.some((s) => 'bearerAuth' in s);
    });
    const withoutToken = needToken.filter(({ request }) => request.auth.type !== 'bearer').map(({ name }) => name);
    expect(withoutToken).toEqual([]);
  });

  it('saves the token after each login', () => {
    const script = (name) =>
      requests.find((item) => item.name === name).event.find(({ listen }) => listen === 'test').script.exec.join('\n');
    expect(script('2. POST - log in (customer)')).toContain("pm.environment.set('customerToken'");
    expect(script('Setup - log in (admin)')).toContain("pm.environment.set('adminToken'");
  });

  it('uses the same numbered groups and steps as Swagger UI', () => {
    for (const { name } of openapi.tags) {
      const steps = collection.item
        .find((folder) => folder.name === name)
        .item.filter(({ request }) => request.url.host[0] === '{{baseUrl}}')
        .map((item) => item.name)
        .filter((step) => !step.startsWith('Setup'));
      const inSpec = Object.values(openapi.paths)
        .flatMap((methods) => Object.values(methods))
        .filter(({ tags, summary }) => tags[0] === name && !summary.includes('log out'))
        .map(({ summary }) => summary.split(' - ')[0]);
      expect(steps.map((step) => step.split(' - ')[0])).toEqual(inSpec);
    }
  });

  it('expects an error from every negative test', () => {
    for (const { name, event } of negative.item) {
      const code = name.match(/-> (4\d\d)$/)[1];
      expect(event[0].script.exec.join()).toContain(`have.status(${code})`);
    }
  });

  it('ships an environment with no real secrets', () => {
    const filled = environment.values.filter(({ type, value }) => type === 'secret' && value);
    expect(filled.map(({ key, value }) => [key, value])).toEqual([['googleIdToken', 'not-a-real-token']]);
  });
});
