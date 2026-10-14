import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { LocalError } from './errors.mjs';

export const SESSION_COOKIE = 'java_edu_session';
export const CSRF_HEADER = 'x-java-edu-csrf';
const BODY_LIMIT = 384 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function sameSecret(value, expected) {
  return typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

function writeJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json' || (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity')) throw new LocalError('json_required', 'application/json 요청이 필요합니다.', 415);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new LocalError('request_too_large', '실행 요청 크기 제한을 넘었습니다.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new LocalError('invalid_json', 'JSON 요청을 읽을 수 없습니다.'); }
}

export async function startLocalServer({ distRoot, engine }) {
  const root = await realpath(distRoot);
  const sessionToken = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  let origin;
  let host;
  const server = http.createServer(async (request, response) => {
    try {
      if (request.headers.host !== host || request.socket.remoteAddress !== '127.0.0.1') throw new LocalError('host_not_allowed', '설치형 앱에서만 접근할 수 있습니다.', 403);
      const cookie = request.headers.cookie?.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
      if (!sameSecret(cookie, sessionToken)) throw new LocalError('authentication_required', '설치형 앱 세션이 필요합니다.', 401);
      if (request.headers.origin && request.headers.origin !== origin) throw new LocalError('origin_not_allowed', '앱 내부 요청만 허용합니다.', 403);
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new LocalError('origin_not_allowed', '다른 사이트의 요청은 허용하지 않습니다.', 403);
      const url = new URL(request.url, origin);
      if (url.origin !== origin) throw new LocalError('origin_not_allowed', '앱 내부 경로만 허용합니다.', 403);
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) throw new LocalError('method_not_allowed', '지원하지 않는 요청 방식입니다.', 405);
      if (request.method === 'POST' && (request.headers.origin !== origin || !sameSecret(request.headers[CSRF_HEADER], csrfToken))) throw new LocalError('csrf_required', '앱 내부 실행 요청인지 확인할 수 없습니다.', 403);
      if (url.pathname.startsWith('/api/')) {
        response.setHeader('Cache-Control', 'no-store');
        if (request.method === 'GET' && url.pathname === '/api/runtime') return writeJson(response, 200, engine.runtime());
        const project = /^\/api\/local\/projects\/([a-z0-9-]{1,100})$/.exec(url.pathname);
        if (request.method === 'GET' && project) return writeJson(response, 200, await engine.project(project[1]));
        if (request.method !== 'POST') throw new LocalError('not_found', 'API 경로를 찾을 수 없습니다.', 404);
        const input = await readJson(request);
        if (url.pathname === '/api/local/cancel') return writeJson(response, 200, engine.cancel(input.requestId));
        if (!['/api/execute', '/api/local/prepare'].includes(url.pathname)) throw new LocalError('not_found', 'API 경로를 찾을 수 없습니다.', 404);
        const controller = new AbortController();
        const abort = () => { if (!response.writableEnded) controller.abort(); };
        response.once('close', abort);
        try {
          const result = url.pathname === '/api/execute' ? await engine.execute(input, controller.signal) : await engine.prepare(input, controller.signal);
          if (!response.destroyed) writeJson(response, 200, result);
        } finally { response.removeListener('close', abort); }
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) throw new LocalError('method_not_allowed', '정적 교재는 읽기만 가능합니다.', 405);
      let relative;
      try { relative = decodeURIComponent(url.pathname).slice(1) || 'index.html'; }
      catch { throw new LocalError('invalid_path', '경로를 읽을 수 없습니다.'); }
      if (relative.includes('\\') || relative.split('/').some((part) => part.startsWith('.')) || relative.startsWith('server/') || relative.startsWith('desktop/')) throw new LocalError('not_found', '파일을 찾을 수 없습니다.', 404);
      const extension = path.extname(relative);
      if (!MIME[extension]) throw new LocalError('not_found', '파일을 찾을 수 없습니다.', 404);
      const filename = await realpath(path.join(root, relative)).catch(() => null);
      if (!filename || !filename.startsWith(`${root}${path.sep}`) || !(await stat(filename)).isFile()) throw new LocalError('not_found', '파일을 찾을 수 없습니다.', 404);
      const body = await readFile(filename);
      response.writeHead(200, {
        'Content-Type': MIME[extension], 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (response.destroyed || response.headersSent) return;
      const failure = error instanceof LocalError ? error : new LocalError('internal_error', '로컬 실행을 처리하지 못했습니다. 앱을 다시 시작하고 도구 설정을 확인하세요.', 500);
      writeJson(response, failure.httpStatus, { error: { code: failure.code, message: failure.message } });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 2_000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  host = `127.0.0.1:${server.address().port}`;
  origin = `http://${host}`;
  return { origin, sessionToken, csrfToken, async close() { await engine.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } };
}
