import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Browser interaction tests use an isolated context and mocked execution API.
// They do not submit source code to the real execution provider.
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const artifactRoot = process.env.QA_ARTIFACT_DIR || path.resolve(projectRoot, 'work/java-edu-qa');
const storageKey = 'java-edu:progress:v1';
const editorPreferencesKey = 'java-edu:editor-preferences:v1';
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
const results = [];

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error.cause || error;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Start the parent-owned development server at ${baseUrl} before running browser QA. ${lastError?.message || ''}`);
}

function expectEventually(read, expected, message, timeout = 5_000) {
  return (async () => {
    const deadline = Date.now() + timeout;
    let actual;
    do {
      actual = await read();
      if (typeof expected === 'function' ? expected(actual) : actual === expected) return actual;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < deadline);
    assert.fail(`${message}; received ${JSON.stringify(actual)}`);
  })();
}

async function noViewportOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, `viewport overflow: ${JSON.stringify(dimensions)}`);
}

async function activeTabVisible(page) {
  const geometry = await page.evaluate(() => {
    const strip = document.querySelector('.lesson-tabs');
    const tab = strip.querySelector('[aria-selected="true"]');
    const container = strip.getBoundingClientRect();
    const selected = tab.getBoundingClientRect();
    return { viewport: innerWidth, scrollLeft: strip.scrollLeft, clientWidth: strip.clientWidth, scrollWidth: strip.scrollWidth, containerLeft: container.left, containerRight: container.right, containerTop: container.top, containerBottom: container.bottom, tabLeft: selected.left, tabRight: selected.right, tabTop: selected.top, tabBottom: selected.bottom };
  });
  if (process.env.QA_TRACE_SCREENSHOTS === '1') console.log('ACTIVE_TAB', JSON.stringify(geometry));
  assert.ok(geometry.tabLeft >= geometry.containerLeft - 1 && geometry.tabRight <= geometry.containerRight + 1 && geometry.tabTop >= geometry.containerTop - 1 && geometry.tabBottom <= geometry.containerBottom + 1, `selected tab is clipped: ${JSON.stringify(geometry)}`);
}

async function screenshot(page, name, fullPage = true, options = {}) {
  const position = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  if (fullPage) await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  if (process.env.QA_TRACE_SCREENSHOTS === '1') {
    console.log('CAPTURE', name, JSON.stringify(await page.evaluate(() => {
      const skip = document.querySelector('.skip-link');
      const rect = skip?.getBoundingClientRect();
      return { active: document.activeElement?.id || document.activeElement?.tagName, scrollY, skipFocused: document.activeElement === skip, skipTop: rect?.top, skipBottom: rect?.bottom };
    })));
  }
  try {
    await page.screenshot({ path: path.join(artifactRoot, `${name}.png`), fullPage, ...options });
  } finally {
    if (fullPage) await page.evaluate(({ x, y }) => window.scrollTo({ top: y, left: x, behavior: 'instant' }), position);
  }
}

function executionResult(request, overrides = {}) {
  return {
    requestId: request.requestId,
    status: 'passed',
    runtimeVersion: 21,
    targetVersion: 8,
    stdout: 'QA sample output\n',
    stderr: '',
    compilerOutput: '',
    checks: [{ name: '내용 비교', passed: true }, { name: 'null 경계', passed: true }],
    passed: 2,
    total: 2,
    provider: 'Wandbox',
    durationMs: 120,
    ...overrides,
  };
}

async function mockApi(context, options = {}) {
  const state = {
    requests: [],
    settled: [],
    unexpected: [],
    respond: request => ({ status: 200, body: executionResult(request) }),
    ...options,
  };
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseUrl).origin) {
      state.unexpected.push(url.toString());
      return route.abort();
    }
    if (url.pathname === '/api/runtime') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          provider: 'Wandbox',
          available: true,
          runtime: { javaVersion: 21, compiler: 'openjdk-jdk-21+35' },
          supportedTargets: [8, 11, 17, 21],
          notice: '코드는 실행·제출 시 외부 제공자 Wandbox에 전송됩니다.',
          checkedAt: '2026-10-12T03:00:00.000Z',
          ...state.runtime,
        }),
      });
    }
    if (url.pathname === '/api/execute') {
      const request = route.request().postDataJSON();
      state.requests.push(request);
      const response = await state.respond(request);
      if (response.abort) return route.abort('failed');
      await route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        body: response.raw ?? JSON.stringify(response.body),
      }).catch(error => {
        // A stale request may be aborted by the application or context teardown.
        if (!/closed|disposed|cancel|intercept/i.test(error.message)) throw error;
      });
      state.settled.push(request.requestId);
      return;
    }
    state.unexpected.push(url.toString());
    return route.abort();
  });
  return state;
}

function deferred() {
  let resolve;
  const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

async function openLesson(page, lesson, step = 'theory', version = 21) {
  await page.goto(`${baseUrl}/#lesson=${encodeURIComponent(lesson.id)}&step=${step}&version=${version}`);
  await page.locator('#workspace-grid').waitFor({ state: 'visible' });
  await expectEventually(() => page.locator('#lesson-title').textContent(), value => value?.includes(lesson.title), 'requested lesson title');
  await expectEventually(() => page.locator(`[data-step="${step}"]`).getAttribute('aria-selected'), 'true', 'requested lesson step');
}

async function stepTo(page, step) {
  await page.locator(`[data-step="${step}"]`).click();
  await expectEventually(() => page.locator(`[data-step="${step}"]`).getAttribute('aria-selected'), 'true', 'selected step');
  assert.equal(await page.locator('#lesson-panel').getAttribute('aria-labelledby'), `tab-${step}`);
}

async function storedProgress(page) {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, storageKey);
}

async function visibleLessonIds(page) {
  return page.locator('#lesson-list [data-lesson-id]').evaluateAll(nodes => nodes.map(node => node.dataset.lessonId));
}

function editorInput(page) {
  return page.locator('#code-editor [role="textbox"]');
}

function editorScroller(page) {
  return page.locator('#code-editor .cm-scroller');
}

async function readEditorSource(page) {
  // A virtualized editor's DOM text is not the complete document. Read through
  // the public full-source copy action, using an isolated clipboard mock.
  const activeElement = await page.evaluateHandle(() => document.activeElement);
  const denied = await page.evaluate(() => window.qaClipboardDenied);
  await page.evaluate(() => { window.qaClipboardDenied = false; window.qaClipboardText = undefined; });
  try {
    await page.locator('#copy-code').click();
    return await expectEventually(() => page.evaluate(() => window.qaClipboardText), value => typeof value === 'string', 'copy exposes the complete editor document');
  } finally {
    await page.evaluate(value => { window.qaClipboardDenied = value; }, denied);
    await activeElement.evaluate(element => element?.isConnected && element.focus({ preventScroll: true })).catch(() => {});
    await activeElement.dispose();
  }
}

async function assertDraft(page, exerciseId, expected) {
  await expectEventually(async () => (await storedProgress(page))?.drafts.find(entry => entry.exerciseId === exerciseId)?.source, expected, 'stored draft retains the exact source');
}

async function tokenPalette(page, scope) {
  return page.locator(scope).evaluate(element => {
    const colors = {};
    for (const category of ['keyword', 'class', 'type', 'variable', 'method', 'string', 'comment', 'number']) {
      const token = element.querySelector(`.tok-${category}`);
      if (token) colors[category] = getComputedStyle(token).color;
    }
    return colors;
  });
}

async function chooseTheme(page, theme) {
  await page.locator('#editor-theme-select').selectOption(theme);
  await expectEventually(() => page.locator('[data-editor-theme]').first().getAttribute('data-editor-theme'), theme, 'requested theme reaches the rendered code');
}

function contrastRatio(foreground, background) {
  const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

async function achievement(page, kind) {
  return page.locator(`#lesson-achievements [data-achievement="${kind}"]`).getAttribute('data-complete');
}

async function answerQuiz(page, lesson, correct = true) {
  for (const question of lesson.quiz) {
    const selected = correct ? question.correctIndex : (question.correctIndex + 1) % question.options.length;
    await page.locator(`#quiz-form input[name="quiz-${question.id}"][value="${selected}"]`).check();
  }
}

async function completeQuiz(page, lesson) {
  await stepTo(page, 'quiz');
  await answerQuiz(page, lesson);
  await page.locator('#quiz-submit').click();
  await expectEventually(() => achievement(page, 'quiz'), 'true', 'all quiz answers grant quiz achievement');
}

async function waitForOutput(page, expected) {
  return expectEventually(() => page.locator('#execution-output').getAttribute('data-status'), expected, 'execution output state');
}

async function run(browser, name, test, options = {}) {
  if (filter && !filter.test(name)) return;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => {
        if (window.qaClipboardDenied) throw new DOMException('QA denied', 'NotAllowedError');
        window.qaClipboardText = text;
      },
    } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const started = Date.now();
  try {
    await test({ context, page });
    assert.deepEqual(pageErrors, [], 'uncaught browser errors');
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    const evidence = `failure-${name.replace(/[^a-z0-9-]/gi, '-')}`;
    await screenshot(page, evidence).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started, screenshot: `${evidence}.png` });
    console.error(`FAIL ${name}: ${error.stack}`);
  } finally {
    await context.close();
  }
}

async function main() {
  await waitForServer();
  await mkdir(artifactRoot, { recursive: true });
  const { lessons: coreLessons } = await import('../dist/data/curriculum.js');
  const { exercises: coreExercises } = await import('../dist/data/exercises.js');
  const { professionalLessons, professionalExercises } = await import('../dist/data/professional.js');
  const lessons = [...coreLessons, ...professionalLessons];
  const exercises = [...coreExercises, ...professionalExercises];
  assert.ok(lessons.length >= 2, 'real lessons are present');
  const first = lessons.find(lesson => lesson.minVersion === 8);
  const other = lessons.find(lesson => lesson.id !== first.id && lesson.minVersion === 8);
  const firstExercise = exercises.find(exercise => exercise.lessonId === first.id);
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== '0',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const browserVersion = browser.version();
  try {
    await run(browser, 'lesson-steps-sources-and-disclosure', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first);
      assert.equal(await page.locator('[role="tab"]').count(), 5);
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
      assert.ok(await page.locator('#source-list a[href^="https://"]').count() > 0, 'official references are visible');
      assert.match(await page.locator('.evidence-disclaimer').textContent(), /통계가 아닙니다/);
      await screenshot(page, 'desktop-theory');
      await screenshot(page, 'desktop-top', false);
      for (const step of ['example', 'quiz', 'practice', 'lab']) {
        await stepTo(page, step);
        assert.ok((await page.locator('#lesson-panel').innerText()).trim().length > 50, `${step} has substantive content`);
        await noViewportOverflow(page);
        if (step === 'example') await screenshot(page, 'desktop-example');
        if (step === 'lab') {
          assert.equal(await readEditorSource(page), firstExercise.template);
          const labText = await page.locator('#lesson-panel').innerText();
          assert.match(labText, /Wandbox/);
          assert.match(labText, /전송/);
          assert.match(labText, /21/);
          await screenshot(page, 'desktop-ide');
        }
      }
      assert.equal(api.requests.length, 0, 'navigation never submits code automatically');
      assert.deepEqual(api.unexpected, []);
    });

    await run(browser, 'all-lessons-render-five-learning-steps', async ({ context, page }) => {
      const api = await mockApi(context);
      for (const lesson of lessons) {
        await openLesson(page, lesson);
        for (const step of ['example', 'quiz', 'practice', 'lab']) {
          await stepTo(page, step);
          assert.ok((await page.locator('#lesson-panel').innerText()).trim().length > 40, `${lesson.id}/${step} is not empty`);
        }
        const exercise = exercises.find(item => item.lessonId === lesson.id);
        assert.ok(exercise, `${lesson.id} has a coding task`);
        const initialFile = exercise.files?.find(file => file.editable) || exercise.files?.[0];
        assert.equal(await readEditorSource(page), initialFile ? initialFile.source : exercise.template);
      }
      assert.equal(api.requests.length, 0);
    });

    await run(browser, 'versions-search-and-empty-result-recovery', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first);
      for (const version of [8, 11, 17, 21]) {
        await page.locator('#version-select').selectOption(String(version));
        const expected = lessons.filter(lesson => lesson.minVersion <= version).map(lesson => lesson.id).sort();
        await expectEventually(() => visibleLessonIds(page), ids => JSON.stringify(ids.sort()) === JSON.stringify(expected), `available lessons for Java ${version}`);
      }
      await page.locator('#lesson-search').fill('no-result-qa-unique-token');
      await expectEventually(() => visibleLessonIds(page), ids => ids.length === 0, 'search has no matches');
      assert.ok((await page.locator('#lesson-list').innerText()).trim().length > 0, 'empty search has an explanatory state');
      assert.ok((await page.locator('#lesson-title').textContent()).trim().length > 0, 'current lesson stays available');
      await page.locator('#lesson-search').fill('<img src=x onerror="window.qaSearchExecuted=true">');
      assert.equal(await page.evaluate(() => window.qaSearchExecuted), undefined);
      await page.locator('#lesson-search').fill('');
      await expectEventually(() => visibleLessonIds(page), ids => ids.length === lessons.length, 'clearing search restores lessons');
      await page.locator('#lesson-search').fill(other.title);
      await expectEventually(() => visibleLessonIds(page), ids => ids.includes(other.id), 'title search finds intended lesson');
      await page.locator('#lesson-search').fill('');
      for (const track of ['transition', 'advanced', 'all']) {
        await page.locator(`[data-track="${track}"]`).click();
        const expected = lessons.filter(lesson => track === 'all' || lesson.track === track || lesson.track === 'both').map(lesson => lesson.id).sort();
        await expectEventually(() => visibleLessonIds(page), ids => JSON.stringify(ids.sort()) === JSON.stringify(expected), `${track} track membership`);
        assert.equal(await page.locator(`[data-track="${track}"]`).getAttribute('aria-pressed'), 'true');
      }
    });

    await run(browser, 'deeplinks-invalid-values-and-version-gating', async ({ context, page }) => {
      await mockApi(context);
      for (const fragment of ['lesson=not-a-lesson&step=lab&version=21', 'lesson=java-basics&step=unknown&version=21', 'lesson=java-basics&step=theory&version=999', 'lesson=%3Cscript%3E&step=%00&version=8']) {
        await page.goto(`${baseUrl}/#${fragment}`);
        await page.locator('#workspace-grid').waitFor({ state: 'visible' });
        const title = await page.locator('#lesson-title').textContent();
        assert.ok(lessons.some(lesson => title.includes(lesson.title)), `invalid fragment recovers a known lesson: ${fragment}`);
        assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
        assert.ok(['8', '11', '17', '21'].includes(await page.locator('#version-select').inputValue()));
      }
      const newest = [...lessons].sort((a, b) => b.minVersion - a.minVersion)[0];
      assert.ok(newest.minVersion > 8, 'version boundary is represented');
      await page.goto(`${baseUrl}/#lesson=${newest.id}&step=lab&version=8`);
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#version-select').inputValue(), '8');
      assert.ok(!(await page.locator('#lesson-title').textContent()).includes(newest.title), 'unsupported lesson is not accessible under Java 8');
      assert.ok((await page.locator('#lesson-panel').innerText()).trim().length > 0);
      await openLesson(page, newest, 'lab', newest.minVersion);
    });

    await run(browser, 'quiz-incomplete-wrong-retry-and-persistence', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'quiz');
      await page.locator('#quiz-submit').click();
      assert.equal(await achievement(page, 'quiz'), 'false', 'incomplete quiz is not an achievement');
      await answerQuiz(page, first, false);
      await stepTo(page, 'theory');
      await stepTo(page, 'quiz');
      assert.equal(await page.locator('#quiz-form input:checked').count(), first.quiz.length, 'answers survive tab navigation');
      await page.locator('#quiz-submit').click();
      await page.locator('#quiz-retry').waitFor({ state: 'visible' });
      assert.equal(await achievement(page, 'quiz'), 'false', 'wrong answers do not grant achievement');
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
      await page.locator('#quiz-retry').click();
      await answerQuiz(page, first, true);
      await page.locator('#quiz-submit').click();
      await expectEventually(() => achievement(page, 'quiz'), 'true', 'correct quiz is recorded');
      assert.equal(await achievement(page, 'lab'), 'false');
      assert.equal(await page.locator('#overall-completed').textContent(), '0', 'quiz alone is not a completed lesson');
      await page.reload();
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.equal(await achievement(page, 'quiz'), 'true', 'quiz achievement survives reload');
      assert.equal(await achievement(page, 'lab'), 'false');
    });

    await run(browser, 'browser-history-and-continue-learning', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first);
      await stepTo(page, 'example');
      await page.locator(`#lesson-list [data-lesson-id="${other.id}"]`).click();
      await page.goBack();
      await expectEventually(() => page.locator('#lesson-title').textContent(), value => value.includes(first.title), 'back restores previous lesson');
      assert.equal(await page.locator('#tab-example').getAttribute('aria-selected'), 'true', 'back restores the previous step');
      await page.goForward();
      await expectEventually(() => page.locator('#lesson-title').textContent(), value => value.includes(other.title), 'forward restores next lesson');
      await page.locator(`#lesson-list [data-lesson-id="${first.id}"]`).click();
      await completeQuiz(page, first);
      await page.locator('#lesson-search').fill('no-result-for-continue-qa');
      await page.locator('#continue-button').click();
      await expectEventually(() => page.locator('#lesson-title').textContent(), value => value.includes(first.title), 'continue restores the unfinished lesson');
      assert.equal(await page.locator('#lesson-search').inputValue(), '', 'continue recovers from incompatible search filters');
      assert.equal(await page.locator('#tab-lab').getAttribute('aria-selected'), 'true', 'quiz achiever continues to the outstanding code task');
    });

    await run(browser, 'design-notes-persist-without-automatic-achievement', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'practice');
      const note = 'QA 설계 판단: null과 실패 계약을 설명합니다. <tag> 그대로 보존';
      await page.locator('#design-notes').fill(note);
      await stepTo(page, 'lab');
      await stepTo(page, 'practice');
      assert.equal(await page.locator('#design-notes').inputValue(), note);
      assert.equal(await achievement(page, 'quiz'), 'false');
      assert.equal(await achievement(page, 'lab'), 'false');
      await page.reload();
      await page.locator('#design-notes').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#design-notes').inputValue(), note);
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
      await screenshot(page, 'desktop-practice-long-content');
    });

    await run(browser, 'code-drafts-lesson-isolation-reset-and-undo', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      const draft = `${firstExercise.template}\n// QA draft: 한글과 <tag> 보존`;
      await editorInput(page).fill(draft);
      await stepTo(page, 'practice');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), draft);
      await page.locator(`#lesson-list [data-lesson-id="${other.id}"]`).click();
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), exercises.find(item => item.lessonId === other.id).template, 'another lesson keeps its own source');
      await page.locator(`#lesson-list [data-lesson-id="${first.id}"]`).click();
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), draft);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await readEditorSource(page), draft, 'source survives reload');
      await page.locator('#lab-reset').click();
      assert.equal(await readEditorSource(page), firstExercise.template);
      await page.locator('#lab-undo').click();
      assert.equal(await readEditorSource(page), draft, 'undo restores the exact source');
      const immediateDraft = `${draft}\n// immediate reload`;
      await editorInput(page).fill(immediateDraft);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await readEditorSource(page), immediateDraft, 'immediate reload flushes the latest edit');
      assert.equal(api.requests.length, 0, 'editing or reset never sends source');
    });

    await run(browser, 'run-submit-and-two-achievement-completion', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first);
      await completeQuiz(page, first);
      await stepTo(page, 'lab');
      const submitted = `${firstExercise.template}\n// QA source snapshot`;
      await editorInput(page).fill(submitted);
      await page.locator('#run-code').click();
      await waitForOutput(page, 'passed');
      assert.equal(api.requests.at(-1).action, 'run');
      assert.equal(api.requests.at(-1).source, submitted);
      assert.equal(api.requests.at(-1).exerciseId, firstExercise.id);
      assert.match(api.requests.at(-1).requestId, /^[A-Za-z0-9_-]{1,80}$/);
      assert.equal(await achievement(page, 'lab'), 'false', 'sample execution does not grant submit achievement');
      api.respond = request => ({ body: executionResult(request, { status: 'failed', checks: [{ name: '정상 입력', passed: true }, { name: 'null 입력', passed: false }], passed: 1 }) });
      await page.locator('#submit-code').click();
      await waitForOutput(page, 'failed');
      assert.equal(await achievement(page, 'lab'), 'false', 'partial success is not completion');
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
      api.respond = request => ({ body: executionResult(request) });
      await page.locator('#submit-code').click();
      await waitForOutput(page, 'passed');
      assert.equal(api.requests.at(-1).action, 'submit');
      await expectEventually(() => achievement(page, 'lab'), 'true', 'all submit checks grant code achievement');
      assert.equal(await page.locator('#overall-completed').textContent(), '1');
      assert.equal(await page.locator(`#lesson-list [data-lesson-id="${first.id}"]`).getAttribute('data-complete'), 'true');
      await screenshot(page, 'desktop-submit-passed');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await screenshot(page, 'desktop-submit-passed-result', false);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await achievement(page, 'quiz'), 'true');
      assert.equal(await achievement(page, 'lab'), 'true');
      assert.equal(await page.locator('#overall-completed').textContent(), '1');
      await editorInput(page).fill(`${submitted}\n// edited after passing`);
      await expectEventually(() => achievement(page, 'lab'), 'false', 'a changed draft is not the previously passed source');
      assert.equal(await achievement(page, 'quiz'), 'true');
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
    });

    await run(browser, 'execution-error-states-and-safe-output', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      for (const status of ['compile_error', 'runtime_error', 'timeout', 'provider_error']) {
        const marker = `QA ${status} diagnostic`;
        api.respond = request => ({ body: executionResult(request, { status, stdout: '', stderr: marker, compilerOutput: marker, checks: [], passed: 0, total: 0 }) });
        await page.locator('#submit-code').click();
        await waitForOutput(page, status);
        assert.ok((await page.locator('#execution-output').innerText()).includes(marker), `${status} retains diagnostic evidence`);
        assert.equal(await achievement(page, 'lab'), 'false');
      }
      const payload = '<img src=x onerror="window.qaOutputExecuted=true"><script>window.qaOutputExecuted=true</script>';
      api.respond = request => ({ body: executionResult(request, { status: 'runtime_error', stdout: payload, stderr: payload, compilerOutput: payload, checks: [], passed: 0, total: 0 }) });
      await page.locator('#run-code').click();
      await waitForOutput(page, 'runtime_error');
      assert.ok((await page.locator('#execution-output').innerText()).includes(payload), 'provider output appears literally');
      assert.equal(await page.locator('#execution-output img, #execution-output script').count(), 0);
      assert.equal(await page.evaluate(() => window.qaOutputExecuted), undefined);
      assert.equal(await achievement(page, 'lab'), 'false');
    });

    await run(browser, 'new-failing-submit-revokes-the-same-source-achievement', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first);
      await completeQuiz(page, first);
      await stepTo(page, 'lab');
      const source = await readEditorSource(page);
      for (const status of ['failed', 'compile_error', 'runtime_error', 'timeout']) {
        api.respond = request => ({ body: executionResult(request) });
        await page.locator('#submit-code').click();
        await waitForOutput(page, 'passed');
        assert.equal(await achievement(page, 'lab'), 'true');
        assert.equal(await page.locator('#overall-completed').textContent(), '1');
        api.respond = request => ({ body: executionResult(request, { status, checks: [{ name: '재검증 실패', passed: false }], passed: 0, total: 1 }) });
        await page.locator('#submit-code').click();
        await waitForOutput(page, status);
        assert.equal(await readEditorSource(page), source, 'same source is re-evaluated');
        assert.equal(await achievement(page, 'lab'), 'false', `${status} revokes current code achievement`);
        assert.equal(await achievement(page, 'quiz'), 'true');
        assert.equal(await page.locator('#overall-completed').textContent(), '0');
      }
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await achievement(page, 'lab'), 'false', 'revocation survives reload');
    });

    await run(browser, 'mobile-long-diagnostic-output-stays-internal', async ({ context, page }) => {
      const diagnostic = `Solution.java:3: error: cannot find symbol\n${'long_identifier_'.repeat(120)}\n  location: class Solution\n1 error`;
      await mockApi(context, { respond: request => ({ body: executionResult(request, { status: 'compile_error', stdout: '', stderr: '', compilerOutput: diagnostic, checks: [], passed: 0, total: 0 }) }) });
      await openLesson(page, first, 'lab');
      await page.locator('#submit-code').click();
      await waitForOutput(page, 'compile_error');
      await noViewportOverflow(page);
      const output = page.locator('#execution-output pre');
      const scroll = await output.evaluate(element => {
        const width = element.clientWidth;
        element.scrollLeft = 120;
        const result = { width, scrollWidth: element.scrollWidth, left: element.scrollLeft };
        element.scrollLeft = 0;
        return result;
      });
      assert.ok(scroll.scrollWidth > scroll.width && scroll.left > 0, 'long compiler diagnostics have their own horizontal scroll');
      assert.equal(await achievement(page, 'lab'), 'false');
      await screenshot(page, 'mobile-compile-error');
      await page.locator('#execution-output').scrollIntoViewIfNeeded();
      await screenshot(page, 'mobile-compile-error-result', false);
    }, { viewport: { width: 390, height: 844 } });

    await run(browser, 'empty-source-and-utf8-payload-limit', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      await editorInput(page).fill('');
      await page.locator('#run-code').click();
      assert.match(await page.locator('#toast').textContent(), /코드를 입력/);
      assert.equal(await editorInput(page).evaluate(element => document.activeElement === element), true, 'empty source returns focus to editor');
      assert.equal(api.requests.length, 0, 'empty source is rejected before network submission');
      await editorInput(page).fill(`class Solution { /* ${'한'.repeat(12_000)} */ }`);
      await page.locator('#run-code').click();
      await waitForOutput(page, 'validation_error');
      assert.equal(api.requests.length, 0, 'oversized UTF-8 source is rejected before network submission');
      assert.equal(await achievement(page, 'lab'), 'false');
    });

    await run(browser, 'http-network-and-invalid-json-errors', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      for (const status of [400, 413, 429, 502, 503]) {
        const message = `QA provider refusal ${status}`;
        api.respond = request => ({ status, body: { requestId: request.requestId, error: { code: `QA_${status}`, message } } });
        await page.locator('#submit-code').click();
        await expectEventually(() => page.locator('#execution-output').innerText(), value => value.includes(message), `HTTP ${status} error is explained`);
        assert.notEqual(await page.locator('#execution-output').getAttribute('data-status'), 'passed');
        assert.equal(await achievement(page, 'lab'), 'false');
      }
      for (const response of [{ abort: true }, { raw: '{ not-json' }]) {
        const before = api.requests.length;
        api.respond = () => response;
        await page.locator('#submit-code').click();
        await expectEventually(() => api.requests.length, before + 1, 'failed request was attempted once');
        await expectEventually(() => page.locator('#submit-code').isEnabled(), true, 'execution controls recover after response failure');
        assert.notEqual(await page.locator('#execution-output').getAttribute('data-status'), 'passed');
        assert.equal(await achievement(page, 'lab'), 'false');
      }
    });

    await run(browser, 'unavailable-runtime-keeps-learning-and-draft-usable', async ({ context, page }) => {
      const api = await mockApi(context, { runtime: { available: false, supportedTargets: [], notice: 'QA runtime unavailable' } });
      await openLesson(page, first, 'lab');
      await page.locator('#runtime-retry').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#run-code').isDisabled(), true);
      assert.equal(await page.locator('#submit-code').isDisabled(), true);
      const draft = `${firstExercise.template}\n// offline draft`;
      await editorInput(page).fill(draft);
      await stepTo(page, 'theory');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), draft);
      api.runtime = {};
      await page.locator('#runtime-retry').click();
      await expectEventually(() => page.locator('#run-code').isEnabled(), true, 'runtime retry restores execution capability');
      assert.equal(await readEditorSource(page), draft);
      assert.equal(api.requests.length, 0, 'availability checks do not send the source');
    });

    await run(browser, 'clipboard-success-and-denied-fallback', async ({ context, page }) => {
      await mockApi(context);
      // Mock only the clipboard API to avoid overwriting the user's OS clipboard.
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async text => {
            if (window.qaClipboardDenied) throw new DOMException('QA denied', 'NotAllowedError');
            window.qaClipboardText = text;
          },
        } });
      });
      await openLesson(page, first, 'example');
      await page.locator('#copy-example').click();
      assert.equal(await page.evaluate(() => window.qaClipboardText), first.example.code);
      await page.evaluate(() => { window.qaClipboardDenied = true; });
      await page.locator('#copy-example').click();
      assert.equal(await page.evaluate(() => window.getSelection().toString()), first.example.code, 'copy denial selects example text for manual copying');
      await stepTo(page, 'lab');
      await page.locator('#copy-code').click();
      const selection = await editorInput(page).evaluate(element => ({ text: window.getSelection().toString(), focused: document.activeElement === element }));
      assert.equal(selection.text, firstExercise.template, 'copy denial selects the current document for manual copying');
      assert.equal(selection.focused, true);
      assert.match(await page.locator('#toast').textContent(), /직접 복사/);
    });

    await run(browser, 'inconsistent-success-response-does-not-complete', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      for (const overrides of [
        { passed: 0, total: 0, checks: [] },
        { passed: 2, total: 2, checks: [{ name: '정상 입력', passed: true }, { name: '경계 입력', passed: false }] },
        { requestId: 'unrelated-response-id' },
      ]) {
        const before = api.requests.length;
        api.respond = request => ({ body: executionResult(request, overrides) });
        await page.locator('#submit-code').click();
        await expectEventually(() => api.requests.length, before + 1, 'submit request reaches mock');
        await expectEventually(() => page.locator('#submit-code').isEnabled(), true, 'invalid success settles');
        assert.equal(await achievement(page, 'lab'), 'false', `inconsistent response is not proof of success: ${JSON.stringify(overrides)}`);
      }
    });

    for (const interaction of ['edit', 'lesson', 'version', 'cancel']) {
      await run(browser, `pending-response-${interaction}-cannot-grant-achievement`, async ({ context, page }) => {
        const gate = deferred();
        context.once('close', () => gate.resolve());
        const api = await mockApi(context, { respond: async request => { await gate.promise; return { body: executionResult(request, { stdout: 'old-response-proof' }) }; } });
        await openLesson(page, first, 'lab');
        await page.locator('#submit-code').click();
        await expectEventually(() => api.requests.length, 1, 'submission is pending');
        assert.equal(await page.locator('#run-code').isDisabled(), true, 'duplicate execution is blocked');
        assert.equal(await page.locator('#submit-code').isDisabled(), true, 'duplicate submission is blocked');
        const edited = `${firstExercise.template}\n// edited during execution`;
        if (interaction === 'edit') await editorInput(page).fill(edited);
        if (interaction === 'lesson') {
          await page.locator(`#lesson-list [data-lesson-id="${other.id}"]`).click();
          await stepTo(page, 'lab');
        }
        if (interaction === 'version') await page.locator('#version-select').selectOption('11');
        if (interaction === 'cancel') await page.locator('#cancel-execution').click();
        gate.resolve();
        await expectEventually(() => api.settled.length, 1, 'delayed mock response has settled');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await achievement(page, 'lab'), 'false', 'obsolete or cancelled response grants no achievement');
        assert.notEqual(await page.locator('#execution-output').getAttribute('data-status'), 'passed');
        if (interaction === 'edit') {
          assert.equal(await readEditorSource(page), edited);
          assert.equal(await page.locator('#execution-output').getAttribute('data-status'), 'outdated');
        }
        if (interaction === 'lesson') {
          assert.ok((await page.locator('#lesson-title').textContent()).includes(other.title));
          await page.locator(`#lesson-list [data-lesson-id="${first.id}"]`).click();
          assert.equal(await achievement(page, 'lab'), 'false', 'abandoned lesson was not silently passed');
        }
        assert.equal(api.requests.length, 1, 'no automatic retry');
      });
    }

    await run(browser, 'corrupt-storage-falls-back-without-completion', async ({ context, page }) => {
      await mockApi(context);
      await context.addInitScript(({ key }) => localStorage.setItem(key, '{ invalid-json'), { key: storageKey });
      await openLesson(page, first, 'lab');
      assert.equal(await achievement(page, 'quiz'), 'false');
      assert.equal(await achievement(page, 'lab'), 'false');
      assert.equal(await readEditorSource(page), firstExercise.template);
      await stepTo(page, 'theory');
      await noViewportOverflow(page);
    });

    await run(browser, 'blocked-storage-preserves-in-memory-interaction', async ({ context, page }) => {
      await mockApi(context);
      await context.addInitScript(() => {
        Storage.prototype.getItem = function () { throw new DOMException('QA storage denied', 'SecurityError'); };
        Storage.prototype.setItem = function () { throw new DOMException('QA storage denied', 'SecurityError'); };
      });
      await openLesson(page, first, 'lab');
      const source = `${firstExercise.template}\n// in-memory QA draft`;
      await editorInput(page).fill(source);
      await stepTo(page, 'theory');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), source);
      const storageLabel = await page.locator('#storage-label').textContent();
      assert.ok(storageLabel.trim().length > 0 && storageLabel !== '이 브라우저에 저장', 'storage limitation is disclosed');
      await completeQuiz(page, first);
      assert.equal(await achievement(page, 'quiz'), 'true', 'in-memory quiz remains usable');
    });

    await run(browser, 'reset-records-cancel-and-confirm', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      const draft = `${firstExercise.template}\n// record-reset QA`;
      await editorInput(page).fill(draft);
      await completeQuiz(page, first);
      await stepTo(page, 'lab');
      await page.locator('#version-select').selectOption('11');
      const before = await storedProgress(page);
      await page.locator('#reset-progress-open').click();
      await page.locator('#reset-dialog').waitFor({ state: 'visible' });
      await page.locator('#reset-dialog [data-close-dialog="reset-dialog"]').click();
      assert.deepEqual(await storedProgress(page), before, 'cancel leaves all records intact');
      assert.equal(await readEditorSource(page), draft);
      await page.locator('#reset-progress-open').click();
      await page.locator('#confirm-reset-progress').click();
      assert.equal(await achievement(page, 'quiz'), 'false');
      assert.equal(await achievement(page, 'lab'), 'false');
      assert.equal(await page.locator('#overall-completed').textContent(), '0');
      assert.equal(await page.locator('#version-select').inputValue(), '11', 'record reset retains selected version');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), firstExercise.template);
      await page.reload();
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.equal(await achievement(page, 'quiz'), 'false');
    });

    await run(browser, 'keyboard-tabs-radio-editor-and-dialog-focus', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first);
      for (const selector of ['#version-select', '#lesson-search']) {
        assert.equal(await page.locator(selector).evaluate(element => Boolean(element.labels?.length || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby'))), true, `${selector} has an accessible label`);
      }
      await page.locator('#tab-theory').focus();
      await page.keyboard.press('ArrowRight');
      await expectEventually(() => page.locator('#tab-example').getAttribute('aria-selected'), 'true', 'right arrow changes the selected tab');
      assert.equal(await page.locator('#tab-example').evaluate(element => document.activeElement === element), true);
      await page.keyboard.press('End');
      await expectEventually(() => page.locator('#tab-lab').getAttribute('aria-selected'), 'true', 'End selects the last tab');
      await page.keyboard.press('Home');
      await expectEventually(() => page.locator('#tab-theory').getAttribute('aria-selected'), 'true', 'Home selects the first tab');
      await stepTo(page, 'quiz');
      const group = page.locator(`#quiz-form input[name="quiz-${first.quiz[0].id}"]`);
      await group.first().focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowRight');
      assert.equal(await group.nth(1).isChecked(), true, 'native radio keyboard selection works');
      await stepTo(page, 'lab');
      await editorInput(page).focus();
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.insertText('\n// 키보드 입력 QA');
      assert.ok((await readEditorSource(page)).endsWith('// 키보드 입력 QA'));
      await page.keyboard.press('Tab');
      assert.equal(await editorInput(page).evaluate(element => element.contains(document.activeElement)), false, 'Tab leaves the code editor instead of trapping keyboard users');
      await page.locator('#guide-open').click();
      await page.locator('#guide-dialog').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#guide-dialog').evaluate(element => element.contains(document.activeElement)), true, 'dialog receives focus');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#guide-dialog').isVisible(), false);
      assert.equal(await page.locator('#guide-open').evaluate(element => document.activeElement === element), true, 'closing dialog restores opener focus');
    });

    await run(browser, 'mobile-drawer-keyboard-and-lesson-navigation', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first);
      await page.locator('#mobile-menu-toggle').click();
      assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#curriculum-sidebar').evaluate(element => element.contains(document.activeElement)), true, 'drawer receives focus');
      await screenshot(page, 'mobile-drawer-360', false);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#mobile-menu-toggle').evaluate(element => document.activeElement === element), true, 'drawer closure restores focus');
      await page.locator('#mobile-menu-toggle').click();
      await page.locator(`#lesson-list [data-lesson-id="${other.id}"]`).click();
      await expectEventually(() => page.locator('#lesson-title').textContent(), title => title.includes(other.title), 'drawer lesson navigation');
      assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
      await noViewportOverflow(page);
    }, { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1000 },
      { width: 1280, height: 600 },
      { width: 844, height: 390 },
    ]) {
      await run(browser, `responsive-${viewport.width}x${viewport.height}`, async ({ context, page }) => {
        await mockApi(context);
        await openLesson(page, first);
        for (const step of ['theory', 'example', 'quiz', 'practice', 'lab']) {
          await stepTo(page, step);
          await noViewportOverflow(page);
          if (viewport.width === 390 && ['quiz', 'practice', 'lab'].includes(step)) await screenshot(page, `mobile-${step === 'lab' ? 'ide' : step}`);
          if ([320, 360, 768].includes(viewport.width) && ['theory', 'lab'].includes(step)) await screenshot(page, `viewport-${viewport.width}-${step}`);
        }
        for (const id of ['run-code', 'submit-code', 'lab-reset']) {
          const rectangle = await page.locator(`#${id}`).boundingBox();
          assert.ok(rectangle && rectangle.width > 0 && rectangle.x >= -1 && rectangle.x + rectangle.width <= viewport.width + 1, `${id} stays inside viewport`);
        }
        if ([320, 360, 768, 1280, 844].includes(viewport.width)) {
          await page.locator('#run-code').scrollIntoViewIfNeeded();
          await screenshot(page, `viewport-${viewport.width}x${viewport.height}-lab-controls`, false);
        }
        await editorInput(page).fill(`${firstExercise.template}\n// ${'long_identifier_'.repeat(80)}`);
        await noViewportOverflow(page);
        const internalScroll = await editorScroller(page).evaluate(element => {
          element.scrollLeft = 150;
          return { width: element.clientWidth, scrollWidth: element.scrollWidth, left: element.scrollLeft };
        });
        assert.ok(internalScroll.scrollWidth > internalScroll.width && internalScroll.left > 0, 'long code scrolls inside editor');
      }, { viewport });
    }

    await run(browser, 'resize-orientation-and-two-hundred-percent-text', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      const draft = `${firstExercise.template}\n// resize persists input`;
      await editorInput(page).fill(draft);
      for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize(viewport);
        assert.equal(await readEditorSource(page), draft);
        await noViewportOverflow(page);
        await activeTabVisible(page);
      }
      const before = await page.locator('html').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      const after = await page.locator('html').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      assert.ok(after >= before * 1.99, 'root text size is doubled');
      for (const step of ['theory', 'example', 'quiz', 'practice', 'lab']) {
        await stepTo(page, step);
        await noViewportOverflow(page);
      }
      await screenshot(page, 'desktop-text-200-percent');
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await screenshot(page, 'desktop-text-200-top', false);
      await page.locator('#version-select').scrollIntoViewIfNeeded();
      await screenshot(page, 'desktop-text-200-version', false);
      await page.setViewportSize({ width: 390, height: 844 });
      await noViewportOverflow(page);
      await activeTabVisible(page);
      await screenshot(page, 'mobile-text-200-percent');
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await screenshot(page, 'mobile-text-200-top', false);
      for (const [selector, label] of [['.lesson-tabs', 'tabs'], ['#code-editor', 'editor'], ['#run-code', 'controls'], ['#execution-output', 'output']]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await screenshot(page, `mobile-text-200-${label}`, false);
      }
      await page.locator('#mobile-menu-toggle').click();
      await screenshot(page, 'mobile-text-200-drawer', false);
      await page.keyboard.press('Escape');
      assert.equal(await readEditorSource(page), draft);
    });

    await run(browser, 'initial-text-enlargement-keeps-mobile-tabs-visible', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first);
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      for (const step of ['theory', 'example', 'quiz', 'practice', 'lab']) {
        await stepTo(page, step);
        await activeTabVisible(page);
        await noViewportOverflow(page);
      }
      await page.locator('html').evaluate(element => { element.style.fontSize = '100%'; });
      await activeTabVisible(page);
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      await activeTabVisible(page);
      await page.locator('.lesson-tabs').scrollIntoViewIfNeeded();
      await screenshot(page, 'mobile-text-200-tabs-selected-before-enlargement', false);
    }, { viewport: { width: 390, height: 844 } });
    await run(browser, 'editor-three-themes-and-syntax-colors', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'example');
      const palettes = {};
      for (const theme of ['dark', 'light', 'contrast']) {
        await chooseTheme(page, theme);
        assert.equal(await page.locator('.code-block code').textContent(), first.example.code, 'syntax highlighting preserves the exact example');
        const colors = await tokenPalette(page, '.code-block');
        for (const category of ['keyword', 'class', 'type', 'variable', 'method', 'string', 'number']) assert.ok(colors[category], `${theme} example has ${category} tokens`);
        assert.equal(new Set(['keyword', 'class', 'type', 'variable'].map(category => colors[category])).size, 4, 'keyword, class, type, and variable colors are distinct');
        palettes[theme] = colors;
        await page.locator('.code-shell').scrollIntoViewIfNeeded();
        await screenshot(page, `editor-${theme}-example`, false);
        await noViewportOverflow(page);
      }
      const source = 'class Palette {\n    String label = "한글";\n    int count = 7;\n    // <img src=x onerror="window.qaCodeExecuted=true">\n    void run() { count++; }\n}\n';
      await stepTo(page, 'lab');
      assert.equal(await page.locator('#code-editor').getAttribute('data-editor-engine'), 'codemirror');
      assert.equal(await page.locator('#code-editor textarea').count(), 0, 'normal editor has no hidden textarea proxy');
      assert.equal(await editorInput(page).getAttribute('contenteditable'), 'true');
      assert.equal(await editorInput(page).getAttribute('aria-multiline'), 'true');
      await editorInput(page).fill(source);
      for (const theme of ['dark', 'light', 'contrast']) {
        await chooseTheme(page, theme);
        const colors = await tokenPalette(page, '#code-editor');
        for (const category of ['keyword', 'class', 'type', 'variable', 'method', 'string', 'comment', 'number']) assert.ok(colors[category], `${theme} editor has ${category} tokens`);
        for (const category of ['keyword', 'class', 'type', 'variable']) assert.equal(colors[category], palettes[theme][category], 'example and editor use the same category palette');
        await page.locator('.editor-shell').scrollIntoViewIfNeeded();
        await screenshot(page, `editor-${theme}-ide`, false);
      }
      assert.notEqual(palettes.dark.class, palettes.light.class, 'theme switching changes the computed colors');
      assert.notEqual(palettes.dark.class, palettes.contrast.class);
      assert.equal(await page.locator('#code-editor img').count(), 0, 'code-looking HTML is rendered as text');
      assert.equal(await page.evaluate(() => window.qaCodeExecuted), undefined);
      assert.equal(await readEditorSource(page), source);
      assert.equal(api.requests.length, 0, 'color changes do not submit source');
    });

    await run(browser, 'editor-theme-wrap-persist-across-navigation-and-reload', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      const source = `${firstExercise.template}\n// 테마와 이동 후에도 보존\n\n`;
      await editorInput(page).fill(source);
      await chooseTheme(page, 'light');
      await page.locator('#code-wrap-toggle').click();
      assert.equal(await page.locator('#code-wrap-toggle').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), editorPreferencesKey), { theme: 'light', wrap: true });
      await page.locator('#lesson-search').fill('no-result-theme-regression');
      await page.locator('#lesson-search').fill('');
      await page.locator('[data-track="transition"]').click();
      await page.locator('[data-track="all"]').click();
      await page.locator('#version-select').selectOption('11');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), source);
      await stepTo(page, 'example');
      assert.equal(await page.locator('.code-shell').getAttribute('data-editor-theme'), 'light');
      await page.locator(`#lesson-list [data-lesson-id="${other.id}"]`).click();
      await stepTo(page, 'lab');
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'light');
      assert.equal(await page.locator('#code-wrap-toggle').getAttribute('aria-pressed'), 'true');
      await page.locator(`#lesson-list [data-lesson-id="${first.id}"]`).click();
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), source);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'light');
      assert.equal(await page.locator('#code-wrap-toggle').getAttribute('aria-pressed'), 'true');
      assert.equal(await readEditorSource(page), source);
      assert.equal(api.requests.length, 0);
    });

    await run(browser, 'editor-theme-preserves-selection-and-keyboard-undo', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      const source = 'class Palette { int count = 7; }';
      await editorInput(page).fill(source);
      const editorNode = await editorInput(page).elementHandle();
      await editorInput(page).focus();
      await page.keyboard.press('ControlOrMeta+Home');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      assert.equal(await page.evaluate(() => getSelection().toString()), 'class');
      await chooseTheme(page, 'light');
      await chooseTheme(page, 'contrast');
      assert.equal(await editorNode.evaluate(element => element.isConnected), true, 'theme reconfiguration keeps the input DOM instance');
      await editorInput(page).focus();
      assert.equal(await page.evaluate(() => getSelection().toString()), 'class', 'theme changes preserve the selected source range');
      await page.keyboard.insertText('interface');
      const replaced = source.replace('class', 'interface');
      assert.equal(await readEditorSource(page), replaced);
      await chooseTheme(page, 'dark');
      await editorInput(page).focus();
      await page.keyboard.press('ControlOrMeta+z');
      assert.equal(await readEditorSource(page), source, 'undo survives theme changes');
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y');
      assert.equal(await readEditorSource(page), replaced, 'redo restores the typed replacement');
      await editorNode.dispose();
    });

    await run(browser, 'editor-enter-indent-tab-and-reset-undo', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      await editorInput(page).fill('class Demo {');
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.press('Enter');
      await page.keyboard.insertText('int number = 1;');
      const indented = 'class Demo {\n    int number = 1;';
      assert.equal(await readEditorSource(page), indented, 'Enter applies a four-space Java block indentation');
      await page.keyboard.press('Tab');
      assert.equal(await editorInput(page).evaluate(element => element.contains(document.activeElement)), false, 'Tab is navigation');
      await editorInput(page).focus();
      await page.keyboard.press('ControlOrMeta+End');
      await page.locator('#indent-code').click();
      const moreIndented = 'class Demo {\n        int number = 1;';
      assert.equal(await readEditorSource(page), moreIndented, 'indent toolbar adds four spaces to the selected line');
      await page.keyboard.press('ControlOrMeta+z');
      assert.equal(await readEditorSource(page), indented, 'indent action is undoable');
      await chooseTheme(page, 'light');
      await page.locator('#lab-reset').click();
      assert.equal(await readEditorSource(page), firstExercise.template);
      await page.locator('#lab-undo').click();
      assert.equal(await readEditorSource(page), indented, 'public reset undo restores the entire previous source');
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'light');
    });

    await run(browser, 'editor-mouse-selection-and-simulated-copy-event', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      const source = 'class MouseSelection { int count = 7; }';
      await editorInput(page).fill(source);
      const token = page.locator('#code-editor .tok-class').filter({ hasText: 'MouseSelection' });
      await token.scrollIntoViewIfNeeded();
      const bounds = await token.boundingBox();
      assert.ok(bounds && bounds.width > 0);
      await page.mouse.move(bounds.x + 0.2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width + 0.2, bounds.y + bounds.height / 2, { steps: 14 });
      await page.mouse.up();
      assert.equal(await page.evaluate(() => getSelection().toString()), 'MouseSelection', 'pointer drag selects source text');
      const copied = await editorInput(page).evaluate(element => {
        const clipboardData = new DataTransfer();
        const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        return { text: clipboardData.getData('text/plain'), prevented: event.defaultPrevented };
      });
      assert.equal(copied.text, 'MouseSelection', 'editor copy handler writes only the selection to the simulated clipboard');
      assert.equal(copied.prevented, true);
      assert.equal(await readEditorSource(page), source, 'toolbar copy remains a whole-document action');
    });

    await run(browser, 'editor-simulated-korean-composition-retains-source', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      const before = 'class 한글 { String value = ""; }\n// ';
      await editorInput(page).fill(before);
      await page.keyboard.press('ControlOrMeta+End');
      await editorInput(page).dispatchEvent('compositionstart', { data: '' });
      await editorInput(page).dispatchEvent('compositionupdate', { data: '한글 입력' });
      await page.keyboard.insertText('한글 입력');
      await editorInput(page).dispatchEvent('compositionend', { data: '한글 입력' });
      const expected = `${before}한글 입력`;
      assert.equal(await readEditorSource(page), expected, 'synthetic composition sequence does not duplicate committed Korean text');
      await editorInput(page).dispatchEvent('compositionstart', { data: '' });
      await editorInput(page).dispatchEvent('compositionend', { data: '' });
      await page.locator('#run-code').click();
      await expectEventually(() => api.requests.length, 1, 'composition result reaches the mock API');
      assert.equal(api.requests[0].source, expected);
      await waitForOutput(page, 'passed');
      await assertDraft(page, firstExercise.id, expected);
      // This is a synthetic browser event test, not validation of an OS IME,
      // candidate window, physical keyboard, or mobile composition behavior.
    });

    await run(browser, 'editor-empty-trailing-newline-and-request-roundtrip', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      await editorInput(page).fill('');
      assert.equal(await readEditorSource(page), '');
      await page.locator('#run-code').click();
      assert.equal(api.requests.length, 0, 'empty input is not submitted');
      assert.equal(await editorInput(page).evaluate(element => document.activeElement === element), true);
      const source = 'class Solution {\n    // 마지막 빈 줄도 원문의 일부\n}\n\n\n';
      await editorInput(page).fill(source);
      assert.equal(await readEditorSource(page), source);
      await page.locator('#run-code').click();
      await expectEventually(() => api.requests.length, 1, 'source is submitted once');
      assert.equal(api.requests[0].source, source);
      await waitForOutput(page, 'passed');
      await assertDraft(page, firstExercise.id, source);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await readEditorSource(page), source, 'reload retains all trailing newlines');
    });

    await run(browser, 'editor-long-korean-document-wrap-scroll-and-resize', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      const source = `class Solution {\n${Array.from({ length: 100 }, (_, index) => `    // ${index}: ${'긴한글식별자와문자열 '.repeat(8)}`).join('\n')}\n}\n\n`;
      await editorInput(page).fill(source);
      assert.equal(await readEditorSource(page), source, 'virtualized long document is copied in full');
      await page.locator('#run-code').click();
      await expectEventually(() => api.requests.length, 1, 'long Unicode source reaches the mock API');
      assert.equal(api.requests[0].source, source);
      await waitForOutput(page, 'passed');
      await assertDraft(page, firstExercise.id, source);
      for (const viewport of [{ width: 320, height: 720 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await noViewportOverflow(page);
        const scroll = await editorScroller(page).evaluate(element => {
          element.scrollTop = element.scrollHeight;
          element.scrollLeft = 180;
          return { left: element.scrollLeft, top: element.scrollTop, width: element.clientWidth, scrollWidth: element.scrollWidth };
        });
        assert.ok(scroll.top > 0 && scroll.left > 0 && scroll.scrollWidth > scroll.width, 'long document scrolls inside CodeMirror');
        assert.equal(await readEditorSource(page), source);
      }
      await chooseTheme(page, 'light');
      await page.locator('#code-wrap-toggle').click();
      await expectEventually(() => editorScroller(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'wrap contains long lines inside the editor');
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      await noViewportOverflow(page);
      await activeTabVisible(page);
      await expectEventually(() => page.locator('#toast').evaluate(element => element.classList.contains('is-visible')), false, 'copy confirmation has dismissed before layout evidence');
      await page.locator('#code-editor').scrollIntoViewIfNeeded();
      await screenshot(page, 'editor-mobile-200-long-korean', false);
      await page.setViewportSize({ width: 320, height: 720 });
      await noViewportOverflow(page);
      await page.locator('.code-settings').scrollIntoViewIfNeeded();
      await screenshot(page, 'editor-320-200-controls', false);
      await page.locator('#code-wrap-toggle').click();
      assert.equal(await readEditorSource(page), source);
      await page.reload();
      await editorInput(page).waitFor({ state: 'visible' });
      assert.equal(await readEditorSource(page), source);
    });

    await run(browser, 'editor-document-character-limit-is-atomic', async ({ context, page }) => {
      const api = await mockApi(context);
      await openLesson(page, first, 'lab');
      const accepted = `//${'가'.repeat(49_998)}`;
      await editorInput(page).fill(accepted);
      assert.equal(await readEditorSource(page), accepted, 'exactly 50,000 characters are accepted');
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.insertText('나');
      assert.match(await page.locator('#toast').textContent(), /50,000/);
      assert.equal(await readEditorSource(page), accepted, 'an over-limit insertion leaves the prior document intact');
      await assertDraft(page, firstExercise.id, accepted);
      await page.locator('#run-code').click();
      await waitForOutput(page, 'validation_error');
      assert.equal(api.requests.length, 0, 'the independent UTF-8 request limit is enforced before transmission');
      await page.locator('#lab-reset').click();
      await page.locator('#lab-undo').click();
      assert.equal(await readEditorSource(page), accepted, 'reset undo preserves a boundary-size document');
    });

    await run(browser, 'editor-theme-during-request-preserves-execution-snapshot', async ({ context, page }) => {
      const gate = deferred();
      context.once('close', () => gate.resolve());
      const api = await mockApi(context, { respond: async request => { await gate.promise; return { body: executionResult(request) }; } });
      await openLesson(page, first, 'lab');
      const source = `${firstExercise.template}\n// immutable request snapshot`;
      await editorInput(page).fill(source);
      await page.locator('#submit-code').click();
      await expectEventually(() => api.requests.length, 1, 'pending snapshot is captured');
      await chooseTheme(page, 'contrast');
      await page.locator('#code-wrap-toggle').click();
      assert.equal(api.requests[0].source, source);
      gate.resolve();
      await waitForOutput(page, 'passed');
      assert.equal(await achievement(page, 'lab'), 'true', 'presentation-only changes do not invalidate matching source');
      assert.equal(await readEditorSource(page), source);
      assert.equal(api.requests.length, 1, 'theme change sends no additional execution request');
    });

    await run(browser, 'editor-invalid-and-denied-preferences-keep-learning-usable', async ({ context, page }) => {
      const api = await mockApi(context);
      await context.addInitScript(key => localStorage.setItem(key, '{ invalid-json'), editorPreferencesKey);
      await openLesson(page, first, 'lab');
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'dark');
      await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException('QA blocked preferences', 'SecurityError'); }; });
      await chooseTheme(page, 'light');
      assert.match(await page.locator('#storage-label').textContent(), /이번 방문|현재 화면/);
      const source = `${firstExercise.template}\n// memory-only preferences`;
      await editorInput(page).fill(source);
      await stepTo(page, 'example');
      assert.equal(await page.locator('.code-shell').getAttribute('data-editor-theme'), 'light');
      await stepTo(page, 'lab');
      assert.equal(await readEditorSource(page), source);
      await page.locator('#run-code').click();
      await waitForOutput(page, 'passed');
      assert.equal(api.requests[0].source, source);
    });

    await run(browser, 'editor-bundle-failure-keeps-plain-source-editing-and-execution', async ({ context, page }) => {
      const api = await mockApi(context);
      await context.route('**/assets/editor.bundle.js', route => route.abort('failed'));
      await openLesson(page, first, 'example');
      assert.equal(await page.locator('.code-block code').textContent(), first.example.code);
      assert.match(await page.locator('.syntax-note').textContent(), /원문/);
      await stepTo(page, 'lab');
      assert.equal(await page.locator('#code-editor').getAttribute('data-editor-engine'), 'textarea-fallback');
      const fallback = page.locator('#code-editor [data-testid="code-editor-input"]');
      assert.equal(await fallback.evaluate(element => element.tagName), 'TEXTAREA');
      assert.match(await page.locator('#editor-hint').textContent(), /기본 텍스트 편집기/);
      const source = `${firstExercise.template}\n// fallback source\n\n`;
      await fallback.fill(source);
      await chooseTheme(page, 'light');
      await page.locator('#code-wrap-toggle').click();
      assert.equal(await fallback.inputValue(), source);
      assert.equal(await fallback.getAttribute('wrap'), 'soft');
      await page.locator('#run-code').click();
      await waitForOutput(page, 'passed');
      assert.equal(api.requests[0].source, source);
      await page.locator('#lab-reset').click();
      await page.locator('#lab-undo').click();
      assert.equal(await fallback.inputValue(), source);
      await page.setViewportSize({ width: 320, height: 720 });
      await noViewportOverflow(page);
      await fallback.scrollIntoViewIfNeeded();
      await screenshot(page, 'editor-fallback-320', false);
    });

    await run(browser, 'editor-selection-and-caret-visual-states', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      const source = 'class Palette {\n    String label = "한글 문자열";\n    int count = 7;\n    // 선택 영역과 커서 가독성\n    void run() { count++; }\n}';
      await editorInput(page).fill(source);
      const selectionContrasts = [];
      for (const theme of ['dark', 'light', 'contrast']) {
        await chooseTheme(page, theme);
        await editorInput(page).focus();
        await page.keyboard.press('ControlOrMeta+a');
        assert.equal(await page.evaluate(() => getSelection().toString()), source);
        await page.locator('.editor-shell').scrollIntoViewIfNeeded();
        await screenshot(page, `editor-${theme}-selection`, false, { caret: 'initial' });
        const background = await page.locator('#code-editor .cm-selectionBackground').first().evaluate(element => getComputedStyle(element).backgroundColor);
        const palette = await tokenPalette(page, '#code-editor');
        for (const [category, foreground] of Object.entries(palette)) selectionContrasts.push({ theme, category, ratio: contrastRatio(foreground, background) });
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => getSelection().isCollapsed), true);
        await expectEventually(() => page.locator('#code-editor .cm-cursor').first().evaluate(element => getComputedStyle(element).visibility), 'visible', 'focused editor caret is visible');
        await screenshot(page, `editor-${theme}-caret`, false, { caret: 'initial' });
      }
      console.log('SELECTION_CONTRAST', JSON.stringify(selectionContrasts));
      for (const { theme, category, ratio } of selectionContrasts) assert.ok(ratio >= 4.5, `${theme}/${category} selected text contrast ${ratio.toFixed(2)}:1 is below 4.5:1`);
      await noViewportOverflow(page);
    });

    await run(browser, 'editor-mobile-theme-palette-and-controls', async ({ context, page }) => {
      await mockApi(context);
      await openLesson(page, first, 'lab');
      for (const theme of ['dark', 'light', 'contrast']) {
        await chooseTheme(page, theme);
        await noViewportOverflow(page);
        await page.locator('.code-settings').scrollIntoViewIfNeeded();
        await screenshot(page, `editor-mobile-${theme}`, false);
      }
      await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
      await noViewportOverflow(page);
      await activeTabVisible(page);
      await page.locator('.code-settings').scrollIntoViewIfNeeded();
      await screenshot(page, 'editor-mobile-200-theme', false);
      await page.locator('#run-code').scrollIntoViewIfNeeded();
      await screenshot(page, 'editor-mobile-200-execution-controls', false);
    }, { viewport: { width: 390, height: 844 } });
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ browser: process.env.PLAYWRIGHT_CHANNEL || 'chromium', browserVersion, node: process.version, mode: 'mocked API; browser emulation, not real devices', passed: results.filter(result => result.status === 'PASS').length, failed: results.filter(result => result.status === 'FAIL').length, artifacts: artifactRoot, results }, null, 2));
  if (!results.length || results.some(result => result.status === 'FAIL')) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
