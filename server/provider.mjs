/** The only outbound code-execution provider used by the private prototype. */
export const PROVIDER_NAME = 'Wandbox';
export const COMPILER = 'openjdk-jdk-21+35';
export const RUNTIME_VERSION = 21;
export const SUPPORTED_TARGETS = Object.freeze([8, 11, 17, 21]);
export const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
export const PROVIDER_TIMEOUT_MS = 15_000;
const LIST_URL = 'https://wandbox.org/api/list.json';
const COMPILE_URL = 'https://wandbox.org/api/compile.json';
const MAX_LIST_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder();

export class ProviderError extends Error {
  constructor(code, message, httpStatus = 502) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class BodyLimitError extends Error {
  constructor() {
    super('Response or request body exceeds the byte limit.');
    this.name = 'BodyLimitError';
  }
}

/** Read streams incrementally: Content-Length alone does not enforce a limit. */
export async function readLimitedText(message, maxBytes, signal) {
  const declaredSize = message.headers.get('content-length');
  if (declaredSize && /^\d+$/.test(declaredSize) && Number(declaredSize) > maxBytes) {
    void message.body?.cancel().catch(() => {});
    throw new BodyLimitError();
  }
  if (!message.body) return '';
  const reader = message.body.getReader();
  const chunks = [];
  let length = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (signal?.aborted) throw signal.reason;
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        cancel();
        throw new BodyLimitError();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/** Aborting the HTTP wait does not promise that the remote JVM was terminated. */
export async function withDeadline(operation, parentSignal, timeoutMs) {
  const controller = new AbortController();
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const fail = (error) => {
    if (controller.signal.aborted) return;
    controller.abort(error);
    rejectAbort(error);
  };
  const onCancel = () => fail(new ProviderError('request_cancelled', '응답 대기를 취소했습니다. 외부 실행의 종료는 보장하지 않습니다.', 499));
  const timer = setTimeout(() => fail(new ProviderError('provider_timeout', '실행 결과 대기 시간이 초과되었습니다. 외부 실행의 종료는 보장하지 않습니다.', 504)), timeoutMs);
  parentSignal?.addEventListener('abort', onCancel, { once: true });
  if (parentSignal?.aborted) onCancel();
  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw controller.signal.reason;
        return operation(controller.signal);
      }),
      aborted,
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onCancel);
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError('provider_invalid_response', '실행 제공자의 응답 형식을 확인할 수 없습니다.');
  }
}

function normalizeResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.status !== 'string' || typeof value.program_output !== 'string') {
    throw new ProviderError('provider_invalid_response', '실행 제공자의 결과 형식을 확인할 수 없습니다.');
  }
  for (const name of ['signal', 'program_error', 'program_message', 'compiler_output', 'compiler_error', 'compiler_message']) {
    if (value[name] !== undefined && typeof value[name] !== 'string') {
      throw new ProviderError('provider_invalid_response', '실행 제공자의 결과 형식을 확인할 수 없습니다.');
    }
  }
  const result = {
    exitCode: value.status,
    signal: value.signal || '',
    stdout: value.program_output,
    stderr: value.program_error || '',
    compilerOutput: value.compiler_message || [value.compiler_output, value.compiler_error].filter(Boolean).join('\n'),
  };
  if (encoder.encode(result.stdout + result.stderr + result.compilerOutput).byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new ProviderError('provider_output_limit', '실행 출력이 64 KiB 제한을 초과했습니다. 출력을 줄여 다시 실행하세요.');
  }
  return result;
}

export function createProvider({ fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = PROVIDER_TIMEOUT_MS } = {}) {
  let cachedRuntime;
  let expiresAt = 0;
  let pendingRuntime;

  async function fetchJson(url, init, limit, signal) {
    let response;
    try {
      // Never forward visitor identity, cookies, arbitrary URLs, or request headers.
      response = await fetchImpl(url, { ...init, redirect: 'error', signal });
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw new ProviderError('provider_unreachable', '실행 제공자에 연결할 수 없습니다.', 503);
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (response.status === 429) throw new ProviderError('provider_rate_limit', '실행 제공자가 요청을 제한했습니다. 잠시 후 다시 실행하세요.', 503);
      throw new ProviderError('provider_unavailable', '실행 제공자가 현재 요청을 처리할 수 없습니다.', 503);
    }
    try {
      return parseJson(await readLimitedText(response, limit, signal));
    } catch (error) {
      if (error instanceof BodyLimitError) throw new ProviderError('provider_output_limit', '실행 출력이 응답 제한을 초과했습니다. 출력을 줄여 다시 실행하세요.');
      if (error instanceof ProviderError) throw error;
      if (signal.aborted) throw signal.reason;
      throw new ProviderError('provider_invalid_response', '실행 제공자의 응답을 읽을 수 없습니다.');
    }
  }

  async function getRuntime() {
    if (cachedRuntime && now() < expiresAt) return cachedRuntime;
    if (pendingRuntime) return pendingRuntime;
    // Metadata is shared; one cancelled browser request must not cancel other readers.
    pendingRuntime = (async () => {
      let available = false;
      let reason;
      try {
        const list = await withDeadline((signal) => fetchJson(LIST_URL, { method: 'GET', headers: { Accept: 'application/json' } }, MAX_LIST_BYTES, signal), undefined, Math.min(timeoutMs, 5_000));
        if (!Array.isArray(list)) throw new ProviderError('provider_invalid_response', '컴파일러 목록을 확인할 수 없습니다.');
        available = list.some((item) => item?.name === COMPILER && item.language === 'Java' && item['compiler-option-raw'] === true);
        if (!available) reason = 'compiler_unavailable';
      } catch (error) {
        reason = error instanceof ProviderError ? error.code : 'provider_unavailable';
      }
      cachedRuntime = {
        provider: PROVIDER_NAME,
        available,
        runtime: { javaVersion: RUNTIME_VERSION, compiler: COMPILER },
        supportedTargets: available ? [...SUPPORTED_TARGETS] : [],
        checkedAt: new Date(now()).toISOString(),
        notice: '실제 실행은 Java 21이며, 대상 버전은 --release로 문법·API를 검사합니다. 코드를 Wandbox로 전송하며 제공자가 코드를 기록할 수 있습니다. 개인정보·비밀정보를 입력하지 마세요.',
        ...(reason ? { reason } : {}),
      };
      expiresAt = now() + (available ? 5 * 60_000 : 15_000);
      return cachedRuntime;
    })();
    try { return await pendingRuntime; } finally { pendingRuntime = undefined; }
  }

  async function compile(code, targetVersion, parentSignal) {
    if (!SUPPORTED_TARGETS.includes(targetVersion)) throw new ProviderError('unsupported_target', '지원하지 않는 Java 대상 버전입니다.', 400);
    return withDeadline(async (signal) => {
      const runtime = await getRuntime();
      if (signal.aborted) throw signal.reason;
      if (!runtime.available) throw new ProviderError('compiler_unavailable', '현재 Java 실행 환경을 사용할 수 없습니다.', 503);
      const raw = await fetchJson(COMPILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          compiler: COMPILER,
          code,
          'compiler-option-raw': `--release\n${targetVersion}`,
          options: '',
          stdin: '',
          save: false,
        }),
      }, MAX_PROVIDER_RESPONSE_BYTES, signal);
      return normalizeResult(raw);
    }, parentSignal, timeoutMs);
  }

  return { getRuntime, compile };
}
