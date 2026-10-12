import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, chromium } from 'playwright';
import { unzipSync, strFromU8 } from 'fflate';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { exercises as coreExercises } from '../dist/data/exercises.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';

// Web APIs are mocked. Electron uses its actual authenticated local server and
// registered JDKs. No test sends learner source to a remote execution provider.
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const artifactRoot = path.resolve(process.env.QA_ARTIFACT_DIR || path.join(projectRoot, '../../work/java-edu-desktop-qa'));
const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const mode = process.env.JAVA_EDU_QA_MODE || 'all';
const results = [];
const lessons = [...coreLessons, ...professionalLessons];
const first = coreLessons.find(lesson => lesson.id === 'java-basics');
const classLesson = coreLessons.find(lesson => coreExercises.find(exercise => exercise.id === lesson.exerciseId)?.mode === 'class');
const project = professionalLessons.find(lesson => lesson.id === 'tx-proxy');
const projectExercise = professionalExercises.find(exercise => exercise.lessonId === project.id);
const firstProject = professionalLessons[0];
const firstProjectExercise = professionalExercises[0];
const storageKey = 'java-edu:progress:v1';
const preferencesKey = 'java-edu:editor-preferences:v1';
const editor = page => page.locator('#code-editor [data-testid="code-editor-input"]');

async function eventually(read, expected, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}

async function capture(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(artifactRoot, `${name}.png`), fullPage, caret: 'initial' });
}

async function caseOf(name, page, test) {
  const started = Date.now();
  console.log(`START ${name}`);
  try {
    await test();
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    await capture(page, `failure-${name}`, true).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started });
    console.error(`FAIL ${name}: ${error.stack}`);
    return false;
  }
}

async function step(page, value) {
  await page.locator(`[data-step="${value}"]`).click();
  await eventually(() => page.locator(`[data-step="${value}"]`).getAttribute('aria-selected'), 'true', 'selected learning stage');
}

async function openLesson(page, lesson, stage = 'lab') {
  // Hash navigation stays inside the authenticated Electron document.
  await page.evaluate(hash => { location.hash = hash; }, `lesson=${lesson.id}&step=${stage}&version=21`);
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), 'requested lesson title');
  await eventually(() => page.locator(`[data-step="${stage}"]`).getAttribute('aria-selected'), 'true', 'requested lesson stage');
}

async function clipboardMock(page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.qaClipboardText = value; } } });
  });
}

async function source(page) {
  await page.evaluate(() => { window.qaClipboardText = undefined; });
  await page.locator('#copy-code').click();
  return eventually(() => page.evaluate(() => window.qaClipboardText), value => typeof value === 'string', 'complete source copy');
}

async function quiz(page, lesson) {
  await step(page, 'quiz');
  for (const question of lesson.quiz) await page.locator(`#quiz-form [name="quiz-${question.id}"][value="${question.correctIndex}"]`).check();
  await page.locator('#quiz-submit').click();
  await eventually(() => badge(page, 'quiz'), 'true', 'quiz achievement');
}

const badge = (page, type) => page.locator(`#lesson-achievements [data-achievement="${type}"]`).getAttribute('data-complete');
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `page overflow ${JSON.stringify(dimensions)}`);
}

async function chooseFile(page, file, example = false) {
  await page.locator(`${example ? '#lesson-panel' : '#project-file-tabs'} [data-file-path="${file}"]`).click();
}

async function readonlyPom(page, exercise) {
  const expected = exercise.files.find(file => file.path === 'pom.xml').source;
  await chooseFile(page, 'pom.xml');
  assert.equal(await editor(page).getAttribute('aria-readonly'), 'true');
  assert.equal(await page.locator('#indent-code').isDisabled(), true);
  assert.equal(await page.locator('#lab-reset').isDisabled(), true);
  await editor(page).focus();
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.insertText('QA_FORBIDDEN_EDIT');
  assert.equal(await source(page), expected, 'readonly POM rejects actual keyboard insertion');
}

async function webSuite() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const requests = [];
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, method: route.request().method() });
    if (url.pathname === '/api/runtime') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ provider: 'Wandbox', available: true, runtime: { javaVersion: 21 }, supportedTargets: [8, 11, 17, 21], notice: 'QA mock runtime only' }) });
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'qa_forbidden_execution', message: 'Web professional QA must not submit source.' } }) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(baseUrl);
    await page.locator('#workspace-grid').waitFor({ state: 'visible' });
    await clipboardMock(page);
    await caseOf('web-combined-catalog-version-gates', page, async () => {
      assert.equal(lessons.length, 34);
      assert.equal(await page.evaluate(() => typeof window.javaEduDesktop), 'undefined');
      for (const version of [8, 11, 17, 21]) {
        await page.locator('#version-select').selectOption(String(version));
        const visible = await page.locator('#lesson-list [data-lesson-id]').evaluateAll(nodes => nodes.map(node => node.dataset.lessonId).sort());
        assert.deepEqual(visible, lessons.filter(lesson => lesson.minVersion <= version).map(lesson => lesson.id).sort());
        if (version < 17) assert.equal(visible.some(id => professionalLessons.some(lesson => lesson.id === id)), false);
      }
      await page.locator('[data-track="project"]').click();
      assert.deepEqual(await page.locator('#lesson-list [data-lesson-id]').evaluateAll(nodes => nodes.map(node => node.dataset.lessonId).sort()), professionalLessons.map(lesson => lesson.id).sort());
      await page.locator('#version-select').selectOption('8');
      assert.equal(await page.locator('#lesson-list [data-lesson-id]').count(), 0);
      await page.locator('#version-select').selectOption('21');
      await page.locator('[data-track="all"]').click();
      await openLesson(page, firstProject, 'theory');
      await capture(page, 'web-professional-theory');
    });

    await caseOf('web-all-professional-stages-quizzes-and-disabled-execution', page, async () => {
      for (const lesson of professionalLessons) {
        await openLesson(page, lesson, 'theory');
        assert.ok(await page.locator('#source-list a[href^="https://"]').count() > 0, `${lesson.id} official references`);
        await step(page, 'example');
        for (const file of lesson.example.files) {
          await chooseFile(page, file.path, true);
          assert.equal(await page.locator('#example-file-panel code').textContent(), file.code, `${lesson.id}/${file.path} visible example`);
        }
        await quiz(page, lesson);
        assert.equal(await badge(page, 'lab'), 'false', 'quiz alone does not certify an unexecuted project');
        await step(page, 'practice');
        assert.ok((await page.locator('#lesson-panel').innerText()).length > 100);
        await step(page, 'lab');
        assert.equal(await page.locator('#run-code').isDisabled(), true);
        assert.equal(await page.locator('#submit-code').isDisabled(), true);
        assert.equal(await page.locator('#prepare-project').count(), 0, 'web cannot prepare local Maven');
        assert.match(await page.locator('#runtime-info').textContent(), /Windows/);
        assert.equal(await page.locator('#project-download').getAttribute('href'), `/downloads/${lesson.id}.zip`);
      }
      assert.deepEqual(requests.filter(request => request.path !== '/api/runtime'), [], 'web project browsing does not call execute or local APIs');
    });

    await caseOf('web-files-readonly-draft-isolation-and-download', page, async () => {
      await openLesson(page, firstProject);
      const file = firstProjectExercise.files.find(item => item.editable);
      const draft = `${file.source}\n// 웹 초안 보존\n\n`;
      await chooseFile(page, file.path);
      await editor(page).fill(draft);
      await readonlyPom(page, firstProjectExercise);
      await chooseFile(page, file.path);
      assert.equal(await source(page), draft);
      await openLesson(page, project);
      await openLesson(page, firstProject);
      assert.equal(await source(page), draft, 'draft survives another project');
      await page.locator('#editor-theme-select').selectOption('light');
      await page.reload();
      await editor(page).waitFor({ state: 'visible' });
      await clipboardMock(page);
      assert.equal(await source(page), draft);
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'light');
      const pending = page.waitForEvent('download');
      await page.locator('#project-download').click();
      const download = await pending;
      const filename = path.join(artifactRoot, `download-${firstProject.id}.zip`);
      await download.saveAs(filename);
      const archive = unzipSync(await readFile(filename));
      assert.match(strFromU8(archive['README.txt']), /Maven/);
      assert.equal(strFromU8(archive[`lessons/${firstProject.id}/starter/${file.path}`]), file.source, 'download remains the trusted starter, not an implicitly uploaded draft');
      assert.equal(await source(page), draft, 'download leaves the draft untouched');
      await page.locator('.editor-shell').scrollIntoViewIfNeeded();
      await capture(page, 'web-project-editor');
      await readonlyPom(page, firstProjectExercise);
      await capture(page, 'web-project-readonly-pom');
      assert.deepEqual(requests.filter(request => request.path !== '/api/runtime'), []);
    });

    await caseOf('web-professional-responsive-and-text-enlargement', page, async () => {
      const capstone = professionalLessons.find(lesson => lesson.id === 'orders-capstone');
      await openLesson(page, capstone);
      const capstoneFiles = professionalExercises.find(exercise => exercise.lessonId === capstone.id).files;
      for (const theme of ['dark', 'light', 'contrast']) {
        await page.locator('#editor-theme-select').selectOption(theme);
        for (const [suffix, file] of [['java', capstoneFiles.find(file => file.editable)], ['xml', capstoneFiles.find(file => file.path === 'pom.xml')], ['sql', capstoneFiles.find(file => file.path.endsWith('.sql'))]]) {
          await chooseFile(page, file.path);
          await page.locator('#project-file-tabs').scrollIntoViewIfNeeded();
          await capture(page, `web-project-${theme}-${suffix}`);
        }
      }
      for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await noOverflow(page);
        for (const file of capstoneFiles) {
          await chooseFile(page, file.path);
          await noOverflow(page);
        }
        await page.locator('#project-file-tabs').scrollIntoViewIfNeeded();
        await capture(page, `web-project-${viewport.width}x${viewport.height}`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      await noOverflow(page);
      await page.locator('#project-file-tabs').scrollIntoViewIfNeeded();
      await capture(page, 'web-project-mobile-200-files');
      await page.locator('#runtime-info').scrollIntoViewIfNeeded();
      await capture(page, 'web-project-mobile-200-runtime');
      await page.setViewportSize({ width: 320, height: 720 });
      await noOverflow(page);
      await page.locator('#project-file-tabs').scrollIntoViewIfNeeded();
      await capture(page, 'web-project-320-200');
      await page.locator('#desktop-install-open').click();
      await page.locator('#install-dialog').waitFor({ state: 'visible' });
      await noOverflow(page);
      await capture(page, 'web-install-dialog-320-200');
      await page.keyboard.press('Escape');
      assert.deepEqual(pageErrors, []);
    });
  } finally { await context.close(); await browser.close(); }
}

async function launchDesktop(userData) {
  const executablePath = process.env.JAVA_EDU_ELECTRON_PATH || path.join(projectRoot, 'node_modules/electron/dist/electron.exe');
  await access(executablePath); // Fail explicitly; never let electron's package import download a missing binary.
  const env = { ...process.env, JAVA_EDU_QA_DATA: userData };
  env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath, args: [path.resolve(projectRoot)], env, timeout: 60000 });
  const page = await app.firstWindow();
  page.setDefaultTimeout(10000);
  await page.locator('#workspace-grid').waitFor({ state: 'visible', timeout: 45000 });
  await clipboardMock(page);
  return { app, page };
}

async function mockDirectoryDialog(app, chosenPath, canceled = false) {
  await app.evaluate(({ dialog }, value) => {
    dialog.showOpenDialog = async () => ({ canceled: value.canceled, filePaths: value.canceled ? [] : [value.chosenPath] });
  }, { chosenPath, canceled });
}

async function settingsDialog(page) {
  await page.locator('#desktop-settings-open').click();
  await page.locator('#desktop-settings-dialog').waitFor({ state: 'visible' });
  await eventually(() => page.locator('#execution-consent').isEnabled(), true, 'settings metadata loaded');
}

async function closeSettings(page) {
  await page.locator('#desktop-settings-dialog [data-close-dialog="desktop-settings-dialog"]').first().click();
}

async function resultAfter(page, button, timeout = 45000, runningCapture) {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === (button === '#prepare-project' ? '/api/local/prepare' : '/api/execute') && response.request().method() === 'POST', { timeout });
  void response.catch(() => {});
  await page.locator(button).click();
  if (runningCapture) {
    await page.locator('#execution-output').scrollIntoViewIfNeeded();
    await capture(page, runningCapture);
  }
  const received = await response;
  const body = await received.json();
  console.log('LOCAL_RESULT', JSON.stringify({ exerciseId: received.request().postDataJSON().exerciseId, status: body.status, runtimeVersion: body.runtimeVersion, targetVersion: body.targetVersion, passed: body.passed, total: body.total, error: body.error }));
  await eventually(() => page.locator('#execution-output').getAttribute('data-status'), value => value !== 'running', 'UI settles after local response');
  return { body, request: received.request().postDataJSON(), httpStatus: received.status() };
}

async function desktopSuite() {
  const jdk8 = process.env.JAVA_EDU_JDK_8;
  const jdk21 = process.env.JAVA_EDU_JDK_21;
  const maven = process.env.JAVA_EDU_MAVEN_HOME;
  if (!jdk8 || !jdk21 || !maven) throw new Error('Desktop QA requires JAVA_EDU_JDK_8, JAVA_EDU_JDK_21 and JAVA_EDU_MAVEN_HOME pointing to approved installed tools.');
  const userData = await mkdtemp(path.join(artifactRoot, 'user-data-한글 & 25%-'));
  console.log(`ISOLATED_USER_DATA ${userData}`);
  let { app, page } = await launchDesktop(userData);
  const solutions = JSON.parse(await readFile(path.join(projectRoot, 'examples/solutions.json'), 'utf8'));
  const initialOrigin = new URL(page.url()).origin;
  const executionRequests = [];
  const observe = currentPage => currentPage.on('request', request => { if (new URL(request.url()).pathname === '/api/execute') executionRequests.push(request.postDataJSON()); });
  observe(page);
  let savedCore;
  let savedProject;
  try {
    const initial = await caseOf('desktop-first-open-tools-consent-and-isolation', page, async () => {
      assert.equal(await page.evaluate(() => window.javaEduDesktop.platform), 'win32');
      assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), userData);
      const preferences = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
      assert.equal(preferences.contextIsolation, true);
      assert.equal(preferences.nodeIntegration, false);
      assert.equal(preferences.sandbox, true);
      await openLesson(page, first);
      const runtime = await page.evaluate(() => window.javaEduDesktop.getSettings());
      assert.equal(runtime.mode, 'local');
      assert.equal(runtime.available, false);
      assert.equal(runtime.consent.accepted, false);
      assert.equal(runtime.runtimes.some(item => item.available), false);
      assert.equal(await page.locator('#run-code').isDisabled(), true);
      assert.match(await page.locator('#runtime-info').textContent(), /JDK/);
      await settingsDialog(page);
      assert.equal(await page.locator('#execution-consent').isChecked(), false);
      await capture(page, 'desktop-first-settings');
      await mockDirectoryDialog(app, '', true);
      await page.locator('#jdk-register-8').click();
      await eventually(() => page.locator('#jdk-register-8').isEnabled(), true, 'cancelled folder selection settles');
      assert.equal((await page.evaluate(() => window.javaEduDesktop.getSettings())).runtimes.some(item => item.available), false);
      assert.equal(executionRequests.length, 0, 'startup and cancelled tool selection run no student code');
    });
    if (!initial) return;

    const configured = await caseOf('desktop-tool-registration-real-probes-and-explicit-consent', page, async () => {
      await mockDirectoryDialog(app, jdk21);
      await page.locator('#jdk-register-8').click();
      await eventually(() => page.locator('#jdk-register-8').isEnabled(), true, 'wrong-version tool inspection settles', 30000);
      assert.equal((await page.evaluate(() => window.javaEduDesktop.getSettings())).runtimes.find(item => item.javaVersion === 8).available, false);
      assert.match(await page.locator('#desktop-settings-status').textContent(), /8/);
      for (const [version, directory] of [[8, jdk8], [21, jdk21]]) {
        await mockDirectoryDialog(app, directory);
        await page.locator(`#jdk-register-${version}`).click();
        await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).runtimes.find(item => item.javaVersion === version).available, true, `JDK ${version} is actually inspected`, 30000);
        await eventually(() => page.locator(`#jdk-register-${version}`).isEnabled(), true, 'settings controls settle');
      }
      await mockDirectoryDialog(app, maven);
      await page.locator('#maven-register').click();
      await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).maven.available, true, 'Maven distribution registered');
      assert.equal((await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, false);
      await page.locator('#execution-consent').check();
      await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, true, 'explicit consent persisted');
      await eventually(() => page.locator('#execution-consent').isEnabled(), true, 'consent saving settles');
      await capture(page, 'desktop-configured-settings');
      await closeSettings(page);
      await eventually(() => page.locator('#run-code').isEnabled(), true, 'registered tools and consent enable core execution');
      assert.equal(executionRequests.length, 0, 'settings do not execute learner code');
    });
    if (!configured) return;

    await caseOf('desktop-core-method-real-jvm8-and21-run-submit', page, async () => {
      await editor(page).fill(solutions[first.exerciseId]);
      await page.locator('#runtime-version-select').selectOption('8');
      const sample = await resultAfter(page, '#run-code', 60000, 'desktop-core-running');
      assert.equal(sample.body.status, 'passed');
      assert.equal(sample.body.runtimeVersion, 8);
      assert.equal(sample.body.targetVersion, 8);
      assert.equal(await badge(page, 'lab'), 'false', 'run is not submit');
      await quiz(page, first);
      await step(page, 'lab');
      const submission8 = await resultAfter(page, '#submit-code');
      assert.equal(submission8.body.status, 'passed');
      assert.equal(submission8.body.runtimeVersion, 8);
      assert.ok(submission8.body.total > sample.body.total);
      assert.equal(await badge(page, 'lab'), 'true');
      await page.locator('#runtime-version-select').selectOption('21');
      const submission21 = await resultAfter(page, '#submit-code');
      assert.equal(submission21.body.status, 'passed');
      assert.equal(submission21.body.runtimeVersion, 21);
      assert.equal(submission21.request.source, solutions[first.exerciseId]);
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-core-passed-jvm21');
    });

    await caseOf('desktop-core-class-and-real-failure-results', page, async () => {
      await openLesson(page, classLesson);
      await editor(page).fill(solutions[classLesson.exerciseId]);
      const classResult = await resultAfter(page, '#submit-code');
      assert.equal(classResult.body.status, 'passed');
      assert.equal(classResult.body.runtimeVersion, 21);
      await openLesson(page, first);
      await editor(page).fill('class Solution { public boolean sameCode(String a,String b) { return 없는변수; } }');
      const compile = await resultAfter(page, '#submit-code');
      assert.equal(compile.body.status, 'compile_error');
      assert.match(compile.body.compilerOutput, /없는변수/);
      assert.equal(await badge(page, 'lab'), 'false');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-korean-compiler-error');
      await editor(page).fill(coreExercises.find(item => item.id === first.exerciseId).template);
      const failed = await resultAfter(page, '#submit-code');
      assert.equal(failed.body.status, 'failed');
      assert.ok(failed.body.passed < failed.body.total);
      await editor(page).fill('class Solution { public boolean sameCode(String a,String b) { System.exit(7); return false; } }');
      const runtime = await resultAfter(page, '#run-code');
      assert.equal(runtime.body.status, 'runtime_error');
    });

    await caseOf('desktop-consent-revocation-blocks-code-without-losing-draft', page, async () => {
      const before = executionRequests.length;
      const draft = `${solutions[first.exerciseId]}\n// 동의 철회 중에도 유지`;
      await editor(page).fill(draft);
      await settingsDialog(page);
      await page.locator('#execution-consent').uncheck();
      await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, false, 'consent revocation is saved');
      await closeSettings(page);
      assert.equal(await page.locator('#run-code').isDisabled(), true);
      assert.equal(await page.locator('#submit-code').isDisabled(), true);
      assert.equal(await source(page), draft);
      await settingsDialog(page);
      await page.locator('#execution-consent').check();
      await eventually(async () => (await page.evaluate(() => window.javaEduDesktop.getSettings())).consent.accepted, true, 'consent can be granted again');
      await closeSettings(page);
      await eventually(() => page.locator('#run-code').isEnabled(), true, 'run becomes available after explicit consent');
      assert.equal(executionRequests.length, before, 'consent changes never run learner code automatically');
    });

    await caseOf('desktop-running-java-cancel-and-draft-preservation', page, async () => {
      const cancellable = 'class Solution { public boolean sameCode(String a,String b) { try { new java.io.File("qa-cancel-started.txt").createNewFile(); } catch(java.io.IOException e) { throw new RuntimeException(e); } while(true) {} } }';
      await editor(page).fill(cancellable);
      const before = executionRequests.length;
      await page.locator('#run-code').click();
      await eventually(() => executionRequests.length, before + 1, 'actual local execution requested');
      const jobsRoot = path.join(userData, 'java-edu/jobs');
      const job = await eventually(async () => {
        for (const entry of await readdir(jobsRoot).catch(() => [])) {
          const directory = path.join(jobsRoot, entry);
          if (entry.startsWith('job-') && await access(path.join(directory, 'qa-cancel-started.txt')).then(() => true, () => false)) return directory;
        }
        return null;
      }, value => Boolean(value), 'Java itself writes a marker before cancellation', 30000);
      await page.locator('#cancel-execution').click();
      await eventually(() => page.locator('#execution-output').getAttribute('data-status'), 'cancelled', 'user cancellation is visible');
      await eventually(() => access(job).then(() => true, () => false), false, 'cancelled job workspace is cleaned', 10000);
      assert.equal(await source(page), cancellable);
      assert.equal(await badge(page, 'lab'), 'false');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-cancelled');
    });

    const prepared = await caseOf('desktop-spring-h2-prepare-is-required-and-not-achievement', page, async () => {
      await openLesson(page, project);
      await eventually(() => page.locator('#prepare-project').isEnabled(), true, 'project metadata ready');
      assert.equal(await page.locator('#run-code').isDisabled(), true);
      assert.equal(await page.locator('#submit-code').isDisabled(), true);
      assert.match(await page.locator('#execution-state').textContent(), /준비/);
      const before = await source(page);
      await readonlyPom(page, projectExercise);
      await chooseFile(page, projectExercise.files.find(file => file.editable).path);
      const preparation = await resultAfter(page, '#prepare-project', 360000, 'desktop-spring-h2-preparing');
      assert.equal(preparation.body.status, 'passed', preparation.body.stderr || preparation.body.stdout);
      assert.equal(preparation.body.prepared, true);
      assert.equal(preparation.body.runtimeVersion, 21);
      assert.equal(preparation.body.targetVersion, 17);
      assert.equal(preparation.request.files, undefined, 'prepare does not submit the learner draft');
      assert.equal(preparation.request.source, undefined);
      assert.equal(await badge(page, 'lab'), 'false', 'reference preparation is not learner completion');
      assert.equal(await source(page), before, 'preparation leaves learner source untouched');
      await eventually(() => page.locator('#run-code').isEnabled(), true, 'successful preparation enables project execution');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-spring-h2-prepared');
    });

    if (prepared) await caseOf('desktop-spring-h2-reference-files-real-submit', page, async () => {
      const expectedFiles = {};
      for (const file of project.professionalExercise.files.filter(file => file.editable)) {
        const text = await readFile(path.join(projectRoot, 'curriculum/professional', file.referencePath), 'utf8');
        expectedFiles[file.path] = text;
        await chooseFile(page, file.path);
        await editor(page).fill(text);
      }
      await quiz(page, project);
      await step(page, 'lab');
      const submitted = await resultAfter(page, '#submit-code', 150000);
      assert.equal(submitted.body.status, 'passed', submitted.body.stderr || submitted.body.stdout);
      assert.equal(submitted.body.runtimeVersion, 21);
      assert.equal(submitted.body.targetVersion, 17);
      assert.ok(submitted.body.checks.length > 0 && submitted.body.checks.every(check => check.passed));
      assert.deepEqual(submitted.request.files, expectedFiles);
      assert.equal(Object.hasOwn(submitted.request.files, 'pom.xml'), false);
      assert.equal(await badge(page, 'lab'), 'true');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-spring-h2-submitted');
    });

    await caseOf('desktop-restart-new-port-preserves-progress-theme-and-drafts', page, async () => {
      await openLesson(page, first);
      savedCore = `${solutions[first.exerciseId]}\n// 재시작 초안\n\n`;
      await editor(page).fill(savedCore);
      await page.locator('#editor-theme-select').selectOption('contrast');
      await openLesson(page, project);
      const editable = projectExercise.files.find(file => file.editable);
      await chooseFile(page, editable.path);
      savedProject = `${editable.source}\n// 프로젝트 재시작 초안\n`;
      await editor(page).fill(savedProject);
      await chooseFile(page, 'pom.xml');
      const before = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.javaEduDesktop.storage.getItem(key)])), [storageKey, preferencesKey]);
      assert.ok(before[storageKey].includes('재시작 초안'));
      await app.close();
      ({ app, page } = await launchDesktop(userData));
      observe(page);
      const newOrigin = new URL(page.url()).origin;
      assert.notEqual(newOrigin, initialOrigin, 'actual app restart binds a different port');
      const restored = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, window.javaEduDesktop.storage.getItem(key)])), [storageKey, preferencesKey]);
      assert.equal(restored[preferencesKey], before[preferencesKey]);
      const beforeProgress = JSON.parse(before[storageKey]);
      const afterProgress = JSON.parse(restored[storageKey]);
      for (const key of ['quizPassed', 'drafts', 'fileDrafts']) assert.deepEqual(afterProgress[key], beforeProgress[key], `${key} survives port change`);
      await openLesson(page, first);
      assert.equal(await source(page), savedCore);
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'contrast');
      assert.equal(await badge(page, 'quiz'), 'true');
      await openLesson(page, project);
      await chooseFile(page, editable.path);
      assert.equal(await source(page), savedProject);
      assert.equal(await page.locator('#run-code').isDisabled(), true, 'new app session requires fresh project preparation');
      assert.equal(await page.locator('#prepare-project').getAttribute('data-prepared'), 'false');
      await page.locator('#runtime-info').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-restarted-project');
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      await noOverflow(page);
      await settingsDialog(page);
      await capture(page, 'desktop-settings-200');
      await noOverflow(page);
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(720, 560));
      await eventually(() => page.evaluate(() => innerWidth), width => width < 800, 'native app minimum window size');
      await noOverflow(page);
      await capture(page, 'desktop-settings-minimum-200');
      await page.locator('#execution-consent').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-settings-minimum-200-consent');
      console.log('APP_VIEWPORT', JSON.stringify(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, rootFont: getComputedStyle(document.documentElement).fontSize }))));
      await closeSettings(page);
      await page.locator('#project-file-tabs').scrollIntoViewIfNeeded();
      await capture(page, 'desktop-project-200');
    });
  } finally { await app.close().catch(() => {}); }
}

await mkdir(artifactRoot, { recursive: true });
try {
  if (!['all', 'web', 'desktop'].includes(mode)) throw new Error('JAVA_EDU_QA_MODE must be all, web, or desktop.');
  if (mode !== 'desktop') await webSuite();
  if (mode !== 'web') await desktopSuite();
} catch (error) {
  results.push({ name: 'environment', status: 'BLOCKED', message: error.message });
  console.error(error.stack);
}
const report = { recordedAt: new Date().toISOString(), mode, node: process.version, artifacts: artifactRoot, results };
await writeFile(path.join(artifactRoot, `results-${mode}-${Date.now()}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!results.length || results.some(result => result.status !== 'PASS')) process.exitCode = 1;
