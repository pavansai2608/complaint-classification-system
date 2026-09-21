describe('analyzeComplaint', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
    process.env.AI_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('sends the text and service key, and returns the parsed response', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ category: 'billing', priority: 'Medium' }),
    });

    const { analyzeComplaint } = require('../src/services/aiService');
    const result = await analyzeComplaint('I was charged twice');

    expect(result).toEqual({ category: 'billing', priority: 'Medium' });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/analyze');
    expect(options.headers['X-Service-Key']).toBe('test-service-key');
    expect(JSON.parse(options.body)).toEqual({ text: 'I was charged twice' });
  });

  it('throws when the AI service responds with a non-2xx status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 });

    const { analyzeComplaint } = require('../src/services/aiService');
    await expect(analyzeComplaint('some text')).rejects.toThrow('status 500');
  });

  it('aborts and throws when the AI service does not respond in time', async () => {
    process.env.AI_SERVICE_TIMEOUT_MS = '10';
    global.fetch = jest.fn(
      (url, { signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        }),
    );

    const { analyzeComplaint } = require('../src/services/aiService');
    await expect(analyzeComplaint('some text')).rejects.toThrow('aborted');
  });

  it('throws when AI_SERVICE_URL or AI_SERVICE_KEY is not set', async () => {
    delete process.env.AI_SERVICE_URL;
    const { analyzeComplaint } = require('../src/services/aiService');
    await expect(analyzeComplaint('some text')).rejects.toThrow('not configured');
  });
});
