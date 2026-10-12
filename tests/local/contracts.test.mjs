import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLocalEngine } from '../../server/local/engine.mjs';
import { createJobWorkspace, safeRelativePath } from '../../server/local/workspace.mjs';
import { processEnvironment } from '../../server/local/process.mjs';
import { parseJavaVersion } from '../../server/local/settings.mjs';
import { validateSubmittedFiles, mavenCommand, readTestReports } from '../../server/local/projects.mjs';
import { createDesktopStorage } from '../../desktop/storage.cjs';
import { prepareServiceEnvironment, requiredServices } from '../../server/local/resources.mjs';

async function scratch(t) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'java-edu-local-test-'));
  t.after(async () => { const resolved = await realpath(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('java-edu-local-test-')); await rm(resolved, { recursive: true, force: true }); });
  return root;
}

const definition = { id: 'unit-lab', lessonId: 'unit', minVersion: 8, checks: [{ name: 'contract', expression: 'new Solution().value() == 7' }], sampleChecks: [{ name: 'sample', expression: 'new Solution().value() == 7' }] };
function mockSettings({ consent = true, versions = [8, 21] } = {}) {
  const jdks = Object.fromEntries(versions.map((version) => [version, { version, home: path.resolve(`jdk${version}`), java: path.resolve(`jdk${version}/bin/java.exe`), javac: path.resolve(`jdk${version}/bin/javac.exe`) }]));
  return { snapshot: () => ({ executionConsent: consent, jdks, maven: null }), verifyJdk: async (version) => jdks[version] };
}

test('path policy rejects traversal, drive paths, ADS and Windows device names', () => {
  for (const name of ['../answer.java', 'src/../../Main.java', 'C:/x.java', 'src\\x.java', '/tmp/x', 'src/x.java:stream', 'src/NUL.java', 'src/CON', 'src//X.java']) assert.throws(() => safeRelativePath(name));
  assert.equal(safeRelativePath('src/main/resources/mappers/OrderMapper.xml'), 'src/main/resources/mappers/OrderMapper.xml');
});

test('registered exercise allowlist rejects added/omitted files and learner POM', () => {
  const project = { editableFiles: ['src/main/java/X.java'], files: [{}], testFiles: [{}] };
  for (const supplied of [{}, { 'pom.xml': '<project/>' }, { 'src/main/java/X.java': '', 'evil.java': 'x' }, { 'src/main/java/X.java': '\0' }]) assert.throws(() => validateSubmittedFiles(project, supplied));
  assert.deepEqual(validateSubmittedFiles(project, { 'src/main/java/X.java': 'class X {}' }), { 'src/main/java/X.java': 'class X {}' });
});

test('core executes the trusted checks on the actual chosen JVM and removes workspace', async (t) => {
  const root = await scratch(t);
  const calls = [];
  let workspace;
  const runner = async (file, args, options) => {
    calls.push({ file, args, options });
    workspace = options.cwd;
    if (file.endsWith('javac.exe')) return { exitCode: 0, reason: 'exited', stdout: '', stderr: 'warning' };
    const source = await readFile(path.join(options.cwd, 'Main.java'), 'utf8');
    const nonce = source.match(/__JAVA_EDU_([a-f0-9]{32})__/)[1];
    return { exitCode: 0, reason: 'exited', stdout: `__JAVA_EDU_${nonce}__START\n__JAVA_EDU_${nonce}__CHECK:0:true\n__JAVA_EDU_${nonce}__END\n`, stderr: '' };
  };
  const engine = await createLocalEngine({ dataRoot: root, settings: mockSettings(), runner, definitions: [definition], projects: [] });
  const result = await engine.execute({ exerciseId: 'unit-lab', source: 'class Solution { int value() { return 7; } }', requestId: 'core-pass', action: 'submit' });
  assert.equal(result.status, 'passed');
  assert.equal(result.runtimeVersion, 21);
  assert.equal(result.targetVersion, 8);
  assert.equal(result.passed, 1);
  assert.ok(calls[0].args.includes('--release'));
  assert.equal(calls[0].args[calls[0].args.indexOf('--release') + 1], '8');
  await assert.rejects(readFile(path.join(workspace, 'Main.java')), /ENOENT/);
});

test('consent, unavailable JDK, unknown exercise and oversized code fail before process execution', async (t) => {
  const root = await scratch(t);
  let calls = 0;
  const runner = () => { calls++; throw new Error('Must not spawn'); };
  const input = { exerciseId: 'unit-lab', source: 'class Solution {}', action: 'run', requestId: 'invalid-case' };
  const noConsent = await createLocalEngine({ dataRoot: root, settings: mockSettings({ consent: false }), runner, definitions: [definition], projects: [] });
  await assert.rejects(noConsent.execute(input), { code: 'execution_consent_required' });
  assert.equal(noConsent.runtime().available, false);
  const noJdk = await createLocalEngine({ dataRoot: root, settings: mockSettings({ versions: [] }), runner, definitions: [definition], projects: [] });
  await assert.rejects(noJdk.execute(input), { code: 'jdk_required' });
  const engine = await createLocalEngine({ dataRoot: root, settings: mockSettings(), runner, definitions: [definition], projects: [] });
  await assert.rejects(engine.execute({ ...input, exerciseId: 'unknown' }), { code: 'exercise_not_found' });
  await assert.rejects(engine.execute({ ...input, source: '가'.repeat(12_000) }), { code: 'invalid_source' });
  await assert.rejects(engine.execute({ ...input, runtimeVersion: 22 }), { code: 'invalid_runtime' });
  assert.equal(calls, 0);
});

test('active work is bounded to one, duplicate requests reject and cancellation reaches child supervisor', async (t) => {
  const root = await scratch(t);
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const runner = (_file, _args, { signal }) => new Promise((resolve) => { started(); signal.addEventListener('abort', () => resolve({ exitCode: -1, reason: 'cancelled', stdout: '', stderr: '' }), { once: true }); });
  const engine = await createLocalEngine({ dataRoot: root, settings: mockSettings(), runner, definitions: [definition], projects: [] });
  const input = { exerciseId: 'unit-lab', source: 'class Solution {}', action: 'run', requestId: 'active' };
  const operation = engine.execute(input);
  await ready;
  await assert.rejects(engine.execute({ ...input, requestId: 'other' }), { code: 'execution_busy' });
  await assert.rejects(engine.execute(input), { code: 'duplicate_request' });
  assert.deepEqual(engine.cancel('active'), { cancelled: true });
  const result = await operation;
  assert.equal(result.error.code, 'request_cancelled');
  await engine.close();
  await assert.rejects(engine.execute({ ...input, requestId: 'closed' }), { code: 'app_closing' });
});

test('Maven command fixes launcher/settings/repository and never invokes a shell or learner command', async (t) => {
  const root = await scratch(t);
  const workspace = await createJobWorkspace(root);
  try {
    const maven = { home: path.join(root, 'Maven & 한글 %'), launcher: path.join(root, 'Maven & 한글 %/boot/plexus.jar'), configuration: path.join(root, 'Maven & 한글 %/bin/m2.conf') };
    const jdk = { java: path.join(root, 'Java & 한글 %/bin/java.exe') };
    const command = await mavenCommand({ workspace, moduleDirectory: path.join(workspace.directory, 'module'), dataRoot: root, jdk, maven });
    assert.equal(command.executable, jdk.java);
    assert.ok(command.args.includes('--offline'));
    assert.ok(command.args.includes('-DforkCount=0'));
    assert.equal(command.args.at(-1), 'test');
    assert.ok(command.args.includes(maven.launcher));
    assert.equal(command.args.filter((arg) => arg === '--settings' || arg === '--global-settings').length, 2);
    const settings = await readFile(command.args[command.args.indexOf('--settings') + 1], 'utf8');
    assert.match(settings, /<mirrorOf>\*<\/mirrorOf>/);
    assert.match(settings, /https:\/\/repo.maven.apache.org\/maven2/);
  } finally { await workspace.dispose(); }
});

test('Surefire reports distinguish passing, failing and skipped behavior without evaluating XML entities', async (t) => {
  const root = await scratch(t);
  const reports = path.join(root, 'target/surefire-reports');
  await mkdir(reports, { recursive: true });
  const file = path.join(reports, 'TEST-edu.lab.ContractTest.xml');
  await writeFile(file, '<testsuite><testcase name="happy" classname="Example"/><testcase name="broken" classname="Example"><failure message="bad"/></testcase><testcase name="disabled" classname="Example"><skipped/></testcase></testsuite>');
  const checks = await readTestReports(root);
  assert.deepEqual(checks.map((entry) => entry.passed), [true, false, false]);
  assert.equal(checks[2].skipped, true);
  await writeFile(file, '<!DOCTYPE test [<!ENTITY leak SYSTEM "file:///secret">]><testsuite/>');
  await assert.rejects(readTestReports(root), { code: 'invalid_test_report' });
});

test('desktop storage survives new origins/restarts and cannot address arbitrary files', async (t) => {
  const root = await scratch(t);
  const first = createDesktopStorage(root);
  first.setItem('java-edu:progress:v1', '{"lesson":"oop"}');
  assert.equal(createDesktopStorage(root).getItem('java-edu:progress:v1'), '{"lesson":"oop"}');
  assert.throws(() => first.setItem('../settings.json', 'bad'));
  assert.throws(() => first.setItem('java-edu:test', 'x'.repeat(8 * 1024 * 1024)));
  first.removeItem('java-edu:progress:v1');
  assert.equal(createDesktopStorage(root).getItem('java-edu:progress:v1'), null);
});

test('toolchain parsing separates old/new Java version forms and strips inherited process options', () => {
  assert.equal(parseJavaVersion('openjdk version "1.8.0_265"'), 8);
  assert.equal(parseJavaVersion('javac 21.0.12.1'), 21);
  assert.equal(parseJavaVersion('java version "17.0.1"'), 17);
  const env = processEnvironment(path.resolve('jdk'), path.resolve('tmp'));
  for (const key of ['JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'CLASSPATH', 'MAVEN_OPTS', 'MAVEN_ARGS', 'HTTP_PROXY', 'GITHUB_TOKEN']) assert.equal(Object.hasOwn(env, key), false);
});

test('optional services use fixed training loopback addresses and reject missing infrastructure before execution', async () => {
  const project = { profile: { resources: [{ type: 'redis', host: 'attacker.invalid', port: 6379 }, { type: 'kafka' }] } };
  assert.deepEqual(requiredServices(project).map(({ host, port }) => ({ host, port })), [{ host: '127.0.0.1', port: 16379 }, { host: '127.0.0.1', port: 19092 }]);
  await assert.rejects(prepareServiceEnvironment(project, undefined, async () => false), { code: 'unsupported_resources', httpStatus: 409 });
  assert.deepEqual(await prepareServiceEnvironment(project, undefined, async () => true), { JAVA_EDU_REDIS_HOST: '127.0.0.1', JAVA_EDU_REDIS_PORT: '16379', JAVA_EDU_KAFKA_BOOTSTRAP_SERVERS: '127.0.0.1:19092' });
  assert.deepEqual(await prepareServiceEnvironment({ profile: { resources: [{ type: 'h2' }] } }), {});
});
