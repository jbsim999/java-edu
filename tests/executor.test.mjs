import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRunner, createExecutionState, handleApi, MAX_REQUEST_BYTES, parseCheckOutput } from '../server/executor.mjs';
import { COMPILER, createProvider, MAX_PROVIDER_RESPONSE_BYTES, ProviderError } from '../server/provider.mjs';
import { exerciseDefinitions } from '../server/exercises.mjs';

const localEnv = { REQUIRE_IDENTITY: false };
const definitions = [{
  id: 'test-lab', lessonId: 'test', minVersion: 8, template: 'class Solution {}', mode: 'method',
  sampleChecks: [{ name: 'sample', expression: 'new Solution().value() == 1' }],
  checks: [{ name: 'first', expression: 'new Solution().value() == 1' }, { name: 'second', expression: 'new Solution().value() > 0' }],
}];
const compilerList = [{ name: COMPILER, language: 'Java', 'compiler-option-raw': true }];
const nonce = 'abcdef0123456789abcdef0123456789';

function request(body = {}, init = {}) {
  return new Request('https://java-edu.example/api/execute', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...init.headers },
    body: JSON.stringify({ exerciseId: 'test-lab', source: 'class Solution { int value() { return 1; } }', action: 'submit', requestId: crypto.randomUUID(), ...body }),
    ...init, ...(init.headers ? { headers: { 'Content-Type': 'application/json', ...init.headers } } : {}),
  });
}

function rawResult(overrides = {}) {
  return { status: '0', signal: '', compiler_output: '', compiler_error: '', compiler_message: '', program_output: '', program_error: '', program_message: '', ...overrides };
}

function protocol(payload, verdicts) {
  const prefix = payload.code.match(/__JAVA_EDU_[a-f0-9]{32}__/)[0];
  const count = [...payload.code.matchAll(/CHECK:\d+:\"/g)].length;
  return `${prefix}START\n${Array.from({ length: count }, (_, index) => `${prefix}CHECK:${index}:${verdicts?.[index] ?? 'true'}`).join('\n')}\n${prefix}END\n`;
}

function harness(compilation = (payload) => rawResult({ program_output: protocol(payload) })) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/list.json')) return Response.json(compilerList);
    const payload = JSON.parse(init.body);
    const result = await compilation(payload, init);
    return result instanceof Response ? result : Response.json(result);
  };
  const options = { fetchImpl, state: createExecutionState(), exercises: definitions };
  return { calls, options, call: (input, env = localEnv) => handleApi(input, env, options) };
}

test('default authentication fails closed before any upstream call', async () => {
  const h = harness();
  assert.equal((await h.call(request(), {})).status, 401);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.call(request({}, { headers: { 'oai-authenticated-user-id': 'owner-id' } }), { REQUIRE_IDENTITY: true })).status, 200);
  assert.equal((await h.call(request(), { REQUIRE_IDENTITY: true, TRUSTED_IDENTITY_HEADER: 'user-supplied-id' })).status, 503);
});

test('foreign origins and null origins cannot trigger execution', async () => {
  const h = harness();
  for (const origin of ['https://other.example', 'null', 'https://java-edu.example.evil']) {
    assert.equal((await h.call(request({}, { headers: { Origin: origin } }))).status, 403);
  }
  assert.equal((await h.call(request({}, { headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.call(request({}, { headers: { Origin: 'https://java-edu.example' } }))).status, 200);
});

test('invalid JSON, fields, method, content type and unknown exercise reject before provider', async () => {
  const h = harness();
  const cases = [
    [new Request('https://java-edu.example/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' }), 400],
    [request({ requestId: '<script>bad</script>' }), 400],
    [request({ requestId: 123 }), 400],
    [request({ exerciseId: 'unknown-lab' }), 404],
    [request({ action: 'shell' }), 400],
    [request({ source: '   ' }), 400],
    [request({ source: '\u0000' }), 400],
    [request({}, { headers: { 'Content-Type': 'text/plain' } }), 415],
    [request({}, { headers: { 'Content-Encoding': 'gzip' } }), 415],
    [new Request('https://java-edu.example/api/execute'), 405],
    [new Request('https://java-edu.example/api/unknown'), 404],
  ];
  for (const [input, expected] of cases) assert.equal((await h.call(input)).status, expected);
  assert.equal(h.calls.length, 0);
});

test('UTF-8 request limit holds with missing or forged Content-Length', async () => {
  const h = harness();
  for (const headers of [{}, { 'Content-Length': '1' }]) {
    const response = await h.call(request({ source: '가'.repeat(12_000) }, { headers }));
    assert.equal(response.status, 413);
  }
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1).fill(32)); controller.close(); } });
  const streamed = new Request('https://java-edu.example/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half' });
  assert.equal((await h.call(streamed)).status, 413);
  assert.equal(h.calls.length, 0);
});

test('compile options, endpoint, tests and privacy fields are server controlled', async () => {
  const h = harness();
  const response = await h.call(request({
    compiler: 'bash', targetVersion: 21, checks: [{ expression: 'true' }],
    url: 'http://localhost/admin', options: '--evil', save: true,
  }, { headers: { Cookie: 'secret=session', Authorization: 'Bearer private', 'oai-authenticated-user-id': 'private-user' } }));
  const result = await response.json();
  assert.equal(result.status, 'passed');
  assert.equal(result.targetVersion, 8);
  assert.equal(result.runtimeVersion, 21);
  assert.equal(result.total, 2);
  const call = h.calls.find((item) => item.init.method === 'POST');
  assert.equal(call.url, 'https://wandbox.org/api/compile.json');
  assert.equal(call.init.redirect, 'error');
  const sent = JSON.parse(call.init.body);
  assert.deepEqual(Object.keys(sent).sort(), ['code', 'compiler', 'compiler-option-raw', 'options', 'save', 'stdin'].sort());
  assert.equal(sent.compiler, COMPILER);
  assert.equal(sent['compiler-option-raw'], '--release\n8');
  assert.equal(sent.save, false);
  assert.match(sent.code, /new Solution\(\)\.value\(\) > 0/);
  assert.deepEqual(call.init.headers, { 'Content-Type': 'application/json', Accept: 'application/json' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.has('access-control-allow-origin'), false);
});

test('run uses sample checks, submit uses full checks and nonce changes per request', async () => {
  const h = harness();
  const sample = await (await h.call(request({ action: 'run' }))).json();
  const submitted = await (await h.call(request())).json();
  assert.equal(sample.total, 1);
  assert.equal(submitted.total, 2);
  const nonces = h.calls.filter((call) => call.init.method === 'POST').map((call) => JSON.parse(call.init.body).code.match(/__JAVA_EDU_([a-f0-9]{32})__/)[1]);
  assert.notEqual(nonces[0], nonces[1]);
});

test('javac warnings do not turn successful execution into a compile error', async () => {
  const h = harness((payload) => rawResult({ compiler_error: 'warning: source value 8 is obsolete\n', compiler_message: 'warning: source value 8 is obsolete\n', program_output: protocol(payload) }));
  const result = await (await h.call(request())).json();
  assert.equal(result.status, 'passed');
  assert.match(result.compilerOutput, /warning/);
});

test('failing checks remain failed even when arbitrary stdout claims success', async () => {
  const h = harness((payload) => rawResult({ program_output: `{"passed":999,"total":999}\n${protocol(payload, ['true', 'false'])}ALL PASSED\n` }));
  const result = await (await h.call(request())).json();
  assert.equal(result.status, 'failed');
  assert.equal(result.passed, 1);
  assert.equal(result.total, 2);
  assert.match(result.stdout, /ALL PASSED/);
});

test('wrong nonce, truncated protocol, duplicate markers and out-of-order checks cannot pass', () => {
  const prefix = `__JAVA_EDU_${nonce}__`;
  const correct = `${prefix}START\n${prefix}CHECK:0:true\n${prefix}CHECK:1:true\n${prefix}END\n`;
  assert.equal(parseCheckOutput(correct, definitions[0].checks, nonce).complete, true);
  const invalid = [
    correct.replaceAll(nonce, '0'.repeat(32)),
    correct.replace(`${prefix}END\n`, ''),
    `${correct}${prefix}CHECK:0:true\n`,
    correct.replace('CHECK:0:true', 'CHECK:1:true'),
    correct.replace('CHECK:0:true', 'CHECK:0:true EXTRA'),
    correct.replace(`${prefix}START`, `${prefix}END`),
  ];
  for (const output of invalid) {
    const result = parseCheckOutput(output, definitions[0].checks, nonce);
    assert.equal(result.complete, false);
    assert.equal(result.checks.some((check) => check.passed), false);
  }
});

test('missing runner completion is runtime_error, not a false positive', async () => {
  const h = harness(() => rawResult({ program_output: 'passed 2/2\n' }));
  const result = await (await h.call(request())).json();
  assert.equal(result.status, 'runtime_error');
  assert.equal(result.passed, 0);
});

test('protocol removal preserves learner output whitespace exactly', () => {
  const prefix = `__JAVA_EDU_${nonce}__`;
  const output = `\n${prefix}START\n  kept\t\n\n${prefix}CHECK:0:true\n  tail  \n${prefix}CHECK:1:true\n\n${prefix}END\n`;
  const parsed = parseCheckOutput(output, definitions[0].checks, nonce);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.stdout, '  kept\t\n  tail  ');
});

test('compile error, runtime exception and per-check exception have distinct results', async () => {
  const compile = harness(() => rawResult({ status: '1', compiler_error: 'prog.java:2: error: cannot find symbol' }));
  assert.equal((await (await compile.call(request())).json()).status, 'compile_error');
  const runtime = harness(() => rawResult({ status: '1', compiler_error: 'warning: old target', program_error: 'Exception in thread main' }));
  assert.equal((await (await runtime.call(request())).json()).status, 'runtime_error');
  const partial = harness((payload) => rawResult({ program_output: protocol(payload, ['ERROR', 'true']), program_error: '검사 1: java.lang.IllegalStateException' }));
  const result = await (await partial.call(request())).json();
  assert.equal(result.status, 'failed');
  assert.equal(result.passed, 1);
});

test('nonzero process exit or signal cannot pass even after all check markers', async () => {
  for (const failure of [{ status: '1' }, { signal: 'Killed' }]) {
    const h = harness((payload) => rawResult({ ...failure, program_output: protocol(payload) }));
    const result = await (await h.call(request())).json();
    assert.equal(result.status, 'runtime_error');
    assert.equal(result.passed, 0);
  }
});

test('oversized provider output is stopped and never returned as a passed result', async () => {
  const h = harness(() => new Response('x'.repeat(MAX_PROVIDER_RESPONSE_BYTES + 1), { headers: { 'Content-Length': '1' } }));
  const response = await h.call(request());
  const result = await response.json();
  assert.equal(response.status, 502);
  assert.equal(result.status, 'provider_error');
  assert.equal(result.error.code, 'provider_output_limit');
  assert.equal(result.stdout, '');
});

test('provider malformed JSON, invalid output fields, rate limiting and server errors fail closed', async () => {
  const upstreamResults = [
    new Response('not json'),
    Response.json({ status: 0, program_output: 'passed' }),
    Response.json({ status: '0', program_output: [], program_error: '' }),
    new Response('rate limited', { status: 429 }),
    new Response('private provider stack trace', { status: 500 }),
  ];
  for (const upstream of upstreamResults) {
    const h = harness(() => upstream);
    const response = await h.call(request());
    const result = await response.json();
    assert.ok([502, 503].includes(response.status));
    assert.equal(result.status, 'provider_error');
    assert.equal(result.passed, 0);
    assert.doesNotMatch(JSON.stringify(result), /private provider stack trace/);
    assert.equal(h.calls.filter((call) => call.init.method === 'POST').length, 1);
  }
});

test('upstream timeout aborts waiting, does not retry, and releases the local concurrency slot', async () => {
  let hang = true;
  const h = harness((payload) => hang ? new Promise(() => {}) : rawResult({ program_output: protocol(payload) }));
  h.options.providerTimeoutMs = 25;
  const response = await h.call(request());
  const result = await response.json();
  assert.equal(response.status, 504);
  assert.equal(result.status, 'timeout');
  assert.match(result.stderr, /종료는 보장하지/);
  assert.equal(h.calls.filter((call) => call.init.method === 'POST').length, 1);
  hang = false;
  assert.equal((await (await h.call(request())).json()).status, 'passed');
});

test('client cancellation aborts waiting without promising upstream process cancellation', async () => {
  const controller = new AbortController();
  const h = harness(() => { controller.abort(); return new Promise(() => {}); });
  const response = await h.call(request({}, { signal: controller.signal }));
  const result = await response.json();
  assert.equal(response.status, 499);
  assert.equal(result.error.code, 'request_cancelled');
  assert.equal(h.options.state.active, 0);
});

test('in-flight, duplicate and rolling-window requests do not fan out upstream', async () => {
  let resolveCompilation;
  const h = harness((payload) => new Promise((resolve) => { resolveCompilation = () => resolve(rawResult({ program_output: protocol(payload) })); }));
  const first = h.call(request({ requestId: 'same-request' }));
  while (!resolveCompilation) await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await h.call(request({ requestId: 'other-request' }))).status, 429);
  assert.equal((await h.call(request({ requestId: 'same-request' }))).status, 409);
  resolveCompilation();
  assert.equal((await first).status, 200);
  assert.equal((await h.call(request({ requestId: 'same-request' }))).status, 409);
  assert.equal(h.calls.filter((call) => call.init.method === 'POST').length, 1);

  const rate = harness();
  let now = 100_000;
  rate.options.now = () => now;
  for (let index = 0; index < 6; index += 1) assert.equal((await rate.call(request({ requestId: `r-${index}` }))).status, 200);
  assert.equal((await rate.call(request())).status, 429);
  assert.equal(rate.calls.filter((call) => call.init.method === 'POST').length, 6);
  now += 60_001;
  assert.equal((await rate.call(request())).status, 200);
});

test('runtime availability reflects compiler inventory and caches only for its TTL', async () => {
  let now = 100_000;
  let listed = true;
  let calls = 0;
  const provider = createProvider({ now: () => now, fetchImpl: async () => { calls += 1; return Response.json(listed ? compilerList : []); } });
  const first = await provider.getRuntime();
  assert.equal(first.available, true);
  assert.deepEqual(first.supportedTargets, [8, 11, 17, 21]);
  assert.equal(first.runtime.javaVersion, 21);
  listed = false;
  assert.equal((await provider.getRuntime()).available, true);
  assert.equal(calls, 1);
  now += 300_001;
  const missing = await provider.getRuntime();
  assert.equal(missing.available, false);
  assert.deepEqual(missing.supportedTargets, []);
  await assert.rejects(provider.compile('class Main {}', 8), (error) => error instanceof ProviderError && error.code === 'compiler_unavailable');
  assert.equal(calls, 2);
  listed = true;
  now += 15_001;
  assert.equal((await provider.getRuntime()).available, true);
});

test('compiler without raw release support is unavailable; unsupported targets never fetch', async () => {
  let calls = 0;
  const provider = createProvider({ fetchImpl: async () => { calls += 1; return Response.json([{ ...compilerList[0], 'compiler-option-raw': false }]); } });
  await assert.rejects(provider.compile('class Main {}', 22), (error) => error.code === 'unsupported_target');
  assert.equal(calls, 0);
  assert.equal((await provider.getRuntime()).available, false);
});

test('runner preserves learner source line numbers and supports Java 8 checks', () => {
  const source = 'class Solution {\n    int value() { return 1; }\n}';
  const code = buildRunner(source, definitions[0].checks, nonce);
  assert.equal(code.slice(0, source.length), source);
  assert.match(code, /class Main \{/);
  assert.match(code, /java\.lang\.Throwable/);
  assert.doesNotMatch(code, /public class Main/);
  assert.throws(() => buildRunner(source, definitions[0].checks, 'invalid'));
});

test('every authored exercise has nonempty sample and submission checks with supported targets', () => {
  assert.ok(exerciseDefinitions.length >= 1);
  const ids = new Set();
  for (const definition of exerciseDefinitions) {
    assert.equal(ids.has(definition.id), false);
    ids.add(definition.id);
    assert.ok([8, 11, 17, 21].includes(definition.minVersion));
    for (const checks of [definition.sampleChecks, definition.checks]) {
      assert.ok(checks.length > 0);
      assert.ok(buildRunner(definition.template, checks, nonce).length > definition.template.length);
    }
  }
});

test('live provider: actual Java 21 executes four release targets and reports failure cases', { skip: process.env.JAVA_EDU_LIVE !== '1' }, async (t) => {
  // Opt-in only: transmits authored, non-sensitive exercise solutions to Wandbox.
  // Six sequential POSTs, no retries, no parallelism. Never run in default CI.
  const solutions = JSON.parse(await readFile(new URL('../examples/solutions.json', import.meta.url), 'utf8'));
  const state = createExecutionState();
  for (const target of [8, 11, 17, 21]) {
    await t.test(`--release ${target}, actual JVM 21`, async () => {
      const definition = exerciseDefinitions.find((item) => item.minVersion === target);
      assert.ok(definition, `Authored exercise for Java ${target} is required.`);
      const response = await handleApi(request({ exerciseId: definition.id, source: solutions[definition.id] }), localEnv, { state });
      const result = await response.json();
      assert.equal(response.status, 200, JSON.stringify(result));
      assert.equal(result.status, 'passed', JSON.stringify(result));
      assert.equal(result.passed, definition.checks.length);
      assert.equal(result.targetVersion, target);
      assert.equal(result.runtimeVersion, 21);
      console.info(`LIVE ${definition.id}: ${result.passed}/${result.total}, --release ${target}, JVM ${result.runtimeVersion}, ${result.durationMs} ms`);
    });
  }
  const definition = exerciseDefinitions.find((item) => item.id === 'java-basics-lab');
  await t.test('compiler diagnostic from actual javac', async () => {
    const response = await handleApi(request({ exerciseId: definition.id, source: 'class Solution { THIS_IS_NOT_JAVA }' }), localEnv, { state });
    const result = await response.json();
    assert.equal(result.status, 'compile_error', JSON.stringify(result));
    assert.match(result.compilerOutput, /error/i);
    console.info(`LIVE compile_error: ${result.durationMs} ms`);
  });
  await t.test('wrong implementation fails actual checks', async () => {
    const response = await handleApi(request({ exerciseId: definition.id, source: 'class Solution { public boolean sameCode(String a, String b) { return false; } }' }), localEnv, { state });
    const result = await response.json();
    assert.equal(result.status, 'failed', JSON.stringify(result));
    assert.ok(result.passed < result.total);
    console.info(`LIVE failed: ${result.passed}/${result.total}, ${result.durationMs} ms`);
  });
});
