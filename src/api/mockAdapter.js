import { handlers, matchPath, HttpError } from './handlers';

const MIN_LATENCY = 120;
const MAX_LATENCY = 380;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUrl(config) {
  // axios passes a relative url + baseURL; combine them safely
  let path = config.url || '';
  let qs = '';
  const qIdx = path.indexOf('?');
  if (qIdx >= 0) {
    qs = path.slice(qIdx + 1);
    path = path.slice(0, qIdx);
  }
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}

function readBody(config) {
  if (!config.data) return null;
  if (typeof config.data === 'string') {
    try { return JSON.parse(config.data); } catch { return null; }
  }
  return config.data;
}

export default async function mockAdapter(config) {
  const { path, query } = parseUrl(config);
  const method = (config.method || 'get').toUpperCase();
  const body = readBody(config);
  const headers = Object.fromEntries(
    Object.entries(config.headers || {}).map(([k, v]) => [k.toLowerCase(), v]),
  );

  await delay(MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY));

  for (const route of handlers) {
    if (route.method !== method) continue;
    const params = matchPath(route.path, path);
    if (!params) continue;

    try {
      const data = await route.handler({ params, body, query, headers });
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: {},
      };
    } catch (err) {
      if (err instanceof HttpError) {
        const error = new Error(err.message);
        error.config = config;
        error.response = {
          data: err.body,
          status: err.status,
          statusText: '',
          headers: {},
          config,
        };
        error.isAxiosError = true;
        throw error;
      }
      const error = new Error(err?.message || 'Mock handler error');
      error.config = config;
      error.response = {
        data: { message: error.message },
        status: 500,
        statusText: 'Internal mock error',
        headers: {},
        config,
      };
      error.isAxiosError = true;
      throw error;
    }
  }

  const error = new Error(`Mock route not found: ${method} ${path}`);
  error.config = config;
  error.response = {
    data: { message: error.message },
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config,
  };
  error.isAxiosError = true;
  throw error;
}
