import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';

interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  body?: unknown;
}

type HeaderMap = Record<string, string>;

type JsonPayload = Record<string, unknown>;

const DEFAULT_TARGET = process.env.VITE_EGOV_LAW_API_BASE_URL ?? 'https://www.e-gov.go.jp/elaws/api/v1/';
const ALLOWED_HOSTS = new Set<string>([new URL(DEFAULT_TARGET).host]);
const RAW_EXTRA_HOSTS = process.env.EGOV_ALLOWED_PROXY_HOSTS ?? '';
const PROXY_ORIGIN = process.env.PROXY_ORIGIN;

RAW_EXTRA_HOSTS.split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0)
  .forEach((host) => ALLOWED_HOSTS.add(host));

const buildCorsHeaders = (origin?: string): HeaderMap => ({
  'Access-Control-Allow-Origin': PROXY_ORIGIN ?? origin ?? '*',
  'Access-Control-Allow-Credentials': 'true'
});

const filterHeaders = (headers: IncomingHttpHeaders | undefined): HeaderMap => {
  const forward: HeaderMap = {};
  Object.entries(headers ?? {}).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    const normalized = key.toLowerCase();
    if (['host', 'connection', 'content-length'].includes(normalized)) {
      return;
    }
    forward[key] = Array.isArray(value) ? value.join(', ') : value;
  });
  return forward;
};

const toBodyInit = (method: string, body: unknown): BodyInit | undefined => {
  if (['GET', 'HEAD'].includes(method)) {
    return undefined;
  }
  if (body === undefined || body === null || body === '') {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof ArrayBuffer) {
    return body;
  }
  if (ArrayBuffer.isView(body)) {
    const view = body as ArrayBufferView;
    const sliced = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return sliced as ArrayBuffer;
  }
  if (Buffer.isBuffer(body)) {
    return new Uint8Array(body);
  }
  return JSON.stringify(body);
};

const sendJson = (response: ServerResponse, status: number, payload: JsonPayload, originHeader?: string) => {
  const corsHeaders = buildCorsHeaders(originHeader);
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const sendBuffer = (response: ServerResponse, status: number, buffer: Buffer, headers: HeaderMap, originHeader?: string) => {
  const corsHeaders = buildCorsHeaders(originHeader);
  Object.entries({ ...headers, ...corsHeaders }).forEach(([key, value]) => response.setHeader(key, value));
  response.statusCode = status;
  response.end(buffer);
};

const extractTargetParam = (request: ExtendedRequest): string | undefined => {
  const fromQuery = request.query?.target;
  if (typeof fromQuery === 'string') {
    return fromQuery;
  }
  if (Array.isArray(fromQuery)) {
    return fromQuery[0];
  }
  if (request.url) {
    try {
      const url = new URL(request.url, 'http://localhost');
      return url.searchParams.get('target') ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export default async function handler(request: ExtendedRequest, response: ServerResponse) {
  const originHeader = (request.headers?.origin as string | undefined) ??
    (request.headers?.referer as string | undefined);

  if ((request.method ?? 'GET').toUpperCase() === 'OPTIONS') {
    const corsHeaders = buildCorsHeaders(originHeader);
    Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', request.headers?.['access-control-request-headers'] ?? 'Accept, Content-Type');
    response.statusCode = 204;
    response.end();
    return;
  }

  const targetParam = extractTargetParam(request);
  if (!targetParam) {
    sendJson(response, 400, { message: 'Missing "target" query parameter.' }, originHeader);
    return;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetParam);
  } catch (error) {
    sendJson(
      response,
      400,
      {
        message: 'Invalid target URL.',
        detail: error instanceof Error ? error.message : String(error)
      },
      originHeader
    );
    return;
  }

  if (!ALLOWED_HOSTS.has(targetUrl.host)) {
    sendJson(response, 400, { message: 'Target host is not allowed.' }, originHeader);
    return;
  }

  const method = (request.method ?? 'GET').toUpperCase();
  const body = toBodyInit(method, request.body);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: filterHeaders(request.headers),
      body,
      redirect: 'follow'
    });

    const headers: HeaderMap = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') {
        return;
      }
      headers[key] = value;
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    sendBuffer(response, upstreamResponse.status, buffer, headers, originHeader);
  } catch (error) {
    console.error('[Hourei] Vercel proxy failed', error);
    sendJson(
      response,
      502,
      {
        message: 'Proxy request failed.',
        detail: error instanceof Error ? error.message : String(error)
      },
      originHeader
    );
  }
}
