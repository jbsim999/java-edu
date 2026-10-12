import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const origin = 'https://java-edu.example';
const html = await worker.fetch(new Request(origin), {});
assert.equal(html.status, 200);
assert.match(html.headers.get('content-type'), /text\/html/);
assert.match(html.headers.get('content-security-policy'), /script-src 'self'/);
assert.ok((await html.text()).includes('javaedu'));
const head = await worker.fetch(new Request(origin, { method: 'HEAD' }), {});
assert.equal(head.status, 200);
assert.equal(await head.text(), '');
for (const file of ['/server/exercises.mjs', '/examples/solutions.json', '/.openai/hosting.json', '/missing']) {
  assert.equal((await worker.fetch(new Request(origin + file), {})).status, 404);
}
assert.equal((await worker.fetch(new Request(origin, { method: 'POST' }), {})).status, 405);
const unauthenticated = await worker.fetch(new Request(origin + '/api/runtime'), { REQUIRE_IDENTITY: false });
assert.equal(unauthenticated.status, 401, 'Worker must require gateway identity even if an env value disables it');
console.log('PASS: built Worker static routing, CSP, private file exclusion and fail-closed identity');
