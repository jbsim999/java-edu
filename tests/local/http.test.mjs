import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { startLocalServer, SESSION_COOKIE, CSRF_HEADER } from '../../server/local/http.mjs';

test('loopback authenticates static/API access and validates Host, Origin and CSRF before execution', async (t) => {
  let calls = 0;
  const engine = { runtime: () => ({ mode: 'local', available: false }), execute: async () => { calls++; return { status: 'passed' }; }, close: async () => {}, cancel: () => ({ cancelled: true }) };
  const local = await startLocalServer({ distRoot: path.resolve(fileURLToPath(new URL('../../dist', import.meta.url))), engine });
  t.after(() => local.close());
  assert.match(local.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  const cookie = `${SESSION_COOKIE}=${local.sessionToken}`;
  const auth = { Cookie: cookie };
  assert.equal((await fetch(`${local.origin}/api/runtime`)).status, 401);
  assert.equal((await fetch(`${local.origin}/api/runtime`, { headers: auth })).status, 200);
  assert.equal((await fetch(`${local.origin}/`, { headers: auth })).status, 200);
  const forgedHostStatus = await new Promise((resolve, reject) => {
    const request = http.get(`${local.origin}/api/runtime`, { headers: { ...auth, Host: 'evil.test' } }, (response) => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
  });
  assert.equal(forgedHostStatus, 403);
  assert.equal((await fetch(`${local.origin}/api/runtime`, { headers: { ...auth, Origin: 'null' } })).status, 403);
  assert.equal((await fetch(`${local.origin}/server/executor.mjs`, { headers: auth })).status, 404);
  const post = (headers) => fetch(`${local.origin}/api/execute`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json', ...headers }, body: '{}' });
  assert.equal((await post({})).status, 403);
  assert.equal((await post({ Origin: local.origin })).status, 403);
  assert.equal((await post({ Origin: 'https://other.example', [CSRF_HEADER]: local.csrfToken })).status, 403);
  assert.equal(calls, 0);
  assert.equal((await post({ Origin: local.origin, [CSRF_HEADER]: local.csrfToken })).status, 200);
  assert.equal(calls, 1);
});
