import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { exerciseDefinitions } from '../exercises.mjs';
import { buildRunner, parseCheckOutput } from '../executor.mjs';
import { LocalError, requireRecord } from './errors.mjs';
import { runProcess, processEnvironment } from './process.mjs';
import { createJobWorkspace } from './workspace.mjs';
import { JAVA_VERSIONS, EXECUTION_NOTICE, DEPENDENCY_NOTICE } from './settings.mjs';
import { describeProject, loadProfessionalProjects, validateSubmittedFiles, materializeProject, mavenCommand, readTestReports, readTestDiagnostics } from './projects.mjs';
import { prepareServiceEnvironment } from './resources.mjs';

const REQUEST_ID = /^[A-Za-z0-9_-]{1,80}$/;
const CORE_TIMEOUT_MS = 5_000;
const COMPILE_TIMEOUT_MS = 20_000;
const MAVEN_TIMEOUT_MS = 120_000;
const PREPARE_TIMEOUT_MS = 300_000;

function validateRequest(input) {
  requireRecord(input);
  if (typeof input.requestId !== 'string' || !REQUEST_ID.test(input.requestId)) throw new LocalError('invalid_request_id', '유효한 실행 요청 ID가 필요합니다.');
  if (typeof input.exerciseId !== 'string' || input.exerciseId.length > 100 || !['run', 'submit'].includes(input.action)) throw new LocalError('invalid_request', '과제 ID와 실행 종류를 확인하세요.');
  if (input.runtimeVersion !== undefined && !JAVA_VERSIONS.includes(input.runtimeVersion)) throw new LocalError('invalid_runtime', 'Java 8·11·17·21 중 등록한 실행 JDK를 선택하세요.');
}

function processFailure(result) {
  if (result.reason === 'cancelled' || result.reason === 'parent_exited') return { status: 'runtime_error', error: { code: 'request_cancelled', message: '실행을 취소하고 자식 프로세스를 종료했습니다.' } };
  if (result.reason === 'timeout') return { status: 'timeout', error: { code: 'execution_timeout', message: '실행 시간 제한을 넘어 자식 프로세스를 종료했습니다.' } };
  if (result.reason === 'output_limit') return { status: 'runtime_error', error: { code: 'output_limit', message: '출력 제한을 넘어 실행을 종료했습니다.' } };
  return null;
}

export async function createLocalEngine({ dataRoot, projectRoot, settings, runner = runProcess, definitions = exerciseDefinitions, projects: injectedProjects, now = Date.now }) {
  await mkdir(dataRoot, { recursive: true });
  const projects = injectedProjects || await loadProfessionalProjects(projectRoot);
  const prepared = new Map();
  const seenRequests = new Map();
  let active = null;
  let closing = false;

  function chooseVersion(minimum, requested) {
    const configured = settings.snapshot().jdks;
    const version = requested ?? JAVA_VERSIONS.findLast((entry) => entry >= minimum && configured[entry]);
    if (!version || !configured[version] || version < minimum) throw new LocalError('jdk_required', `Java ${minimum} 이상의 등록된 JDK가 필요합니다.`, 409);
    return version;
  }

  function checkConsent() {
    if (!settings.snapshot().executionConsent) throw new LocalError('execution_consent_required', EXECUTION_NOTICE, 409);
  }

  async function exclusive(requestId, signal, operation) {
    if (closing) throw new LocalError('app_closing', '앱이 종료 중입니다.', 503);
    for (const [id, timestamp] of seenRequests) if (now() - timestamp > 120_000) seenRequests.delete(id);
    if (seenRequests.has(requestId)) throw new LocalError('duplicate_request', '이미 처리한 요청입니다. 새 실행 버튼으로 다시 시도하세요.', 409);
    if (active) throw new LocalError('execution_busy', '한 번에 하나의 실습을 실행할 수 있습니다. 현재 실행을 끝내거나 취소하세요.', 429);
    if (signal?.aborted) throw new LocalError('request_cancelled', '실행을 취소했습니다.', 499);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    seenRequests.set(requestId, now());
    const state = { requestId, controller, done: null };
    active = state;
    state.done = (async () => {
      try { return await operation(controller.signal); }
      finally {
        signal?.removeEventListener('abort', abort);
        active = null;
      }
    })();
    return state.done;
  }

  async function core(input, definition, signal) {
    const started = now();
    const version = chooseVersion(definition.minVersion, input.runtimeVersion);
    const jdk = await settings.verifyJdk(version);
    const checks = input.action === 'run' ? definition.sampleChecks : definition.checks;
    const nonce = randomBytes(16).toString('hex');
    const workspace = await createJobWorkspace(dataRoot);
    const base = { requestId: input.requestId, provider: 'Local JDK', runtimeVersion: jdk.version, targetVersion: definition.minVersion, stdout: '', stderr: '', compilerOutput: '', checks: checks.map((check) => ({ name: check.name, passed: false })), passed: 0, total: checks.length };
    try {
      await workspace.write('Main.java', buildRunner(input.source, checks, nonce));
      const env = processEnvironment(jdk.home, workspace.directory);
      const compileArgs = ['-J-Xmx256m', '-J-Dfile.encoding=UTF-8', '-J-Dstdout.encoding=UTF-8', '-J-Dstderr.encoding=UTF-8', '-J-Dsun.stdout.encoding=UTF-8', '-J-Dsun.stderr.encoding=UTF-8', '-encoding', 'UTF-8', ...(jdk.version === 8 ? ['-source', '8', '-target', '8'] : ['--release', String(definition.minVersion)]), '-d', '.', 'Main.java'];
      const compiled = await runner(jdk.javac, compileArgs, { cwd: workspace.directory, signal, env, timeoutMs: COMPILE_TIMEOUT_MS, memoryMiB: 512 });
      base.compilerOutput = compiled.stdout + compiled.stderr;
      const compileFailure = processFailure(compiled);
      if (compileFailure || compiled.exitCode !== 0) return { ...base, status: 'compile_error', ...compileFailure, durationMs: now() - started };
      const executed = await runner(jdk.java, ['-Xms16m', '-Xmx128m', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dsun.stderr.encoding=UTF-8', '-cp', '.', 'Main'], { cwd: workspace.directory, signal, env, timeoutMs: CORE_TIMEOUT_MS, memoryMiB: 512 });
      const failure = processFailure(executed);
      const parsed = parseCheckOutput(executed.stdout, checks, nonce);
      const complete = executed.exitCode === 0 && parsed.complete && !failure;
      const verdicts = complete ? parsed.checks : base.checks;
      return { ...base, status: complete ? (verdicts.every((check) => check.passed) ? 'passed' : 'failed') : 'runtime_error',
        ...failure, stdout: parsed.stdout, stderr: executed.stderr, checks: verdicts, passed: verdicts.filter((check) => check.passed).length, durationMs: now() - started };
    } finally { await workspace.dispose(); }
  }

  async function professional(input, project, signal, preparation = false) {
    const started = now();
    const serviceEnvironment = await prepareServiceEnvironment(project, signal);
    const version = chooseVersion(project.minVersion, input.runtimeVersion);
    const jdk = await settings.verifyJdk(version);
    const maven = settings.snapshot().maven;
    if (!maven) throw new LocalError('maven_required', 'Apache Maven 3.9 이상을 먼저 등록하세요.', 409);
    const key = JSON.stringify([project.exerciseId, version, jdk.home, maven.home, maven.version]);
    if (!preparation && !prepared.has(key)) throw new LocalError('dependencies_required', '먼저 이 실습의 환경 준비 버튼으로 라이브러리와 기준 테스트를 준비하세요.', 409);
    const workspace = await createJobWorkspace(dataRoot);
    try {
      const moduleDirectory = await materializeProject(workspace, projectRoot, project, input.files, { reference: preparation });
      const command = await mavenCommand({ workspace, moduleDirectory, dataRoot, jdk, maven, offline: !preparation });
      const executed = await runner(command.executable, command.args, { cwd: moduleDirectory, signal, env: { ...processEnvironment(jdk.home, workspace.directory), ...serviceEnvironment }, timeoutMs: preparation ? PREPARE_TIMEOUT_MS : MAVEN_TIMEOUT_MS, memoryMiB: 1536, maxProcesses: 16 });
      const failure = processFailure(executed);
      const checks = await readTestReports(moduleDirectory);
      const diagnostics = executed.exitCode !== 0 ? await readTestDiagnostics(moduleDirectory) : '';
      const passed = checks.filter((check) => check.passed).length;
      const success = !failure && executed.exitCode === 0 && checks.length > 0 && passed === checks.length;
      if (preparation && success) prepared.set(key, { exerciseId: project.exerciseId, runtimeVersion: version, jdkPath: jdk.home, mavenPath: maven.home, mavenVersion: maven.version });
      const result = { requestId: input.requestId, provider: 'Local Maven', runtimeVersion: jdk.version, targetVersion: project.minVersion,
        status: success ? 'passed' : checks.length ? 'failed' : /COMPILATION ERROR|compilation failure/i.test(executed.stdout + executed.stderr) ? 'compile_error' : 'runtime_error',
        ...failure, stdout: executed.stdout, stderr: [executed.stderr, diagnostics].filter(Boolean).join('\n'), compilerOutput: '', checks, passed, total: checks.length, durationMs: now() - started,
        ...(preparation ? { prepared: success, notice: DEPENDENCY_NOTICE } : {}) };
      if (!success && !failure && !checks.length) result.error = { code: preparation ? 'dependency_setup_failed' : 'maven_execution_failed', message: preparation ? '환경 준비를 완료하지 못했습니다. 네트워크·도구 버전과 Maven 로그를 확인하세요.' : '테스트 결과가 생성되지 않았습니다. 컴파일 로그를 확인하거나 환경 준비를 다시 실행하세요.' };
      return result;
    } finally { await workspace.dispose(); }
  }

  return {
    runtime() {
      const value = settings.snapshot();
      const versions = JAVA_VERSIONS.filter((version) => value.jdks[version]);
      return { mode: 'local', provider: 'Local JDK', available: versions.length > 0 && value.executionConsent,
        runtime: { javaVersion: versions.at(-1) || null, compiler: 'registered-local-javac' },
        supportedTargets: JAVA_VERSIONS.filter((target) => versions.some((version) => version >= target)),
        runtimes: JAVA_VERSIONS.map((version) => ({ javaVersion: version, available: Boolean(value.jdks[version]), path: value.jdks[version]?.home || null, source: value.jdks[version] ? value.jdks[version].source || 'external' : null })),
        maven: { available: Boolean(value.maven), version: value.maven?.version || null, path: value.maven?.home || null, source: value.maven ? value.maven.source || 'external' : null },
        bundledRuntime: value.bundledRuntime || null,
        consent: { accepted: value.executionConsent, notice: EXECUTION_NOTICE }, notice: EXECUTION_NOTICE,
        dependencyNotice: DEPENDENCY_NOTICE, reason: !versions.length ? 'jdk_required' : !value.executionConsent ? 'execution_consent_required' : null,
        preparedProjects: [...prepared.values()].filter((entry) => value.jdks[entry.runtimeVersion]?.home === entry.jdkPath && value.maven?.home === entry.mavenPath && value.maven?.version === entry.mavenVersion),
        limits: { concurrentJobs: 1, coreTimeoutMs: CORE_TIMEOUT_MS, projectTimeoutMs: MAVEN_TIMEOUT_MS, preparationTimeoutMs: PREPARE_TIMEOUT_MS, outputBytes: 128 * 1024 } };
    },
    async project(exerciseId) {
      const project = projects.find((item) => item.exerciseId === exerciseId);
      if (!project) throw new LocalError('exercise_not_found', '등록되지 않은 실무 실습입니다.', 404);
      return describeProject(projectRoot, project);
    },
    async execute(input, signal) {
      validateRequest(input);
      checkConsent();
      const definition = definitions.find((item) => item.id === input.exerciseId);
      if (definition) {
        if (typeof input.source !== 'string' || !input.source.trim() || input.source.includes('\0') || Buffer.byteLength(input.source) > 32 * 1024) throw new LocalError('invalid_source', '실습 코드는 UTF-8 기준 32 KiB 이하의 텍스트여야 합니다.');
        return exclusive(input.requestId, signal, (operationSignal) => core(input, definition, operationSignal));
      }
      const project = projects.find((item) => item.exerciseId === input.exerciseId);
      if (!project) throw new LocalError('exercise_not_found', '등록되지 않은 실습입니다.', 404);
      validateSubmittedFiles(project, input.files);
      return exclusive(input.requestId, signal, (operationSignal) => professional(input, project, operationSignal));
    },
    async prepare(input, signal) {
      validateRequest({ ...input, action: 'run' });
      checkConsent();
      const project = projects.find((item) => item.exerciseId === input.exerciseId);
      if (!project) throw new LocalError('exercise_not_found', '등록되지 않은 실무 실습입니다.', 404);
      return exclusive(input.requestId, signal, (operationSignal) => professional(input, project, operationSignal, true));
    },
    cancel(requestId) {
      if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw new LocalError('invalid_request_id', '실행 요청 ID를 확인하세요.');
      if (active?.requestId === requestId) { active.controller.abort(); return { cancelled: true }; }
      return { cancelled: false };
    },
    async cancelActive() { const current = active; current?.controller.abort(); await current?.done?.catch(() => {}); },
    async close() { closing = true; const current = active; current?.controller.abort(); await current?.done?.catch(() => {}); },
  };
}
