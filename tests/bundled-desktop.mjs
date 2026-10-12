import assert from 'node:assert/strict';
import { access, lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';

// Manual packaged-app gate. The release owner installs/extracts the package and
// records absence of pre-existing user data before authorizing this script.
// This script never installs, uninstalls, deletes data, redirects userData,
// registers external tools, or replaces API/JVM/Maven/clipboard responses.
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const kind = option('--kind', process.env.BUNDLED_PACKAGE_KIND);
const executableInput = option('--executable', process.env.BUNDLED_APP_EXE);
const executablePath = executableInput && path.resolve(executableInput);
const artifactsRoot = path.join(root, 'work/bundled-desktop-qa');
const artifacts = path.join(artifactsRoot, kind === 'zip' || kind === 'nsis' ? kind : 'invalid-input');
const preflightPath = path.join(artifactsRoot, 'preflight.json');
const progressKey = 'java-edu:progress:v1';
const preferencesKey = 'java-edu:editor-preferences:v1';
const coreCases = [8, 11, 17, 21].map(version => coreLessons.find(lesson => lesson.minVersion === version));
const project = professionalLessons.find(lesson => lesson.id === 'tx-proxy');
const projectExercise = professionalExercises.find(exercise => exercise.id === project.exerciseId);
const results = [];
const errors = [];
const apiRequests = [];
const evidence = {
  startedAt: new Date().toISOString(), packageKind: kind, executablePath,
  scope: 'Actual production packaged Electron and bundled JDK/Maven; no API, Java, Maven or clipboard mocks. Folder-dialog calls are forbidden, counted and rejected without supplying a path.',
  excluded: ['Native folder dialog operation', 'OS clipboard', 'SmartScreen downloaded-file flow', 'Physical mobile devices'],
};
let app;
let page;
let runtime;
let userData;

const normalize = value => path.resolve(value).toLowerCase();
const inside = (child, parent) => normalize(child).startsWith(`${normalize(parent)}${path.sep}`);
const exists = file => access(file).then(() => true, () => false);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const editor = () => page.locator('#code-editor [role="textbox"]');
const badge = type => page.locator(`#lesson-achievements [data-achievement="${type}"]`).getAttribute('data-complete');
const executionCount = () => apiRequests.filter(request => request.method === 'POST' && ['/api/execute', '/api/local/prepare'].includes(request.path)).length;

async function eventually(read, expected, message, timeout = 15000) {
  const until = Date.now() + timeout;
  let value;
  while (Date.now() < until) {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await pause(100);
  }
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}

async function captureGeometry() {
  // Observe the actual viewport. Do not scroll, disable motion, change styles,
  // blur the editor, or alter focus to obtain a more attractive screenshot.
  return page.evaluate(() => {
    const number = value => Math.round(value * 100) / 100;
    const selectors = ['#site-header', '#intro', '.workspace-heading', '#workspace-grid', '#curriculum-sidebar', '#lesson-card', '#lesson-title', '#lesson-achievements', '.lesson-tabs', '#lesson-panel', '#code-editor', '#code-editor .cm-scroller', '#reference-column', '#desktop-settings-dialog[open]', '.settings-bundle-tools', '#desktop-settings-dialog .dialog-actions'];
    return {
      hash: location.hash,
      activeStep: document.querySelector('[data-step][aria-selected="true"]')?.dataset.step,
      scrollX, scrollY, width: innerWidth, height: innerHeight,
      rootFont: getComputedStyle(document.documentElement).fontSize,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      visualViewport: visualViewport && { width: number(visualViewport.width), height: number(visualViewport.height), pageTop: number(visualViewport.pageTop), offsetTop: number(visualViewport.offsetTop), scale: visualViewport.scale },
      nodes: Object.fromEntries(selectors.map(selector => {
        const node = document.querySelector(selector);
        if (!node || !node.getClientRects().length) return [selector, null];
        const rect = node.getBoundingClientRect();
        return [selector, { x: number(rect.x), y: number(rect.y), width: number(rect.width), height: number(rect.height), scrollLeft: number(node.scrollLeft), scrollTop: number(node.scrollTop), scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight }];
      })),
    };
  });
}

async function stableCaptureGeometry(samples) {
  const started = Date.now();
  let previous;
  let stableSince = started;
  while (Date.now() - started < 10000) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const geometry = await captureGeometry();
    samples.push({ elapsedMs: Date.now() - started, geometry });
    const fingerprint = JSON.stringify(geometry);
    if (fingerprint !== previous) stableSince = Date.now();
    else if (Date.now() - stableSince >= 600) return geometry;
    previous = fingerprint;
    await pause(100);
  }
  assert.fail('viewport/scroll/major bounds did not remain stable for 600ms within 10s');
}

async function capture(name) {
  const record = { name, file: path.join(artifacts, `${name}.png`), startedAt: new Date().toISOString(), samples: [] };
  evidence.captures ??= [];
  evidence.captures.push(record);
  await page.locator('#toast.is-visible').waitFor({ state: 'hidden', timeout: 6000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  record.before = await stableCaptureGeometry(record.samples);
  await page.screenshot({ path: record.file, fullPage: false });
  record.after = await captureGeometry();
  assert.deepEqual(record.after, record.before, `${name}: geometry changed while capturing`);
  if (name === 'bundled-restarted-achievement') {
    // A second independently settled viewport provides visual evidence when a
    // compositor frame disagrees with otherwise stable DOM geometry.
    record.confirmationSamples = [];
    record.confirmationBefore = await stableCaptureGeometry(record.confirmationSamples);
    assert.deepEqual(record.confirmationBefore, record.before, 'restarted viewport remains at the same natural scroll position');
    record.confirmationFile = path.join(artifacts, `${name}-confirmation.png`);
    await page.screenshot({ path: record.confirmationFile, fullPage: false });
    record.confirmationAfter = await captureGeometry();
    assert.deepEqual(record.confirmationAfter, record.confirmationBefore, 'restarted confirmation geometry is unchanged');
  }
  record.finishedAt = new Date().toISOString();
}

async function assertNoFolderDialog() {
  const calls = await app.evaluate(() => globalThis.__javaEduQAFolderDialogCalls);
  evidence.folderDialogCalls = [...(evidence.folderDialogCalls || []), ...calls];
  assert.deepEqual(calls, [], 'bundled setup must not ask for a JDK or Maven directory');
}

async function check(name, body) {
  const started = Date.now();
  console.log(`START ${kind} ${name}`);
  try {
    await body();
    if (app) await assertNoFolderDialog();
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    console.log(`PASS ${kind} ${name}`);
  } catch (error) {
    if (page) await capture(`failure-${name}`).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started });
    throw error;
  }
}

async function launch() {
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1' };
  const forbidden = new Set(['PATH', 'JAVA_HOME', 'MAVEN_HOME', 'M2_HOME', 'JDK_HOME', 'JAVA_EDU_QA_DATA', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS']);
  for (const name of Object.keys(env)) if (forbidden.has(name.toUpperCase())) delete env[name];
  // Node on Windows restores the parent's PATH when it is omitted, even with
  // shell:false. An explicit empty value prevents that fallback and contains no
  // host tool directory. JAVA_HOME/MAVEN_HOME remain absent.
  env.PATH = '';
  app = await electron.launch({ executablePath, args: [], env, timeout: 90000 });
  app.context().on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push({ origin: url.origin, path: url.pathname, method: request.method() });
  });
  await app.evaluate(({ dialog }) => {
    globalThis.__javaEduQAFolderDialogCalls = [];
    for (const method of ['showOpenDialog', 'showOpenDialogSync']) {
      dialog[method] = (...args) => {
        globalThis.__javaEduQAFolderDialogCalls.push({ method, title: args.find(arg => arg?.title)?.title || '' });
        const error = new Error('QA: bundled startup unexpectedly requested a folder');
        if (method === 'showOpenDialog') return Promise.reject(error);
        throw error;
      };
    }
  });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('#workspace-grid').waitFor({ state: 'visible', timeout: 60000 });
  evidence.application = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), executable: app.getPath('exe'), appPath: app.getAppPath(), userData: app.getPath('userData') }));
  const inherited = await app.evaluate((_electron, names) => Object.fromEntries(names.map(name => [name, Object.keys(process.env).filter(key => key.toUpperCase() === name).map(key => process.env[key])])), [...forbidden]);
  evidence.sanitizedChildEnvironment = inherited;
  // Playwright's Windows cmd launch removes empty environment keys, so either
  // absence or an empty value proves that no host tool path was inherited.
  assert.ok(inherited.PATH.every(value => value === ''), 'child PATH must be absent or empty');
  assert.ok(Object.entries(inherited).filter(([key]) => key !== 'PATH').every(([, values]) => values.length === 0), JSON.stringify(inherited));
}

async function openLesson(lesson, step = 'lab') {
  await page.evaluate(hash => { location.hash = hash; }, `lesson=${lesson.id}&step=${step}&version=21`);
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), 'requested lesson is selected');
  await eventually(() => page.locator(`[data-step="${step}"]`).getAttribute('aria-selected'), 'true', 'requested learning stage is selected');
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

const stored = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.javaEduDesktop.storage.getItem(key)])), [progressKey, preferencesKey]);
const progress = async () => JSON.parse((await stored())[progressKey] || '{}');

async function quiz(lesson) {
  await openLesson(lesson, 'quiz');
  for (const question of lesson.quiz) await page.locator(`#quiz-form [name="quiz-${question.id}"][value="${question.correctIndex}"]`).check();
  await page.locator('#quiz-submit').click();
  await eventually(() => badge('quiz'), 'true', 'quiz achievement recorded');
  await openLesson(lesson);
}

// Observe only this app's transient command specifications; never modify them.
// These are the exact arguments consumed by the packaged Windows job runner.
function observeCommands() {
  let stopped = false;
  const seen = new Map();
  const jobs = path.join(userData, 'java-edu/jobs');
  const pending = (async () => {
    while (!stopped) {
      for (const job of await readdir(jobs, { withFileTypes: true }).catch(() => [])) {
        if (!job.isDirectory() || !job.name.startsWith('job-')) continue;
        const base = path.join(jobs, job.name);
        for (const relative of ['', 'professional/lessons/tx-proxy/reference', 'professional/lessons/tx-proxy/starter']) {
          const directory = path.join(base, relative);
          for (const name of await readdir(directory).catch(() => [])) {
            if (!/^\.command-[a-f0-9-]+\.json$/i.test(name)) continue;
            const file = path.join(directory, name);
            if (seen.has(file)) continue;
            try {
              const command = JSON.parse(await readFile(file, 'utf8'));
              if (typeof command.executable === 'string' && Array.isArray(command.args)) seen.set(file, { executable: command.executable, args: command.args, cwd: command.cwd });
            } catch { /* The writer may be finishing this new file; retry next poll. */ }
          }
        }
      }
      await pause(100);
    }
  })();
  return { async stop() { stopped = true; await pending; return [...seen.values()]; } };
}

async function execute(button, timeout = 60000) {
  const preparation = button === '#prepare-project';
  const pathname = preparation ? '/api/local/prepare' : '/api/execute';
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === pathname && response.request().method() === 'POST', { timeout });
  void pending.catch(() => {});
  const observer = observeCommands();
  let commands;
  let response;
  try { await page.locator(button).click(); response = await pending; }
  finally { commands = await observer.stop(); }
  const result = await response.json();
  const request = response.request().postDataJSON();
  evidence.executions ??= [];
  evidence.executions.push({ exerciseId: request.exerciseId, action: request.action || 'prepare', httpStatus: response.status(), commands, ...result });
  console.log('ACTUAL_BUNDLED_RESULT', JSON.stringify({ kind, exerciseId: request.exerciseId, action: request.action || 'prepare', status: result.status, provider: result.provider, runtimeVersion: result.runtimeVersion, targetVersion: result.targetVersion, passed: result.passed, total: result.total, commands: commands.length, error: result.error }));
  await eventually(() => page.locator('#execution-output').getAttribute('data-status'), status => status !== 'running', 'execution result rendered');
  assert.equal(response.status(), 200);
  assert.equal(result.provider, request.exerciseId === project.exerciseId ? 'Local Maven' : 'Local JDK');
  assert.equal(result.runtimeVersion, 21);
  assert.equal(result.status, 'passed', result.stderr || result.compilerOutput || result.stdout);
  assert.ok(result.total > 0 && result.passed === result.total && result.checks.every(check => check.passed));
  const jdk = runtime.runtimes.find(item => item.javaVersion === 21);
  assert.ok(commands.length > 0, 'actual command specifications were observed');
  assert.ok(commands.every(command => inside(command.executable, jdk.path)), 'every Java/javac command uses this package JDK');
  if (request.exerciseId === project.exerciseId) {
    const command = commands.find(command => command.args.includes('org.codehaus.plexus.classworlds.launcher.Launcher'));
    assert.ok(command, 'actual Maven launcher invocation observed');
    assert.equal(command.args.includes('--offline'), !preparation, 'only explicit environment preparation permits Maven dependency downloads');
    assert.equal(normalize(command.args.find(arg => arg.startsWith('-Dmaven.home=')).slice('-Dmaven.home='.length)), normalize(runtime.maven.path));
    const classpath = command.args[command.args.indexOf('-classpath') + 1];
    assert.ok(inside(classpath, runtime.maven.path), 'actual Maven launcher comes from this package');
  } else {
    const compiler = commands.find(command => path.basename(command.executable).toLowerCase() === 'javac.exe');
    assert.ok(compiler, 'actual bundled javac invocation observed');
    assert.equal(compiler.args[compiler.args.indexOf('--release') + 1], String(result.targetVersion));
  }
  return { result, request };
}

async function verifyBundledRuntime(value) {
  assert.equal(value.mode, 'local');
  assert.deepEqual(value.supportedTargets, [8, 11, 17, 21]);
  assert.deepEqual(value.runtimes.filter(item => item.available).map(item => item.javaVersion), [21]);
  const jdk = value.runtimes.find(item => item.javaVersion === 21);
  assert.equal(jdk.source, 'bundled');
  assert.equal(value.maven.source, 'bundled');
  assert.equal(value.maven.available, true);
  assert.ok(value.bundledRuntime?.id && typeof value.bundledRuntime.id === 'string');
  assert.deepEqual(value.bundledRuntime.javaVersions, [21]);
  assert.equal(value.bundledRuntime.mavenVersion, value.maven.version);
  const resources = path.join(path.dirname(executablePath), 'resources');
  assert.ok(inside(jdk.path, resources), 'automatically registered JDK is contained in this product');
  assert.ok(inside(value.maven.path, resources), 'automatically registered Maven is contained in this product');
  await access(path.join(jdk.path, 'bin/java.exe'));
  await access(path.join(jdk.path, 'bin/javac.exe'));
  await access(path.join(value.maven.path, 'boot'));
}

async function main() {
  assert.ok(kind === 'zip' || kind === 'nsis', 'pass --kind zip|nsis');
  assert.ok(executableInput && path.isAbsolute(executableInput), 'pass an explicitly approved absolute --executable path');
  assert.equal(path.basename(executablePath), 'Java Edu.exe');
  if (kind === 'nsis') assert.equal(normalize(executablePath), normalize(path.join(root, 'work/한글 설치 & %JAVA_HOME%/Java Edu.exe')));
  else {
    assert.ok(inside(executablePath, path.join(root, 'work/bundled-zip')));
    for (const text of ['한글', ' ', '&', '%JAVA_HOME%']) assert.ok(executablePath.includes(text), `ZIP extraction path preserves literal ${text}`);
  }
  assert.ok((await lstat(executablePath)).isFile());
  assert.equal(normalize(await realpath(executablePath)), normalize(executablePath), 'approved package executable is not redirected');
  await mkdir(artifacts, { recursive: true });
  const preflight = JSON.parse((await readFile(preflightPath, 'utf8')).replace(/^\uFEFF/, ''));
  assert.ok(Array.isArray(preflight.AppData) && preflight.AppData.length >= 2, 'root preflight of default application-data paths is required');
  assert.ok(preflight.AppData.every(item => item.Exists === false), 'do not overwrite existing user data');
  for (const item of preflight.AppData) assert.equal(await exists(item.Path), false, `STOP: existing application data at ${item.Path}`);
  evidence.preflight = preflight;
  evidence.executableSha256 = digest(await readFile(executablePath));
  evidence.asarSha256 = digest(await readFile(path.join(path.dirname(executablePath), 'resources/app.asar')));
  const solutions = JSON.parse(await readFile(path.join(root, 'examples/solutions.json'), 'utf8'));
  await launch();
  const firstOrigin = new URL(page.url()).origin;

  await check('first-launch-automatic-bundled-tools-without-host-environment', async () => {
    const facts = await app.evaluate(({ app, BrowserWindow }) => ({ packaged: app.isPackaged, version: app.getVersion(), executable: app.getPath('exe'), appPath: app.getAppPath(), userData: app.getPath('userData'), preferences: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences() }));
    userData = facts.userData;
    evidence.application = facts;
    assert.equal(facts.packaged, true);
    assert.equal(facts.version, '0.3.0');
    assert.equal(normalize(facts.executable), normalize(executablePath));
    assert.ok(preflight.AppData.some(item => normalize(item.Path) === normalize(userData)), 'default production AppData only');
    for (const [key, value] of Object.entries({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false })) assert.equal(facts.preferences[key], value);
    runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
    evidence.runtimeBeforeConsent = runtime;
    await verifyBundledRuntime(runtime);
    assert.equal(runtime.consent.accepted, false);
    assert.equal(runtime.available, false);
    await openLesson(coreCases[0]);
    assert.equal(await page.locator('#run-code').isDisabled(), true);
    assert.equal(await page.locator('#submit-code').isDisabled(), true);
    await settings();
    assert.equal(await page.locator('#execution-consent').isChecked(), false);
    assert.match(await page.locator('#desktop-bundle-title').textContent(), /별도 설치 없이/);
    assert.deepEqual(await page.locator('#desktop-bundle-status .settings-bundle-tools li span').allTextContents(), ['앱에 포함', '앱에 포함']);
    assert.match(await page.locator('#desktop-bundle-status').textContent(), /환경 준비 시 인터넷/);
    assert.equal(await page.locator('#desktop-advanced-settings').getAttribute('open'), null, 'optional external-tool settings start collapsed');
    assert.equal(executionCount(), 0, 'opening the app/settings does not run learner code or prepare a project');
    await capture('bundled-first-launch-settings');
    await page.locator('#desktop-advanced-summary').focus();
    await page.keyboard.press('Enter');
    await eventually(() => page.locator('#desktop-advanced-settings').evaluate(node => node.open), true, 'optional settings are keyboard accessible');
    for (const version of [8, 11, 17]) assert.match(await page.locator(`#jdk-register-${version}`).locator('..').textContent(), /선택 사항/);
    await page.locator('#desktop-advanced-summary').focus();
    await page.keyboard.press('Enter');
    await eventually(() => page.locator('#desktop-advanced-settings').evaluate(node => node.open), false, 'optional settings close without choosing a directory');
    await closeSettings();
  });

  await check('consent-enables-bundled-tools-without-directory-selection', async () => {
    await settings();
    await page.locator('#execution-consent').check();
    await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, true, 'explicit consent persisted');
    runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
    await verifyBundledRuntime(runtime);
    await closeSettings();
    await eventually(() => page.locator('#run-code').isEnabled(), true, 'bundled runtime enables execution');
    assert.equal(executionCount(), 0, 'accepting consent alone does not execute code');
  });

  for (const lesson of coreCases) await check(`bundled-jvm21-core-target${lesson.minVersion}`, async () => {
    await openLesson(lesson);
    await editor().fill(solutions[lesson.exerciseId]);
    await quiz(lesson);
    const { result, request } = await execute('#submit-code');
    assert.equal(result.targetVersion, lesson.minVersion);
    assert.equal(request.source, solutions[lesson.exerciseId]);
    assert.equal(await badge('lab'), 'true');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture(`bundled-core-target${lesson.minVersion}-passed`);
  });

  await check('spring-h2-explicit-online-preparation-not-achievement', async () => {
    await openLesson(project);
    await eventually(() => page.locator('#prepare-project').isEnabled(), true, 'project metadata and bundled tools ready');
    assert.equal(await page.locator('#submit-code').isDisabled(), true);
    const file = projectExercise.files.find(item => item.editable);
    await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
    await editor().fill(`${file.source}\n// preparation preserves this learner draft\n`);
    await openLesson(project, 'theory');
    await openLesson(project);
    const before = (await progress()).fileDrafts;
    const { result, request } = await execute('#prepare-project', 360000);
    assert.equal(result.targetVersion, 17);
    assert.equal(result.prepared, true);
    assert.equal(request.source, undefined);
    assert.equal(request.files, undefined);
    assert.deepEqual((await progress()).fileDrafts, before);
    assert.equal(await badge('quiz'), 'false');
    assert.equal(await badge('lab'), 'false');
    await eventually(() => page.locator('#project-preparation-state').getAttribute('data-prepared'), 'true', 'environment marked prepared');
    assert.equal(await page.locator('#execution-output .execution-result-label').textContent(), '환경 준비 완료');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('bundled-spring-h2-prepared');
  });

  await check('spring-h2-actual-bundled-maven-offline-submit', async () => {
    const expectedFiles = {};
    for (const file of project.professionalExercise.files.filter(item => item.editable)) {
      expectedFiles[file.path] = await readFile(path.join(root, 'curriculum/professional', file.referencePath), 'utf8');
      await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
      await editor().fill(expectedFiles[file.path]);
    }
    await quiz(project);
    const { request } = await execute('#submit-code', 180000);
    assert.deepEqual(request.files, expectedFiles);
    assert.equal(Object.hasOwn(request.files, 'pom.xml'), false);
    assert.equal(await badge('lab'), 'true');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await capture('bundled-spring-h2-submitted');
  });

  await check('restart-retains-bundled-registration-progress-theme-and-drafts', async () => {
    const core = coreCases[0];
    const marker = `bundled ${kind} restart draft`;
    await openLesson(core);
    await editor().fill(`${solutions[core.exerciseId]}\n// ${marker}\n`);
    await page.locator('#editor-theme-select').selectOption('contrast');
    await openLesson(project);
    const file = projectExercise.files.find(item => item.editable);
    await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
    await editor().fill(`${file.source}\n// ${marker} project\n`);
    await openLesson(coreCases[3], 'theory');
    const before = await stored();
    const registered = await page.evaluate(() => window.javaEduDesktop.getSettings());
    await assertNoFolderDialog();
    await app.close(); app = null;
    await launch();
    evidence.origins = [firstOrigin, new URL(page.url()).origin];
    assert.notEqual(evidence.origins[0], evidence.origins[1]);
    const after = await stored();
    assert.equal(after[preferencesKey], before[preferencesKey]);
    for (const field of ['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'notes']) assert.deepEqual(JSON.parse(after[progressKey])[field], JSON.parse(before[progressKey])[field], `${field} survives port change`);
    runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
    await verifyBundledRuntime(runtime);
    assert.equal(runtime.consent.accepted, true);
    assert.deepEqual(runtime.bundledRuntime, registered.bundledRuntime);
    assert.equal(normalize(runtime.runtimes.find(item => item.javaVersion === 21).path), normalize(registered.runtimes.find(item => item.javaVersion === 21).path));
    assert.equal(normalize(runtime.maven.path), normalize(registered.maven.path));
    evidence.runtimeAfterRestart = runtime;
    await openLesson(core);
    assert.equal(await page.locator('#editor-theme-select').inputValue(), 'contrast');
    await editor().press('Control+End');
    await eventually(() => editor().innerText(), text => text.includes(marker), 'restored core draft is visible in the actual editor');
    await openLesson(project);
    await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
    await editor().press('Control+End');
    await eventually(() => editor().innerText(), text => text.includes(`${marker} project`), 'restored project draft is visible in the actual editor');
    assert.equal(await page.locator('#prepare-project').getAttribute('data-prepared'), 'false');
    await openLesson(coreCases[3]);
    assert.equal(await badge('quiz'), 'true');
    assert.equal(await badge('lab'), 'true');
    await capture('bundled-restarted-achievement');
  });

  await check('bundled-settings-minimum-window-and-200-percent', async () => {
    await settings();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(720, 560));
    await eventually(() => page.evaluate(() => innerWidth), width => width < 800, 'minimum window applied');
    await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
    const dialog = page.locator('#desktop-settings-dialog');
    await dialog.evaluate(node => { node.scrollTop = 0; });
    await capture('bundled-settings-minimum200-top');
    const includedTools = dialog.locator('.settings-bundle-tools');
    await includedTools.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
    const toolsGeometry = await includedTools.evaluate(node => {
      const dialog = node.closest('dialog').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, dialog: { top: dialog.top, bottom: dialog.bottom, left: dialog.left, right: dialog.right }, nodes: [...node.querySelectorAll('li, li strong, li span')].map(item => { const r = item.getBoundingClientRect(); return { text: item.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }) };
    });
    assert.ok(toolsGeometry.nodes.every(node => node.top >= Math.max(0, toolsGeometry.dialog.top) && node.bottom <= Math.min(toolsGeometry.height, toolsGeometry.dialog.bottom) && node.left >= toolsGeometry.dialog.left && node.right <= toolsGeometry.dialog.right), 'included Java/Maven names and source labels are fully visible at 200%');
    evidence.minimumBundledToolsViewport = toolsGeometry;
    await capture('bundled-settings-minimum200-tools');
    const close = dialog.locator('.dialog-actions [data-close-dialog="desktop-settings-dialog"]');
    await close.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'end' }));
    const geometry = await close.evaluate(node => { const b = node.getBoundingClientRect(); const d = node.closest('dialog').getBoundingClientRect(); return { width: innerWidth, height: innerHeight, rootFont: getComputedStyle(document.documentElement).fontSize, button: { top: b.top, bottom: b.bottom, left: b.left, right: b.right }, dialog: { top: d.top, bottom: d.bottom, scrollWidth: node.closest('dialog').scrollWidth, clientWidth: node.closest('dialog').clientWidth } }; });
    assert.equal(geometry.rootFont, '32px');
    assert.ok(geometry.button.top >= Math.max(0, geometry.dialog.top) && geometry.button.bottom <= Math.min(geometry.height, geometry.dialog.bottom));
    assert.ok(geometry.button.left >= 0 && geometry.button.right <= geometry.width);
    assert.ok(geometry.dialog.scrollWidth <= geometry.dialog.clientWidth + 1, 'dialog has no horizontal overflow');
    evidence.minimumSettingsViewport = geometry;
    await capture('bundled-settings-minimum200-close');
    await close.click();
    await dialog.waitFor({ state: 'hidden' });
  });
  assert.deepEqual(errors, []);
  assert.ok(apiRequests.every(request => new URL(request.origin).hostname === '127.0.0.1'));
  await assertNoFolderDialog();
}

try { await main(); }
catch (error) {
  if (!results.some(result => result.status === 'FAIL')) results.push({ name: 'environment-or-preflight', status: 'BLOCKED', message: error.message });
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await app?.close().catch(() => {});
  evidence.finishedAt = new Date().toISOString();
  evidence.results = results;
  evidence.uncaughtBrowserErrors = errors;
  evidence.apiRequests = apiRequests;
  await mkdir(artifacts, { recursive: true });
  const resultFile = path.join(artifacts, `bundled-results-${Date.now()}.json`);
  await writeFile(resultFile, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ results, resultFile, application: evidence.application, origins: evidence.origins }, null, 2));
}
