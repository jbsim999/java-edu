import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) {
      const { handleApi } = await import('../server/executor.mjs');
      const controller = new AbortController();
      response.on('close', () => { if (!response.writableEnded) controller.abort(); });
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 33 * 1024) {
          response.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ error: { code: 'request_too_large', message: '요청 크기 한도를 넘었습니다.' } }));
          return;
        }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      const webRequest = new Request(`http://${request.headers.host || `127.0.0.1:${port}`}${request.url}`, {
        method: request.method, headers, signal: controller.signal,
        ...(request.method !== 'GET' && request.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
      });
      const result = await handleApi(webRequest, { REQUIRE_IDENTITY: false });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || pathname.startsWith('/server/') || pathname.startsWith('/.openai/') || !(await stat(file)).isFile()) throw new Error('not found');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Java Edu: http://127.0.0.1:${port}`));
server.on('error', (error) => { console.error(`미리보기 서버를 시작하지 못했습니다: ${error.message}`); process.exitCode = 1; });
