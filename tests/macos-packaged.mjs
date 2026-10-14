import assert from 'node:assert/strict';
import { access, lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { lessons } from '../dist/data/curriculum.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';

// Production packaged app only. This harness observes real APIs and real tools;
// it never overrides dialogs, network, clipboard, JVM/Maven, HOME or userData.
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const option = name => process.argv[process.argv.indexOf(name) + 1];
const appPath = path.resolve(option('--app'));
const artifacts = path.resolve(option('--artifacts'));
const expectedUserData = path.resolve(option('--user-data'));
const ownershipToken = option('--ownership-token');
const kind = option('--kind');
const arch = option('--arch');
const marker = '.java-edu-macos-qa-owner';
const expectedVersion = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const evidence = { startedAt: new Date().toISOString(), kind, arch, appPath, expectedUserData,
  scope: 'Actual DMG/ZIP production packaged app; real bundled JVM/Maven and loopback APIs; no mocks or home/data overrides.',
  notExecuted: ['Gatekeeper downloaded-file/quarantine approval', 'Developer ID notarization', 'Physical Mac user playtest', 'Optional execution cancellation'] };
const results = [];
const pageErrors = [];
const apiRequests = [];
const coreCases = [8, 21].map(version => lessons.find(lesson => lesson.minVersion === version));
const project = professionalLessons.find(lesson => lesson.id === 'tx-proxy');
const projectExercise = professionalExercises.find(exercise => exercise.id === project.exerciseId);
const progressKey = 'java-edu:progress:v1';
const preferencesKey = 'java-edu:editor-preferences:v1';
const inside = (child, parent) => path.relative(parent, child) !== '' && !path.relative(parent, child).startsWith('..') && !path.isAbsolute(path.relative(parent, child));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const exists = file => access(file).then(() => true, () => false);
let app;
let page;
let runtime;
let launchAttempted = false;
let childClosed = true;

async function eventually(read, expected, message, timeout = 15000) {
  const until = Date.now() + timeout;
  let value;
  while (Date.now() < until) {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await pause(100);
  }
  assert.fail(message + ': ' + JSON.stringify(value));
}
const editor = () => page.locator('#code-editor [role="textbox"]');
const badge = type => page.locator('#lesson-achievements [data-achievement="' + type + '"]').getAttribute('data-complete');
const stored = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.javaEduDesktop.storage.getItem(key)])), [progressKey, preferencesKey]);
const progress = async () => JSON.parse((await stored())[progressKey] || '{}');

async function capture(name) {
  await page.locator('#toast.is-visible').waitFor({ state: 'hidden', timeout: 10000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Do not hide/move UI or overwrite styles for screenshots.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const file = path.join(artifacts, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  evidence.captures ??= [];
  evidence.captures.push({ name, file, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollX, scrollY, hash: location.hash })) });
}

async function check(name, action) {
  const start = Date.now();
  console.log('START ' + kind + ' ' + name);
  try {
    await action();
    results.push({ name, status: 'PASS', durationMs: Date.now() - start });
    console.log('PASS ' + kind + ' ' + name);
  } catch (error) {
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - start });
    if (page) await capture('failure-' + name).catch(() => {});
    throw error;
  }
}

async function launch() {
  const env = { ...process.env };
  const forbidden = new Set(['PATH', 'JAVA_HOME', 'JDK_HOME', 'MAVEN_HOME', 'M2_HOME', 'JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS',
    'JDK_JAVA_OPTIONS', 'MAVEN_OPTS', 'JAVA_EDU_QA_DATA', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'CLASSPATH']);
  for (const key of Object.keys(env)) if (forbidden.has(key.toUpperCase()) || key.startsWith('DYLD_')) delete env[key];
  env.PATH = '';
  launchAttempted = true;
  childClosed = false;
  app = await electron.launch({ executablePath: path.join(appPath, 'Contents/MacOS/Java Edu'), args: [], env, timeout: 90000 });
  app.context().on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push({ origin: url.origin, path: url.pathname, method: request.method() });
  });
  page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.locator('#workspace-grid').waitFor({ state: 'visible', timeout: 60000 });
  const facts = await app.evaluate(({ app, BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { packaged: app.isPackaged, name: app.getName(), version: app.getVersion(), platform: process.platform, arch: process.arch,
      executable: app.getPath('exe'), appPath: app.getAppPath(), userData: app.getPath('userData'), home: app.getPath('home'),
      preferences: Object.fromEntries(['contextIsolation', 'nodeIntegration', 'sandbox', 'webSecurity', 'allowRunningInsecureContent'].map(key => [key, prefs[key]])) };
  });
  evidence.applications ??= [];
  evidence.applications.push(facts);
  assert.equal(facts.packaged, true);
  assert.equal(facts.version, expectedVersion);
  assert.equal(facts.platform, 'darwin');
  assert.equal(facts.arch, arch, 'app runs native target arch');
  assert.equal(facts.executable, path.join(appPath, 'Contents/MacOS/Java Edu'));
  assert.equal(facts.appPath, path.join(appPath, 'Contents/Resources/app.asar'));
  assert.equal(facts.userData, expectedUserData, 'uses actual production default user data');
  for (const [key, value] of Object.entries({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false })) assert.equal(facts.preferences[key], value);
  const environment = await app.evaluate((_electron, names) => ({
    selected: Object.fromEntries(names.map(name => [name, process.env[name] ?? null])),
    dyld: Object.keys(process.env).filter(key => key.startsWith('DYLD_'))
  }), [...forbidden]);
  assert.equal(environment.selected.PATH, '');
  assert.ok(Object.entries(environment.selected).filter(([key]) => key !== 'PATH').every(([, value]) => value === null));
  assert.deepEqual(environment.dyld, []);
  evidence.appEnvironment = environment;
  runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
  await verifyRuntime(runtime);
}

async function verifyRuntime(value) {
  assert.equal(value.mode, 'local');
  assert.deepEqual(value.supportedTargets, [8, 11, 17, 21]);
  assert.deepEqual(value.runtimes.filter(item => item.available).map(item => item.javaVersion), [21]);
  const jdk = value.runtimes.find(item => item.javaVersion === 21);
  assert.equal(jdk.source, 'bundled');
  assert.equal(value.maven.source, 'bundled');
  assert.equal(value.maven.available, true);
  assert.ok(value.bundledRuntime?.id);
  assert.deepEqual(value.bundledRuntime.javaVersions, [21]);
  assert.equal(jdk.path, path.join(appPath, 'Contents/Resources/toolchains/jdks/21/Contents/Home'));
  assert.ok(inside(value.maven.path, path.join(appPath, 'Contents/Resources/toolchains')));
  for (const file of ['bin/java', 'bin/javac']) {
    const info = await lstat(path.join(jdk.path, file));
    assert.ok(info.isFile() && (info.mode & 0o111) !== 0, file + ' is executable');
  }
  assert.ok(await exists(path.join(value.maven.path, 'boot')));
}

async function openLesson(lesson, step = 'lab') {
  await page.evaluate(hash => { location.hash = hash; }, 'lesson=' + lesson.id + '&step=' + step + '&version=21');
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), 'lesson selected');
  await eventually(() => page.locator('[data-step="' + step + '"]').getAttribute('aria-selected'), 'true', 'stage selected');
}
async function settings() {
  await page.locator('#desktop-settings-open').click();
  await page.locator('#desktop-settings-dialog').waitFor({ state: 'visible' });
  await eventually(() => page.locator('#execution-consent').isEnabled(), true, 'settings loaded');
}
async function closeSettings() {
  await page.locator('#desktop-settings-dialog [data-close-dialog="desktop-settings-dialog"]').first().click();
  await page.locator('#desktop-settings-dialog').waitFor({ state: 'hidden' });
}
async function quiz(lesson) {
  await openLesson(lesson, 'quiz');
  for (const question of lesson.quiz) await page.locator('#quiz-form [name="quiz-' + question.id + '"][value="' + question.correctIndex + '"]').check();
  await page.locator('#quiz-submit').click();
  await eventually(() => badge('quiz'), 'true', 'quiz achievement persisted');
  await openLesson(lesson);
}
async function execute(button, expectedStatus = 'passed', timeout = 90000) {
  const pathname = button === '#prepare-project' ? '/api/local/prepare' : '/api/execute';
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === pathname && response.request().method() === 'POST', { timeout });
  void pending.catch(() => {});
  await page.locator(button).click();
  const response = await pending;
  const result = await response.json();
  const request = response.request().postDataJSON();
  evidence.executions ??= [];
  evidence.executions.push({ request, httpStatus: response.status(), result });
  await eventually(() => page.locator('#execution-output').getAttribute('data-status'), status => status !== 'running', 'result rendered');
  assert.equal(response.status(), 200);
  assert.equal(result.provider, request.exerciseId === project.exerciseId ? 'Local Maven' : 'Local JDK');
  assert.equal(result.runtimeVersion, 21);
  assert.equal(result.status, expectedStatus, result.stderr || result.compilerOutput || result.stdout);
  assert.ok(result.total > 0);
  if (expectedStatus === 'passed') assert.ok(result.passed === result.total && result.checks.every(check => check.passed));
  else assert.ok(result.passed < result.total && result.checks.some(check => !check.passed), 'actual failing tests returned');
  return { result, request };
}
async function fillProject(reference) {
  const files = {};
  for (const file of project.professionalExercise.files.filter(item => item.editable)) {
    files[file.path] = reference ? await readFile(path.join(root, 'curriculum/professional', file.referencePath), 'utf8') : projectExercise.files.find(item => item.path === file.path).source;
    await page.locator('#project-file-tabs [data-file-path="' + file.path + '"]').click();
    await editor().fill(files[file.path]);
  }
  return files;
}

async function main() {
  assert.equal(process.platform, 'darwin');
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'production-data gate is limited to ephemeral GitHub macOS CI');
  assert.ok(['dmg', 'zip'].includes(kind));
  assert.ok(['x64', 'arm64'].includes(arch));
  assert.equal((await readFile(path.join(expectedUserData, marker), 'utf8')).trim(), ownershipToken, 'orchestrator owns fresh production data');
  await mkdir(artifacts, { recursive: true });
  const solutions = JSON.parse(await readFile(path.join(root, 'examples/solutions.json'), 'utf8'));
  await launch();
  const firstOrigin = new URL(page.url()).origin;
  await check('first-launch-bundled-tools-before-consent', async () => {
    evidence.runtimeBeforeConsent = runtime;
    assert.equal(runtime.consent.accepted, false);
    assert.equal(runtime.available, false);
    await openLesson(coreCases[0]);
    assert.equal(await page.locator('#run-code').isDisabled(), true);
    assert.equal(await page.locator('#submit-code').isDisabled(), true);
    await settings();
    assert.equal(await page.locator('#execution-consent').isChecked(), false);
    assert.deepEqual(await page.locator('#desktop-bundle-status .settings-bundle-tools li span').allTextContents(), ['앱에 포함', '앱에 포함']);
    assert.equal(apiRequests.filter(item => item.method === 'POST' && ['/api/execute', '/api/local/prepare'].includes(item.path)).length, 0);
    await capture('first-launch-settings');
    await page.locator('#execution-consent').check();
    await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, true, 'explicit consent saved');
    await closeSettings();
    await eventually(() => page.locator('#run-code').isEnabled(), true, 'bundled tools enabled');
  });
  for (const lesson of coreCases) await check('core-jvm21-target' + lesson.minVersion, async () => {
    await openLesson(lesson);
    await editor().fill(solutions[lesson.exerciseId]);
    await quiz(lesson);
    const { result, request } = await execute('#submit-code');
    assert.equal(result.targetVersion, lesson.minVersion);
    assert.equal(request.source, solutions[lesson.exerciseId]);
    assert.equal(await badge('lab'), 'true');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('core-target' + lesson.minVersion + '-passed');
  });
  await check('spring-h2-online-prepare-preserves-draft-no-achievement', async () => {
    await openLesson(project);
    await eventually(() => page.locator('#prepare-project').isEnabled(), true, 'prepare enabled');
    assert.equal(await page.locator('#submit-code').isDisabled(), true);
    const first = projectExercise.files.find(file => file.editable);
    await page.locator('#project-file-tabs [data-file-path="' + first.path + '"]').click();
    await editor().fill(first.source + '\n// preparation draft sentinel\n');
    await openLesson(project, 'theory');
    await openLesson(project);
    const before = (await progress()).fileDrafts;
    const { result, request } = await execute('#prepare-project', 'passed', 420000);
    assert.equal(result.targetVersion, 17);
    assert.equal(result.prepared, true);
    assert.equal(request.source, undefined);
    assert.equal(request.files, undefined);
    assert.deepEqual((await progress()).fileDrafts, before);
    assert.equal(await badge('quiz'), 'false');
    assert.equal(await badge('lab'), 'false');
    await eventually(() => page.locator('#project-preparation-state').getAttribute('data-prepared'), 'true', 'preparation stored');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('spring-h2-prepared');
  });
  await check('spring-h2-starter-fails-without-completion', async () => {
    const expected = await fillProject(false);
    const { result, request } = await execute('#submit-code', 'failed', 240000);
    assert.deepEqual(request.files, expected);
    assert.equal(result.targetVersion, 17);
    assert.equal(await badge('lab'), 'false');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('spring-h2-starter-failed');
  });
  await check('spring-h2-reference-offline-submit', async () => {
    const expected = await fillProject(true);
    await quiz(project);
    const { result, request } = await execute('#submit-code', 'passed', 240000);
    assert.deepEqual(request.files, expected);
    assert.equal(Object.hasOwn(request.files, 'pom.xml'), false);
    assert.equal(result.targetVersion, 17);
    assert.equal(await badge('lab'), 'true');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('spring-h2-reference-passed');
  });
  await check('quit-relaunch-progress-theme-core-project-drafts', async () => {
    const core = coreCases[0];
    const sentinel = 'macos ' + kind + ' restart ' + randomUUID();
    await openLesson(core);
    await editor().fill(solutions[core.exerciseId] + '\n// ' + sentinel + '\n');
    await page.locator('#editor-theme-select').selectOption('contrast');
    await openLesson(project);
    const first = projectExercise.files.find(file => file.editable);
    await page.locator('#project-file-tabs [data-file-path="' + first.path + '"]').click();
    await editor().fill(first.source + '\n// ' + sentinel + ' project\n');
    await openLesson(coreCases[1], 'theory');
    const before = await stored();
    const registered = await page.evaluate(() => window.javaEduDesktop.getSettings());
    await app.close(); childClosed = true; app = null;
    await launch();
    evidence.origins = [firstOrigin, new URL(page.url()).origin];
    // A new ephemeral port normally changes; durability must not depend on it.
    const after = await stored();
    assert.equal(after[preferencesKey], before[preferencesKey]);
    for (const field of ['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'notes']) assert.deepEqual(JSON.parse(after[progressKey])[field], JSON.parse(before[progressKey])[field], field + ' persists');
    assert.equal(runtime.consent.accepted, true);
    assert.deepEqual(runtime.bundledRuntime, registered.bundledRuntime);
    evidence.runtimeAfterRestart = runtime;
    await openLesson(core);
    assert.equal(await page.locator('#editor-theme-select').inputValue(), 'contrast');
    await editor().press('Meta+End');
    await eventually(() => editor().innerText(), text => text.includes(sentinel), 'core draft restored in actual editor');
    await openLesson(project);
    await page.locator('#project-file-tabs [data-file-path="' + first.path + '"]').click();
    await editor().press('Meta+End');
    await eventually(() => editor().innerText(), text => text.includes(sentinel + ' project'), 'project draft restored in actual editor');
    assert.equal(await page.locator('#prepare-project').getAttribute('data-prepared'), 'false', 'runtime preparation resets across quit');
    await openLesson(coreCases[1]);
    assert.equal(await badge('quiz'), 'true');
    assert.equal(await badge('lab'), 'true');
    await capture('restarted-progress');
  });
  assert.deepEqual(pageErrors, []);
  assert.ok(apiRequests.every(request => new URL(request.origin).hostname === '127.0.0.1'));
}
try { await main(); }
catch (error) {
  if (!results.some(result => result.status === 'FAIL')) results.push({ name: 'preflight-or-launch', status: 'FAIL', message: error.message });
  evidence.error = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  if (app) {
    try { await app.close(); childClosed = true; evidence.closed = true; }
    catch (error) { evidence.closeError = error.message; process.exitCode = 1; }
  } else evidence.closed = !launchAttempted || childClosed;
  evidence.finishedAt = new Date().toISOString();
  Object.assign(evidence, { results, pageErrors, apiRequests, status: process.exitCode ? 'FAIL' : 'PASS' });
  await mkdir(artifacts, { recursive: true });
  await writeFile(path.join(artifacts, 'runtime-results.json'), JSON.stringify(evidence, null, 2));
}
