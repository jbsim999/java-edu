import { exerciseDefinitions } from './exercises.mjs';
import {
  BodyLimitError, ProviderError, PROVIDER_NAME, RUNTIME_VERSION, SUPPORTED_TARGETS,
  createProvider, readLimitedText, withDeadline,
} from './provider.mjs';

export const MAX_REQUEST_BYTES = 32 * 1024;
export const MAX_SOURCE_BYTES = 32 * 1024;
const MAX_CHECKS = 64;
const MAX_RUNNER_BYTES = 64 * 1024;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,80}$/;
const IDENTITY_HEADER = 'oai-authenticated-user-id';
const encoder = new TextEncoder();
const WINDOW_MS = 60_000;
const MAX_WINDOW_EXECUTIONS = 6;
const MAX_CONCURRENT_EXECUTIONS = 2;

export function createExecutionState() {
  return { providers: new WeakMap(), identities: new Map(), timestamps: [], active: 0 };
}

const defaultState = createExecutionState();

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function errorResponse(status, code, message, requestId, headers) {
  return json({ ...(requestId ? { requestId } : {}), error: { code, message } }, status, headers);
}

function authorize(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if ((origin !== null && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return { response: errorResponse(403, 'origin_not_allowed', '같은 사이트에서 실행 요청을 보내세요.') };
  }
  // The local adapter explicitly opts out. Deployment must use the private Sites
  // gateway, which enforces access and overwrites this header at ingress.
  if (env.REQUIRE_IDENTITY === false || env.REQUIRE_IDENTITY === 'false') return { identity: 'local' };
  if (env.TRUSTED_IDENTITY_HEADER && env.TRUSTED_IDENTITY_HEADER !== IDENTITY_HEADER) {
    return { response: errorResponse(503, 'identity_configuration', '인증 환경 설정을 확인해야 합니다.') };
  }
  const identity = request.headers.get(IDENTITY_HEADER)?.trim();
  if (!identity || identity.length > 256) return { response: errorResponse(401, 'authentication_required', '로그인한 사이트 소유자만 실행할 수 있습니다.') };
  return { identity };
}

function reserve(state, identity, requestId, now) {
  state.timestamps = state.timestamps.filter((time) => now - time < WINDOW_MS);
  for (const [key, value] of state.identities) {
    if (!value.active && now - value.updatedAt >= WINDOW_MS * 2) state.identities.delete(key);
  }
  let entry = state.identities.get(identity);
  if (!entry) {
    if (state.identities.size >= 128) return { code: 'execution_busy', message: '실행 요청이 많습니다. 잠시 후 다시 시도하세요.', status: 429 };
    entry = { active: false, requests: new Map(), updatedAt: now };
    state.identities.set(identity, entry);
  }
  for (const [id, timestamp] of entry.requests) if (now - timestamp >= WINDOW_MS * 2) entry.requests.delete(id);
  if (entry.requests.has(requestId)) return { code: 'duplicate_request', message: '이미 처리한 실행 요청입니다. 새 실행 요청으로 시도하세요.', status: 409 };
  if (entry.active || state.active >= MAX_CONCURRENT_EXECUTIONS || state.timestamps.length >= MAX_WINDOW_EXECUTIONS) {
    return { code: 'execution_busy', message: '실행 중인 요청이 있거나 분당 실행 한도를 넘었습니다. 잠시 후 다시 시도하세요.', status: 429 };
  }
  entry.active = true;
  entry.updatedAt = now;
  entry.requests.set(requestId, now);
  state.active += 1;
  state.timestamps.push(now);
  return { release() { entry.active = false; state.active -= 1; } };
}

function selectedChecks(definition, action) {
  const checks = action === 'run' ? definition.sampleChecks : definition.checks;
  if (!SUPPORTED_TARGETS.includes(definition.minVersion) || !Array.isArray(checks) || checks.length < 1 || checks.length > MAX_CHECKS
    || checks.some((check) => !check || typeof check.name !== 'string' || !check.name || check.name.length > 160
      || typeof check.expression !== 'string' || !check.expression.trim() || check.expression.length > 8_192)) {
    throw new Error('Invalid authored exercise definition.');
  }
  return checks;
}

/** Expressions are authored server data. Never accept a test or expression from a request. */
export function buildRunner(source, checks, nonce) {
  if (!/^[a-f0-9]{32}$/.test(nonce)) throw new Error('Invalid internal execution nonce.');
  const marker = `__JAVA_EDU_${nonce}__`;
  const lines = [
    source,
    '',
    'class Main {',
    '  public static void main(String[] args) {',
    '    final java.io.PrintStream report = java.lang.System.out;',
    `    report.println("\\n${marker}START");`,
  ];
  checks.forEach((check, index) => {
    lines.push(
      '    try {',
      `      boolean passed = (${check.expression});`,
      `      report.println("\\n${marker}CHECK:${index}:" + passed);`,
      '    } catch (java.lang.Throwable failure) {',
      `      report.println("\\n${marker}CHECK:${index}:ERROR");`,
      `      java.lang.System.err.println("검사 ${index + 1}: " + failure.getClass().getName() + ": " + failure.getMessage());`,
      '    }',
    );
  });
  lines.push(`    report.println("\\n${marker}END");`, '  }', '}');
  const code = lines.join('\n');
  if (encoder.encode(code).byteLength > MAX_RUNNER_BYTES) throw new Error('Authored runner exceeds its limit.');
  return code;
}

/** Require this invocation's complete, ordered protocol; arbitrary stdout is not a verdict. */
export function parseCheckOutput(output, checks, nonce) {
  const marker = `__JAVA_EDU_${nonce}__`;
  const expected = [`${marker}START`, ...checks.map((_, index) => `${marker}CHECK:${index}:`), `${marker}END`];
  const seen = [];
  const results = checks.map((check) => ({ name: check.name, passed: false }));
  let malformed = false;
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith(marker)) continue;
    const position = seen.length;
    if (position === 0 || position === expected.length - 1) {
      if (line !== expected[position]) malformed = true;
    } else {
      const suffix = line.slice(expected[position]?.length || 0);
      if (!expected[position] || !line.startsWith(expected[position]) || !['true', 'false', 'ERROR'].includes(suffix)) malformed = true;
      else if (results[position - 1]) results[position - 1].passed = suffix === 'true';
    }
    seen.push(line);
  }
  const complete = !malformed && seen.length === expected.length;
  let stdout = output;
  for (const line of seen) {
    const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // The harness deliberately adds one leading and trailing newline per marker.
    // Remove only that framing, preserving the learner's spaces and line breaks.
    stdout = stdout.replace(new RegExp(`(?:^|\\r?\\n)${escaped}(?:\\r?\\n|$)`), '');
  }
  return { complete, checks: complete ? results : results.map((check) => ({ ...check, passed: false })), stdout };
}

function resultFromProvider(raw, checks, nonce) {
  const parsed = parseCheckOutput(raw.stdout, checks, nonce);
  let status;
  if (raw.signal || raw.exitCode !== '0') {
    const compilerFailed = !raw.signal && raw.compilerOutput && (/\berror\s*:|\b\d+ errors?\b/i.test(raw.compilerOutput) || (!raw.stdout && !raw.stderr));
    status = compilerFailed ? 'compile_error' : 'runtime_error';
  } else if (!parsed.complete) status = 'runtime_error';
  else status = parsed.checks.every((check) => check.passed) ? 'passed' : 'failed';
  const safeChecks = status === 'passed' || status === 'failed' ? parsed.checks : checks.map((check) => ({ name: check.name, passed: false }));
  return {
    status,
    stdout: parsed.stdout,
    stderr: raw.stderr || (status === 'runtime_error' && !parsed.complete ? '검사 실행이 끝나지 않았습니다. main 추가, 강제 종료, 출력 변경 또는 실행 오류를 확인하세요.' : ''),
    compilerOutput: raw.compilerOutput,
    checks: safeChecks,
    passed: safeChecks.filter((check) => check.passed).length,
    total: checks.length,
  };
}

export async function handleApi(request, env = {}, options = {}) {
  const url = new URL(request.url);
  if (!['/api/runtime', '/api/execute'].includes(url.pathname)) return errorResponse(404, 'not_found', 'API 경로를 찾을 수 없습니다.');
  const expectedMethod = url.pathname === '/api/runtime' ? 'GET' : 'POST';
  if (request.method !== expectedMethod) return errorResponse(405, 'method_not_allowed', '지원하지 않는 요청 방식입니다.', undefined, { Allow: expectedMethod });
  const auth = authorize(request, env);
  if (auth.response) return auth.response;
  const state = options.state || defaultState;
  const now = options.now || Date.now;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  let provider = state.providers.get(fetchImpl);
  if (!provider) {
    provider = createProvider({ fetchImpl, now, timeoutMs: options.providerTimeoutMs });
    state.providers.set(fetchImpl, provider);
  }
  if (url.pathname === '/api/runtime') return json(await provider.getRuntime());

  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json' || (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity')) {
    return errorResponse(415, 'json_required', 'application/json 요청을 보내세요.');
  }
  let input;
  try {
    input = JSON.parse(await withDeadline((signal) => readLimitedText(request, MAX_REQUEST_BYTES, signal), request.signal, 5_000));
  } catch (error) {
    if (error instanceof BodyLimitError) return errorResponse(413, 'request_too_large', '요청은 UTF-8 기준 32 KiB 이하여야 합니다.');
    return errorResponse(400, 'invalid_json', 'JSON 요청을 읽을 수 없습니다.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return errorResponse(400, 'invalid_request', '실행 요청 객체가 필요합니다.');
  const { requestId, exerciseId, source, action } = input;
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) return errorResponse(400, 'invalid_request_id', '유효한 실행 요청 ID가 필요합니다.');
  if (typeof exerciseId !== 'string' || exerciseId.length > 100 || !['run', 'submit'].includes(action)
    || typeof source !== 'string' || !source.trim() || source.includes('\u0000')) {
    return errorResponse(400, 'invalid_request', '과제 ID, 코드와 실행 종류를 확인하세요.', requestId);
  }
  if (encoder.encode(source).byteLength > MAX_SOURCE_BYTES) return errorResponse(413, 'source_too_large', '코드는 UTF-8 기준 32 KiB 이하여야 합니다.', requestId);
  const definitions = options.exercises || exerciseDefinitions;
  const definition = definitions.find((item) => item.id === exerciseId);
  if (!definition) return errorResponse(404, 'exercise_not_found', '등록되지 않은 실습입니다.', requestId);
  let checks;
  let code;
  const nonce = crypto.randomUUID().replaceAll('-', '');
  try {
    checks = selectedChecks(definition, action);
    code = buildRunner(source, checks, nonce);
  } catch {
    return errorResponse(500, 'exercise_configuration', '실습 검사 설정을 확인해야 합니다.', requestId);
  }
  if (request.signal.aborted) return errorResponse(499, 'request_cancelled', '응답 대기를 취소했습니다.', requestId);
  const reservation = reserve(state, auth.identity, requestId, now());
  if (!reservation.release) return errorResponse(reservation.status, reservation.code, reservation.message, requestId, { 'Retry-After': '60' });
  const started = now();
  const metadata = {
    requestId,
    provider: PROVIDER_NAME,
    runtimeVersion: RUNTIME_VERSION,
    targetVersion: definition.minVersion,
  };
  try {
    const raw = await provider.compile(code, definition.minVersion, request.signal);
    return json({ ...metadata, ...resultFromProvider(raw, checks, nonce), durationMs: Math.max(0, now() - started) });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError('provider_error', '실행 결과를 처리할 수 없습니다.');
    return json({
      ...metadata,
      status: failure.code === 'provider_timeout' ? 'timeout' : 'provider_error',
      stdout: '', stderr: failure.message, compilerOutput: '',
      checks: checks.map((check) => ({ name: check.name, passed: false })),
      passed: 0, total: checks.length, durationMs: Math.max(0, now() - started),
      error: { code: failure.code, message: failure.message },
    }, failure.httpStatus);
  } finally {
    reservation.release();
  }
}
