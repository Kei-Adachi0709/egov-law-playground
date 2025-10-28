import type { Handler } from '@netlify/functions';

const DEFAULT_TARGET = process.env.VITE_EGOV_LAW_API_BASE_URL ?? 'https://laws.e-gov.go.jp/api/2/';
const allowedHosts = new Set<string>([new URL(DEFAULT_TARGET).host]);
const proxyOrigin = process.env.PROXY_ORIGIN;

const rawExtraHosts = process.env.EGOV_ALLOWED_PROXY_HOSTS ?? '';
rawExtraHosts
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry): entry is string => entry.length > 0)
  .forEach((host) => allowedHosts.add(host));

const buildCorsHeaders = (origin?: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': proxyOrigin ?? origin ?? '*',
  'Access-Control-Allow-Credentials': 'true'
});

const handler: Handler = async (event) => {
  const originHeader = event.headers?.origin ?? event.headers?.referer ?? undefined;

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...buildCorsHeaders(originHeader),
        'Access-Control-Allow-Methods': 'GET,POST,HEAD,OPTIONS',
        'Access-Control-Allow-Headers': event.headers?.['access-control-request-headers'] ?? 'Accept, Content-Type'
      }
    };
  }

  const targetParam = event.queryStringParameters?.target;
  if (!targetParam) {
    return {
      statusCode: 400,
      headers: buildCorsHeaders(originHeader),
      body: 'Missing "target" query parameter.'
    };
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetParam);
  } catch {
    return {
      statusCode: 400,
      headers: buildCorsHeaders(originHeader),
      body: 'Invalid target URL.'
    };
  }

  if (!allowedHosts.has(targetUrl.host)) {
    return {
      statusCode: 400,
      headers: buildCorsHeaders(originHeader),
      body: 'Target host is not allowed.'
    };
  }

  try {
    const requestHeaders = new globalThis.Headers();
    Object.entries(event.headers ?? {}).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      const normalized = key.toLowerCase();
      if (['host', 'connection', 'content-length'].includes(normalized)) {
        return;
      }
      const headerValue = Array.isArray(value) ? value.join(', ') : value;
      requestHeaders.set(key, headerValue);
    });

    let body: BodyInit | undefined;
    if (event.body) {
      body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    }

    const upstreamResponse = await globalThis.fetch(targetUrl, {
      method: event.httpMethod,
      headers: requestHeaders,
      body,
      redirect: 'follow'
    });

    const headers: Record<string, string> = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') {
        return;
      }
      headers[key] = value;
    });

    Object.assign(headers, buildCorsHeaders(originHeader));

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    return {
      statusCode: upstreamResponse.status,
      headers,
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('[Hourei] Netlify proxy failed', error);
    return {
      statusCode: 502,
      headers: buildCorsHeaders(originHeader),
      body: error instanceof Error ? error.message : 'Proxy request failed.'
    };
  }
};

export { handler };
