import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
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
const editor = await worker.fetch(new Request(origin + '/assets/editor.bundle.js'), {});
assert.equal(editor.status, 200);
assert.match(editor.headers.get('content-type'), /javascript/);
const editorSource = await editor.text();
assert.match(editorSource, /Copyright/);
assert.ok(editorSource.length > 100000, 'self-hosted editor bundle must be included');
const professional = await worker.fetch(new Request(origin + '/data/professional.js'), {});
assert.equal(professional.status, 200);
assert.ok((await professional.text()).includes('professionalLessons'));
const visuals = await worker.fetch(new Request(origin + '/data/lesson-visuals.js'), {});
assert.equal(visuals.status, 200);
assert.match(visuals.headers.get('content-type'), /javascript/);
assert.ok((await visuals.text()).includes('lessonVisuals'));
const projectZip = await worker.fetch(new Request(origin + '/downloads/build-maven.zip'), {});
assert.equal(projectZip.status, 200);
assert.equal(projectZip.headers.get('content-type'), 'application/zip');
assert.match(projectZip.headers.get('content-disposition'), /attachment/);
const archive = unzipSync(new Uint8Array(await projectZip.arrayBuffer()));
assert.ok(archive['pom.xml'] && archive['lessons/build-maven/starter/pom.xml']);
for (const file of ['/server/exercises.mjs', '/examples/solutions.json', '/.openai/hosting.json', '/missing']) {
  assert.equal((await worker.fetch(new Request(origin + file), {})).status, 404);
}
assert.equal((await worker.fetch(new Request(origin, { method: 'POST' }), {})).status, 405);
const unauthenticated = await worker.fetch(new Request(origin + '/api/runtime'), { REQUIRE_IDENTITY: false });
assert.equal(unauthenticated.status, 401, 'Worker must require gateway identity even if an env value disables it');
console.log('PASS: built Worker static routing, CSP, private file exclusion and fail-closed identity');
