import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { extractFile } from '@electron/asar';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { exercises as coreExercises } from '../dist/data/exercises.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';

// Manual release gate, run only after the owner has authorized and completed the
// NSIS test installation. This script never installs/uninstalls software, changes
// registry values, redirects production userData, or deletes application data.
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const installRoot = path.join(root, 'work/installed-java-edu-test');
const executablePath = path.join(installRoot, 'Java Edu.exe');
const artifacts = path.join(root, 'work/installed-desktop-qa');
const preflightPath = path.join(artifacts, 'preflight.json');
const jdk = process.env.JAVA_EDU_JDK_21;
const maven = process.env.JAVA_EDU_MAVEN_HOME;
const core = coreLessons.find(lesson => lesson.id === 'java-basics');
const modern = coreLessons.find(lesson => lesson.id === 'java21');
const project = professionalLessons.find(lesson => lesson.id === 'tx-proxy');
const projectExercise = professionalExercises.find(exercise => exercise.id === project.exerciseId);
const storageKey = 'java-edu:progress:v1';
const preferencesKey = 'java-edu:editor-preferences:v1';
const results = [];
const evidence = { startedAt: new Date().toISOString(), kind: 'Installed production Electron; actual local JDK/Maven; directory dialog return value and navigator.clipboard.writeText readback are mocked; no real OS clipboard verification', executablePath, installRoot, artifacts };
const errors = [];
const requests = [];
let app;
let page;

const exists = file => access(file).then(() => true, () => false);
const normalize = value => path.resolve(value).toLowerCase();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const editor = () => page.locator('#code-editor [role="textbox"]');
const badge = type => page.locator(`#lesson-achievements [data-achievement="${type}"]`).getAttribute('data-complete');

async function eventually(read, expected, message, timeout = 15000) {
  const until = Date.now() + timeout;
  let value;
  while (Date.now() < until) {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}

async function screenshot(name) {
  await page.locator('#toast.is-visible').waitFor({ state: 'hidden', timeout: 6000 });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: false });
}

async function check(name, body) {
  const started = Date.now();
  console.log(`START ${name}`);
  try {
    await body();
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    if (page) await screenshot(`failure-${name}`).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started });
    throw error;
  }
}

async function launch() {
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '1' };
  delete env.JAVA_EDU_QA_DATA;
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  app = await electron.launch({ executablePath, args: [], env, timeout: 60000 });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) requests.push({ origin: url.origin, path: url.pathname, method: request.method() });
  });
  await page.locator('#workspace-grid').waitFor({ state: 'visible', timeout: 45000 });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.qaClipboardText = text; } } }));
}

async function openLesson(lesson, step = 'lab') {
  await page.evaluate(hash => { location.hash = hash; }, `lesson=${lesson.id}&step=${step}&version=21`);
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), 'requested lesson is selected');
  await eventually(() => page.locator(`[data-step="${step}"]`).getAttribute('aria-selected'), 'true', 'requested learning stage is selected');
}

async function source() {
  await page.evaluate(() => { window.qaClipboardText = undefined; });
  await page.locator('#copy-code').click();
  return eventually(() => page.evaluate(() => window.qaClipboardText), text => typeof text === 'string', 'current entire source is copied');
}

async function quiz(lesson) {
  await openLesson(lesson, 'quiz');
  for (const question of lesson.quiz) await page.locator(`#quiz-form [name="quiz-${question.id}"][value="${question.correctIndex}"]`).check();
  await page.locator('#quiz-submit').click();
  await eventually(() => badge('quiz'), 'true', 'quiz achievement is recorded');
  await openLesson(lesson);
}

async function settings() {
  await page.locator('#desktop-settings-open').click();
  await page.locator('#desktop-settings-dialog').waitFor({ state: 'visible' });
  await eventually(() => page.locator('#execution-consent').isEnabled(), true, 'settings loaded');
}

async function mockDirectorySelection(directory) {
  await app.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, directory);
}

async function execute(button, timeout = 60000) {
  const pathname = button === '#prepare-project' ? '/api/local/prepare' : '/api/execute';
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === pathname && response.request().method() === 'POST', { timeout });
  void pending.catch(() => {});
  await page.locator(button).click();
  const response = await pending;
  const result = await response.json();
  const request = response.request().postDataJSON();
  evidence.executions ??= [];
  evidence.executions.push({ exerciseId: request.exerciseId, action: request.action || 'prepare', httpStatus: response.status(), ...result });
  console.log('ACTUAL_INSTALLED_RESULT', JSON.stringify({ exerciseId: request.exerciseId, action: request.action || 'prepare', status: result.status, runtimeVersion: result.runtimeVersion, targetVersion: result.targetVersion, passed: result.passed, total: result.total, error: result.error }));
  await eventually(() => page.locator('#execution-output').getAttribute('data-status'), status => status !== 'running', 'execution response is rendered');
  assert.equal(response.status(), 200);
  const expectedProvider = professionalExercises.some(exercise => exercise.id === request.exerciseId) ? 'Local Maven' : 'Local JDK';
  assert.equal(result.provider, expectedProvider);
  assert.equal(result.runtimeVersion, 21);
  return { result, request };
}

async function preparedEvidence() {
  const selectors = ['#lesson-achievements', '#project-preparation-state', '#execution-output .execution-panel-heading', '#execution-output .execution-result-label'];
  const measure = () => page.evaluate(selectors => {
    const rectangles = selectors.map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { selector, top: r.top + scrollY, bottom: r.bottom + scrollY }; });
    return { min: Math.min(...rectangles.map(r => r.top)), max: Math.max(...rectangles.map(r => r.bottom)), rectangles };
  }, selectors);
  const before = await measure();
  // A taller native viewport preserves the real page layout and simultaneously
  // shows preparation success plus incomplete learner achievements. No DOM is moved.
  const height = Math.max(920, Math.ceil(before.max - before.min) + 100);
  await app.evaluate(({ BrowserWindow }, height) => BrowserWindow.getAllWindows()[0].setContentSize(1424, height), height);
  await eventually(() => page.evaluate(() => innerHeight), actual => actual >= height, 'native viewport includes preparation summary and learner badges');
  const after = await measure();
  await page.evaluate(top => scrollTo({ top: Math.max(0, top - 30), behavior: 'instant' }), after.min);
  const visibility = await page.evaluate(selectors => ({ width: innerWidth, height: innerHeight, nodes: selectors.map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { selector, top: r.top, bottom: r.bottom }; }) }), selectors);
  assert.ok(visibility.nodes.every(r => r.top >= 0 && r.bottom <= visibility.height), JSON.stringify(visibility));
  evidence.preparedViewport = visibility;
  await screenshot('installed-prepare-complete-still-incomplete');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
}

async function main() {
  await mkdir(artifacts, { recursive: true });
  const preflight = JSON.parse((await readFile(preflightPath, 'utf8')).replace(/^\uFEFF/, ''));
  assert.ok(Array.isArray(preflight.AppData) && preflight.AppData.length === 4, 'recorded real-user preflight is required');
  assert.ok(preflight.AppData.every(item => item.Exists === false), 'pre-existing application data must be preserved');
  assert.equal(preflight.Shortcuts.length, 0, 'pre-existing shortcuts must be preserved');
  assert.equal(preflight.InstalledEntries.length, 0, 'pre-existing installation must be preserved');
  assert.equal(normalize(preflight.TestInstallPath), normalize(installRoot));
  for (const item of preflight.AppData) assert.equal(await exists(item.Path), false, `STOP: user application data exists: ${item.Path}`);
  assert.ok(jdk && maven, 'approved JDK21 and Maven paths must be supplied');
  await access(path.join(jdk, 'bin/java.exe'));
  await access(path.join(maven, 'boot'));
  await access(executablePath);
  await access(path.join(installRoot, 'resources/app.asar'));
  await access(path.join(installRoot, 'resources/app.asar.unpacked/desktop/job-runner.ps1'));
  evidence.preflight = preflight;
  evidence.executableSha256 = createHash('sha256').update(await readFile(executablePath)).digest('hex');
  evidence.asarSha256 = createHash('sha256').update(await readFile(path.join(installRoot, 'resources/app.asar'))).digest('hex');
  await check('installed-package-execution-byte-parity', async () => {
    evidence.installedExecutionFiles = [];
    const asarPath = path.join(installRoot, 'resources/app.asar');
    for (const relative of ['server/local/process.mjs', 'server/local/engine.mjs', 'server/local/http.mjs', 'server/local/settings.mjs', 'desktop/main.cjs', 'desktop/preload.cjs', 'desktop/reference-policy.cjs', 'desktop/job-runner.ps1']) {
      const sourceBytes = await readFile(path.join(root, relative));
      const unpacked = relative === 'desktop/job-runner.ps1';
      const installedBytes = unpacked
        ? await readFile(path.join(installRoot, 'resources/app.asar.unpacked', relative))
        : extractFile(asarPath, path.normalize(relative));
      const comparison = { path: relative, location: unpacked ? 'app.asar.unpacked' : 'app.asar', sourceBytes: sourceBytes.length, installedBytes: installedBytes.length, sourceSha256: sha256(sourceBytes), installedSha256: sha256(installedBytes), equal: installedBytes.equals(sourceBytes) };
      evidence.installedExecutionFiles.push(comparison);
      assert.ok(comparison.equal, `Installed ${comparison.location}/${relative} differs from the frozen source: expected ${comparison.sourceSha256}, actual ${comparison.installedSha256}`);
    }
  });
  const solutions = JSON.parse(await readFile(path.join(root, 'examples/solutions.json'), 'utf8'));
  await launch();
  const firstOrigin = new URL(page.url()).origin;
  await check('installed-packaged-startup-and-default-user-data', async () => {
    const facts = await app.evaluate(({ app, BrowserWindow }) => ({ packaged: app.isPackaged, executable: app.getPath('exe'), appPath: app.getAppPath(), userData: app.getPath('userData'), preferences: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences() }));
    assert.equal(facts.packaged, true);
    assert.equal(normalize(facts.executable), normalize(executablePath));
    assert.ok(facts.appPath.endsWith('app.asar'));
    assert.ok(preflight.AppData.some(item => normalize(item.Path) === normalize(facts.userData)), 'production default AppData, no QA override');
    assert.equal(facts.preferences.contextIsolation, true);
    assert.equal(facts.preferences.nodeIntegration, false);
    assert.equal(facts.preferences.sandbox, true);
    assert.equal(facts.preferences.webSecurity, true);
    assert.equal(facts.preferences.allowRunningInsecureContent, false);
    evidence.application = { ...facts, preferences: { contextIsolation: facts.preferences.contextIsolation, nodeIntegration: facts.preferences.nodeIntegration, sandbox: facts.preferences.sandbox, webSecurity: facts.preferences.webSecurity, allowRunningInsecureContent: facts.preferences.allowRunningInsecureContent } };
    evidence.installedAssetHashes = {};
    for (const relative of ['app.js', 'styles.css', 'data/lesson-visuals.js']) {
      const actual = await page.evaluate(async relative => {
        const response = await fetch(`/${relative}`);
        if (!response.ok) throw new Error(`Installed asset ${relative}: HTTP ${response.status}`);
        return response.text();
      }, relative);
      assert.equal(actual, await readFile(path.join(root, 'dist', relative), 'utf8'), `installed ${relative} matches the frozen source`);
      evidence.installedAssetHashes[relative] = createHash('sha256').update(actual).digest('hex');
    }
    await openLesson(core, 'theory');
    assert.equal(await page.locator('.theory-visual').count(), 1, 'new theory data ships inside the installed package');
    await openLesson(core);
    const runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
    assert.equal(runtime.mode, 'local');
    assert.equal(runtime.consent.accepted, false);
    assert.equal(runtime.runtimes.some(item => item.available), false);
    assert.equal(await page.locator('#run-code').isDisabled(), true);
    await screenshot('installed-first-launch');
  });

  await check('installed-real-tool-registration-and-consent', async () => {
    await settings();
    await mockDirectorySelection(jdk);
    await page.locator('#jdk-register-21').click();
    await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).runtimes.find(item => item.javaVersion === 21).available, true, 'packaged helper inspects real JDK21', 40000);
    await eventually(() => page.locator('#jdk-register-21').isEnabled(), true, 'JDK registration finished');
    await mockDirectorySelection(maven);
    await page.locator('#maven-register').click();
    await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).maven.available, true, 'Maven distribution inspected');
    await page.locator('#execution-consent').check();
    await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, true, 'explicit consent saved');
    await screenshot('installed-configured-settings');
    await page.locator('#desktop-settings-dialog [data-close-dialog="desktop-settings-dialog"]').first().click();
    assert.equal(requests.some(request => request.path === '/api/execute'), false);
  });

  await check('installed-jdk21-core-target8-and21-submissions', async () => {
    for (const lesson of [core, modern]) {
      await openLesson(lesson);
      await editor().fill(solutions[lesson.exerciseId]);
      await quiz(lesson);
      const { result, request } = await execute('#submit-code');
      assert.equal(result.status, 'passed', result.stderr || result.compilerOutput);
      assert.equal(result.targetVersion, coreExercises.find(exercise => exercise.id === lesson.exerciseId).minVersion);
      assert.ok(result.total > 0 && result.passed === result.total && result.checks.every(check => check.passed));
      assert.equal(request.source, solutions[lesson.exerciseId]);
      assert.equal(await badge('lab'), 'true');
    }
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await screenshot('installed-java21-submitted');
  });

  await check('installed-spring-h2-preparation-not-learner-completion', async () => {
    await openLesson(project);
    await eventually(() => page.locator('#prepare-project').isEnabled(), true, 'packaged project metadata loaded');
    assert.equal(await page.locator('#submit-code').isDisabled(), true);
    const before = await source();
    const { result, request } = await execute('#prepare-project', 360000);
    assert.equal(result.status, 'passed', result.stderr || result.stdout);
    assert.equal(result.targetVersion, 17);
    assert.equal(result.prepared, true);
    assert.equal(request.source, undefined);
    assert.equal(request.files, undefined);
    assert.equal(await source(), before);
    assert.equal(await badge('quiz'), 'false');
    assert.equal(await badge('lab'), 'false');
    await eventually(() => page.locator('#project-preparation-state').getAttribute('data-prepared'), 'true', 'preparation availability updated');
    assert.equal(await page.locator('#execution-output .execution-result-label').textContent(), '환경 준비 완료');
    await preparedEvidence();
  });

  await check('installed-spring-h2-reference-submit', async () => {
    const expectedFiles = {};
    for (const file of project.professionalExercise.files.filter(item => item.editable)) {
      expectedFiles[file.path] = await readFile(path.join(root, 'curriculum/professional', file.referencePath), 'utf8');
      await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
      await editor().fill(expectedFiles[file.path]);
    }
    await quiz(project);
    const { result, request } = await execute('#submit-code', 180000);
    assert.equal(result.status, 'passed', result.stderr || result.stdout);
    assert.equal(result.targetVersion, 17);
    assert.ok(result.total > 0 && result.passed === result.total && result.checks.every(check => check.passed));
    assert.deepEqual(request.files, expectedFiles);
    assert.equal(Object.hasOwn(request.files, 'pom.xml'), false);
    assert.equal(await badge('lab'), 'true');
    await page.locator('#execution-output .execution-panel-heading').scrollIntoViewIfNeeded();
    await screenshot('installed-spring-h2-submitted');
  });

  await check('installed-restart-preserves-progress-theme-and-drafts', async () => {
    await openLesson(core);
    const draft = `${solutions[core.exerciseId]}\n// installed restart draft\n`;
    await editor().fill(draft);
    await page.locator('#editor-theme-select').selectOption('contrast');
    await openLesson(project);
    const file = projectExercise.files.find(item => item.editable);
    const fileDraft = `${file.source}\n// installed project restart draft\n`;
    await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
    await editor().fill(fileDraft);
    await openLesson(modern, 'theory');
    const stored = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.javaEduDesktop.storage.getItem(key)])), [storageKey, preferencesKey]);
    const before = await stored();
    await app.close();
    app = null;
    await launch();
    const after = await stored();
    evidence.origins = [firstOrigin, new URL(page.url()).origin];
    assert.notEqual(evidence.origins[0], evidence.origins[1]);
    assert.equal(after[preferencesKey], before[preferencesKey]);
    for (const field of ['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'notes']) assert.deepEqual(JSON.parse(after[storageKey])[field], JSON.parse(before[storageKey])[field], `${field} persists across the port change`);
    await openLesson(core);
    assert.equal(await source(), draft);
    assert.equal(await page.locator('#editor-theme-select').inputValue(), 'contrast');
    await openLesson(project);
    await page.locator(`#project-file-tabs [data-file-path="${file.path}"]`).click();
    assert.equal(await source(), fileDraft);
    assert.equal(await page.locator('#prepare-project').getAttribute('data-prepared'), 'false');
    await openLesson(modern);
    assert.equal(await badge('quiz'), 'true');
    assert.equal(await badge('lab'), 'true');
    await screenshot('installed-restarted-achievement');
  });

  await check('installed-minimum-window200-settings-close-is-visible', async () => {
    await settings();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(720, 560));
    await eventually(() => page.evaluate(() => innerWidth), width => width < 800, 'minimum native window size applied');
    await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
    const close = page.locator('#desktop-settings-dialog .dialog-actions [data-close-dialog="desktop-settings-dialog"]');
    await close.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'end' }));
    const visibility = await close.evaluate(node => { const r = node.getBoundingClientRect(); const d = node.closest('dialog').getBoundingClientRect(); return { width: innerWidth, height: innerHeight, rootFont: getComputedStyle(document.documentElement).fontSize, button: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, dialog: { top: d.top, bottom: d.bottom } }; });
    assert.equal(visibility.rootFont, '32px');
    assert.ok(visibility.button.top >= 0 && visibility.button.bottom <= visibility.height && visibility.button.top >= visibility.dialog.top && visibility.button.bottom <= visibility.dialog.bottom, JSON.stringify(visibility));
    assert.ok(visibility.button.left >= 0 && visibility.button.right <= visibility.width);
    evidence.minimumSettingsViewport = visibility;
    await screenshot('installed-settings-minimum200-close-button');
    await close.click();
    await page.locator('#desktop-settings-dialog').waitFor({ state: 'hidden' });
  });
  assert.deepEqual(errors, []);
  assert.ok(requests.every(request => new URL(request.origin).hostname === '127.0.0.1'));
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
  evidence.apiRequests = requests;
  await mkdir(artifacts, { recursive: true });
  await writeFile(path.join(artifacts, `installed-results-${Date.now()}.json`), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ results, artifacts, application: evidence.application, origins: evidence.origins }, null, 2));
}
