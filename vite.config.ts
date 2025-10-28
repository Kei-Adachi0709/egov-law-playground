import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

const DEFAULT_TARGET = process.env.VITE_EGOV_LAW_API_BASE_URL ?? 'https://laws.e-gov.go.jp/api/2/';
const ALLOWED_HOSTS = new Set([new URL(DEFAULT_TARGET).host]);

const readRequestBody = async (req: IncomingMessage): Promise<Uint8Array | undefined> => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) {
    return undefined;
  }
  return Buffer.concat(chunks);
};

const filterHeaders = (headers: Record<string, string | string[] | undefined> | undefined): Headers => {
  const forward = new globalThis.Headers();
  if (!headers) {
    return forward;
  }
  Object.entries(headers).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    const normalized = key.toLowerCase();
    if (['host', 'connection', 'content-length'].includes(normalized)) {
      return;
    }
    if (Array.isArray(value)) {
      forward.set(key, value.join(', '));
    } else {
      forward.set(key, value);
    }
  });
  return forward;
};

const devProxyPlugin = {
  name: 'dev-egov-proxy',
  configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use('/api/proxy', (req, res) => {
      void (async () => {
        try {
        if ((req.method ?? 'GET').toUpperCase() === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,HEAD,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '');
          res.end();
          return;
        }

        const requestUrl = new URL(req.url ?? '', 'http://localhost');
        const targetParam = requestUrl.searchParams.get('target');
        if (!targetParam) {
          res.statusCode = 400;
          res.end('Missing "target" query parameter.');
          return;
        }

        const targetUrl = new URL(targetParam);
        if (!ALLOWED_HOSTS.has(targetUrl.host)) {
          res.statusCode = 400;
          res.end('Target host is not allowed.');
          return;
        }

        const body = await readRequestBody(req);
        const upstreamResponse = await globalThis.fetch(targetUrl, {
          method: req.method,
          headers: filterHeaders(req.headers),
          body: body ? Buffer.from(body) : undefined,
          redirect: 'follow'
        });

        res.statusCode = upstreamResponse.status;
        upstreamResponse.headers.forEach((value: string, key: string) => {
          res.setHeader(key, value);
        });
        res.setHeader('Access-Control-Allow-Origin', '*');

        const upstreamBody = Buffer.from(await upstreamResponse.arrayBuffer());
        res.end(upstreamBody);
        } catch (error) {
          res.statusCode = 502;
          res.end(error instanceof Error ? error.message : 'Proxy request failed.');
        }
      })();
    });
  }
};

export default defineConfig({
  // Use a relative base so built asset URLs are relative (./assets/...) which
  // works when the site is served from a subpath or via a file-based deploy.
  // This avoids absolute "/assets/..." references that cause 404s under Apache
  // when the DocumentRoot isn't the site root.
  base: './',
  plugins: [react(), devProxyPlugin],
  server: {
    port: 5173
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) {
              return 'router';
            }
            if (id.includes('zustand')) {
              return 'state';
            }
            if (id.includes('fast-xml-parser')) {
              return 'xml';
            }
            return 'vendor';
          }
          if (id.includes('src/pages/')) {
            const match = id.match(/src\\pages\\([A-Za-z0-9]+)/) ?? id.match(/src\/pages\/([A-Za-z0-9]+)/);
            if (match?.[1]) {
              return `page-${match[1].toLowerCase()}`;
            }
          }
          return undefined;
        }
      }
    }
  }
});
