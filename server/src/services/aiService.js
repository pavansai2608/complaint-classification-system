const DEFAULT_TIMEOUT_MS = 5000;

function timeoutMs() {
  return Number(process.env.AI_SERVICE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
}

// Throws on any failure (missing config, timeout, non-2xx, bad JSON) so the
// caller decides what "the AI service is unavailable" should mean for a complaint.
async function analyzeComplaint(text) {
  const baseUrl = process.env.AI_SERVICE_URL;
  const serviceKey = process.env.AI_SERVICE_KEY;
  if (!baseUrl || !serviceKey) {
    throw new Error('AI service is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': serviceKey },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { analyzeComplaint };
