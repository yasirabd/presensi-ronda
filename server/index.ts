import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { open } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { POST as face } from './face.ts';
import { POST as joinDraft } from './join-draft.ts';
import { POST as joinRegistration } from './join-registration.ts';

const routes = new Map([
  ['/api/face', face],
  ['/api/join-draft', joinDraft],
  ['/api/join-registration', joinRegistration],
]);
const frontendOrigin = process.env.FRONTEND_ORIGIN ? new URL(process.env.FRONTEND_ORIGIN).origin : undefined;
const pages = new Set(['/', '/masuk', '/daftar']);
const dist = resolve('dist');
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.avif': 'image/avif',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

function webRequest(req: IncomingMessage, url: URL) {
  const headers = new Headers();
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
  }
  // Keep the socket open when a handler stops reading after its byte limit.
  const iterator = req.iterator({ destroyOnReturn: false });
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await iterator.next();
      if (chunk.done) controller.close();
      else controller.enqueue(chunk.value);
    },
    async cancel() {
      await iterator.return?.();
      req.resume();
    },
  });
  return new Request(url, { method: 'POST', headers, body, duplex: 'half' } as RequestInit);
}

async function serveFile(pathname: string, req: IncomingMessage, res: ServerResponse) {
  const file = resolve(dist, '.' + (pages.has(pathname) ? '/index.html' : pathname));
  if (!file.startsWith(dist + sep)) {
    res.writeHead(404).end();
    return;
  }
  let handle;
  try {
    handle = await open(file, 'r');
    const info = await handle.stat();
    if (!info.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': pathname.startsWith('/_expo/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else await pipeline(handle.createReadStream({ autoClose: false }), res);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      res.writeHead(404).end();
    } else throw error;
  } finally {
    await handle?.close();
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
      if (pathname.includes('\0')) throw new Error();
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      const handler = routes.get(pathname);
      if (!handler) {
        res.writeHead(404).end();
        return;
      }
      const origin = req.headers.origin;
      res.setHeader('Vary', 'Origin');
      const localDev = process.env.NODE_ENV !== 'production' && origin && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
      if (origin && (origin === frontendOrigin || localDev)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'authorization,content-type,x-rt,x-action,x-join-invite,x-consent,x-shift,x-location-session',
          }).end();
          return;
        }
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST' }).end();
        return;
      }
      const request = webRequest(req, url);
      let response;
      try {
        response = await handler(request);
      } finally {
        req.resume();
      }
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    await serveFile(pathname, req, res);
  } catch {
    if (res.headersSent) res.destroy();
    else res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Layanan belum tersedia. Coba lagi.' }));
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
