import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { exercises as coreExercises } from '../dist/data/exercises.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';
import { lessonVisuals } from '../dist/data/lesson-visuals.js';

// Isolated browser emulation only. Every execution API and external navigation
// is intercepted; no learner source or source-reference request leaves the PC.
const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const artifacts = path.resolve(process.env.QA_ARTIFACT_DIR || path.join(root, 'work/readability-qa'));
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
const lessons = [...coreLessons, ...professionalLessons];
const storageKey = 'java-edu:progress:v1';
const results = [];
const filesToHash = ['dist/index.html', 'dist/app.js', 'dist/styles.css', 'dist/data/curriculum.js', 'dist/data/professional.js', 'dist/data/lesson-visuals.js', 'tests/readability.mjs'];
let browser;

async function hashes() {
  return Object.fromEntries(await Promise.all(filesToHash.map(async relative =>
    [relative, createHash('sha256').update(await readFile(path.join(root, relative))).digest('hex')])));
}

async function eventually(read, expected, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}

async function openLesson(page, id, step = 'theory') {
  const lesson = lessons.find(item => item.id === id);
  await page.evaluate(hash => { location.hash = hash; }, `lesson=${id}&step=${step}&version=21`);
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), `${id} selected`);
  await eventually(() => page.locator(`[data-step="${step}"]`).getAttribute('aria-selected'), 'true', `${step} selected`);
}

async function snapshot(page) {
  return page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.fromEntries(['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'notes'].map(field => [field, stored[field] || []]));
  }, storageKey);
}

async function originalTheory(page, lesson) {
  const sections = await page.locator('#lesson-panel > .theory-section').evaluateAll(nodes =>
    nodes.map(node => ({ heading: node.querySelector('h3').textContent, text: node.querySelector('p').textContent })));
  assert.deepEqual(sections, lesson.theory.map(({ heading, text }) => ({ heading, text })), `${lesson.id}: original theory remains accessible`);
  for (const section of await page.locator('#lesson-panel > .theory-section').all()) assert.equal(await section.isVisible(), true, `${lesson.id}: complete theory is expanded by default`);
}

async function keyboardDetails(page, selector, open) {
  const details = page.locator(selector);
  const summary = details.locator(':scope > summary');
  await summary.focus();
  if (await details.evaluate(node => node.open) !== open) await page.keyboard.press(open ? 'Enter' : 'Space');
  assert.equal(await details.evaluate(node => node.open), open, `${selector}: keyboard disclosure state`);
  assert.equal(await summary.evaluate(node => node === document.activeElement), true, `${selector}: summary retains focus`);
  const outline = await summary.evaluate(node => ({ width: getComputedStyle(node).outlineWidth, style: getComputedStyle(node).outlineStyle }));
  assert.ok(parseFloat(outline.width) > 0 && outline.style !== 'none', `${selector}: visible keyboard focus`);
}

async function inspectSupport(page, lesson) {
  assert.equal(await page.locator('#lesson-info').evaluate(node => node.open), false);
  assert.equal(await page.locator('#reference-column').evaluate(node => node.open), false);
  assert.equal(await page.locator('.learning-goals').count(), 1, 'goals appear once');
  assert.equal(await page.locator('#lesson-panel .learning-goals').count(), 0, 'goals do not repeat within the reading flow');
  assert.equal(await page.locator('#lesson-description').isVisible(), false);
  assert.equal(await page.locator('#source-list').isVisible(), false);
  assert.equal(await page.locator('#lesson-description').textContent(), lesson.description);
  assert.deepEqual(await page.locator('#lesson-goals li span').allTextContents(), lesson.goals);
  await keyboardDetails(page, '#lesson-info', true);
  assert.equal(await page.locator('#lesson-description').isVisible(), true);
  await keyboardDetails(page, '#reference-column', true);
  const sources = await page.locator('#source-list a').evaluateAll(nodes => nodes.map(node => ({
    title: node.querySelector('strong').textContent, url: node.href, target: node.target, rel: node.rel, metadata: node.querySelector('span').textContent,
  })));
  assert.deepEqual(sources.map(({ title, url }) => ({ title, url })), lesson.sources.map(({ title, url }) => ({ title, url: new URL(url).href })));
  sources.forEach((source, index) => {
    assert.equal(source.target, '_blank');
    assert.ok(source.rel.includes('noopener') && source.rel.includes('noreferrer'));
    if (lesson.sources[index].edition) assert.ok(source.metadata.includes(lesson.sources[index].edition));
    if (lesson.sources[index].checkedAt) assert.ok(source.metadata.includes(lesson.sources[index].checkedAt));
  });
  assert.match(await page.locator('.evidence-disclaimer').textContent(), /통계가 아닙니다/);
  assert.match(await page.locator('.evidence-disclaimer').textContent(), /확인일.*게시일.*채용 여부/);
  await keyboardDetails(page, '#reference-column', false);
  await keyboardDetails(page, '#lesson-info', false);
  const legend = page.locator('.code-legend-disclosure');
  if (await legend.count()) {
    assert.equal(await legend.evaluate(node => node.open), false);
    assert.equal(await legend.locator('.syntax-legend').isVisible(), false);
    await keyboardDetails(page, '.code-legend-disclosure', true);
    assert.equal(await legend.locator('.syntax-legend').isVisible(), true);
    assert.ok(await legend.locator('.syntax-legend-item').count() >= 3);
    await keyboardDetails(page, '.code-legend-disclosure', false);
  }
}

async function inspectGuide(page, lesson) {
  const guide = lesson.learningGuide;
  assert.equal(await page.locator('.learning-guide').count(), 1, `${lesson.id}: single guide`);
  for (const [selector, expected] of [
    ['.guide-scenario-text', guide.scenario], ['.guide-question', guide.question],
    ['.guide-code-filename', guide.code.file], ['#theory-code-panel code', guide.code.source],
    ['.guide-prediction-question', guide.prediction.question], ['.guide-answer-text', guide.prediction.answer],
    ['.guide-answer-explanation', guide.prediction.explanation], ['.guide-takeaway > p:last-child', guide.takeaway],
  ]) assert.equal(await page.locator(selector).textContent(), expected, `${lesson.id}: ${selector}`);
  const terms = await page.locator('.guide-term').evaluateAll(nodes => nodes.map(node =>
    ({ term: node.querySelector('dt').textContent, meaning: node.querySelector('dd').textContent })));
  assert.deepEqual(terms, guide.terms, `${lesson.id}: accessible term-definition pairs`);
  assert.deepEqual(await page.locator('.guide-walkthrough li').allTextContents(), guide.walkthrough, `${lesson.id}: numbered code trace`);
  assert.equal(await page.locator('.guide-prediction').getAttribute('open'), null, `${lesson.id}: answer initially hidden`);
  assert.equal(await page.locator('.guide-answer-text').isVisible(), false);
  const order = await page.locator('.learning-guide').evaluate(node => [...node.children].map(child => child.className));
  assert.deepEqual(order, ['guide-scenario', 'guide-section guide-terms', 'guide-section guide-code-section', 'guide-section guide-walkthrough', 'guide-section guide-prediction-section', 'guide-takeaway']);
  assert.equal(await page.locator('#theory-code-panel').getAttribute('tabindex'), '0', 'long code block accepts keyboard focus');
  assert.match(await page.locator('#theory-code-panel').getAttribute('aria-label'), /이론.*발췌/);
  const invalidIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const unresolved = [...document.querySelectorAll('.learning-guide [aria-describedby],.learning-guide [aria-labelledby]')]
      .flatMap(node => ['aria-describedby', 'aria-labelledby'].flatMap(attribute => (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)))
      .filter(id => !document.getElementById(id));
    return { duplicates, unresolved };
  });
  assert.deepEqual(invalidIds, { duplicates: [], unresolved: [] });
  await originalTheory(page, lesson);
}

async function geometry(page, id) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const value = await page.evaluate(() => {
    const guide = document.querySelector('.learning-guide');
    const boundary = guide?.getBoundingClientRect();
    const bad = guide ? [...guide.querySelectorAll('h3,p,dt,dd,li,summary,button,select,pre,.guide-code-filename,.syntax-legend-item')].flatMap(node => {
      if (!node.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return [];
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const outside = rect.left < boundary.left - 1 || rect.right > boundary.right + 1;
      const clipped = node.tagName !== 'PRE' && node.clientWidth > 0 && ['clip', 'hidden'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
      return outside || clipped ? [{ tag: node.tagName, text: node.textContent.slice(0, 100), outside, clipped, left: rect.left, right: rect.right }] : [];
    }) : [];
    const card = document.querySelector('#lesson-card').getBoundingClientRect();
    for (const node of document.querySelectorAll('.lesson-support p,.lesson-support a,.lesson-support summary,.lesson-support li,.lesson-support span,.lesson-support strong,.lesson-support h3,.reference-card')) {
      // Closed native details can retain old layout rectangles in Chromium.
      // Only visible descendants participate; the suite also opens every card.
      if (!node.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) continue;
      const rect = node.getBoundingClientRect();
      if (rect.left < card.left - 1 || rect.right > card.right + 1) bad.push({ tag: node.tagName, text: node.textContent.slice(0, 100), left: rect.left, right: rect.right, reason: 'expanded support escapes lesson card' });
    }
    return { width: document.documentElement.clientWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), bad };
  });
  assert.ok(value.scroll <= value.width + 1, `${id}: page horizontal overflow ${JSON.stringify(value)}`);
  assert.deepEqual(value.bad, [], `${id}: visible lesson content escapes or clips its container`);
}

async function activeTabGeometry(page, label) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const value = await page.locator('.lesson-tabs [aria-selected="true"]').evaluate(node => {
    const rect = node.getBoundingClientRect();
    const strip = node.parentElement.getBoundingClientRect();
    return { tab: node.id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, stripLeft: strip.left, stripRight: strip.right, stripTop: strip.top, stripBottom: strip.bottom, scrollLeft: node.parentElement.scrollLeft };
  });
  assert.ok(value.left >= value.stripLeft - 1 && value.right <= value.stripRight + 1 && value.top >= value.stripTop - 1 && value.bottom <= value.stripBottom + 1, `${label}: selected tab fully visible inside strip ${JSON.stringify(value)}`);
  return value;
}

async function capture(page, filename, selector = '.guide-scenario') {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(artifacts, `${filename}.png`), fullPage: false });
}

async function captureBoundary(page, filename, nextSelector) {
  // Ordinary document scrolling: retain the real composed viewport, including
  // the preceding content and the start of the next existing section.
  await page.locator(nextSelector).first().evaluate(node => {
    const top = node.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: Math.max(0, top - innerHeight * 0.4), behavior: 'instant' });
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(artifacts, `${filename}.png`), fullPage: false });
}

function contrastRatio(foreground, background) {
  const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const [a, b] = [luminance(foreground), luminance(background)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function run(name, test, options = {}) {
  if (filter && !filter.test(name)) return;
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 1000 }, hasTouch: options.touch || false, serviceWorkers: 'block' });
  const requests = [], external = [], pageErrors = [];
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async value => {
        if (window.qaClipboardDenied) throw new DOMException('QA denied', 'NotAllowedError');
        window.qaClipboardText = value;
      },
    } });
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) {
      external.push(url.href);
      return route.fulfill({ contentType: 'text/plain', body: 'QA blocks remote network.' });
    }
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      if (url.pathname === '/api/runtime') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ provider: 'Wandbox', available: true, runtime: { javaVersion: 21 }, supportedTargets: [8, 11, 17, 21], notice: 'QA 모의 실행. 외부 코드 전송 없음.' }) });
      if (url.pathname === '/api/execute' && options.mockSubmit) {
        const request = route.request().postDataJSON();
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ requestId: request.requestId, status: 'passed', runtimeVersion: 21, targetVersion: 8, stdout: 'QA mocked result', stderr: '', compilerOutput: '', checks: [{ name: 'QA mock check', passed: true }], passed: 1, total: 1, provider: 'QA mock', durationMs: 1 }) });
      }
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'qa_no_execution', message: 'This suite blocks execution.' } }) });
    }
    if (url.pathname === '/data/curriculum.js' && options.core) return route.fulfill({ contentType: 'text/javascript', body: `export const lessons = ${JSON.stringify(options.core)};` });
    if (url.pathname === '/data/professional.js' && options.professional) return route.fulfill({ contentType: 'text/javascript', body: `export const professionalLessons = ${JSON.stringify(options.professional)}; export const professionalExercises = ${JSON.stringify(professionalExercises)};` });
    if (url.pathname === '/assets/editor.bundle.js' && options.noEditor) return route.abort('failed');
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => pageErrors.push(error.message));
  const started = Date.now();
  try {
    await page.goto(base);
    await page.locator('#workspace-grid').waitFor({ state: 'visible' });
    if (options.font === 200) await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
    const evidence = await test({ page, context, requests, external });
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
    assert.equal(requests.filter(request => request.path !== '/api/runtime').length, options.mockSubmit ? 1 : 0, 'only the explicitly requested mock submission is permitted');
    if (options.activateReference) assert.equal(external.length, 1, 'one explicitly tested source activation is intercepted');
    else assert.deepEqual(external, [], 'this case does not activate remote links');
    results.push({ name, status: 'PASS', durationMs: Date.now() - started, requests, ...(evidence ? { evidence } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, `failure-${name}.png`), fullPage: true }).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started, requests, pageErrors });
    console.error(`FAIL ${name}: ${error.stack}`);
  } finally { await context.close(); }
}

async function main() {
  await mkdir(artifacts, { recursive: true });
  assert.equal(lessons.length, 34);
  assert.ok(lessons.every(lesson => lesson.learningGuide), 'wait until all 34 guides and the generated professional distribution are ready');
  const response = await fetch(base, { signal: AbortSignal.timeout(5000) });
  assert.ok(response.ok, 'parent-owned preview is available');
  const before = await hashes();
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const browserVersion = browser.version();
  try {
    await run('all34-guide-content-order-and-original-theory', async ({ page }) => {
      for (const lesson of lessons) {
        await openLesson(page, lesson.id);
        await inspectGuide(page, lesson);
        await geometry(page, lesson.id);
        await page.locator('.learning-guide').screenshot({ path: path.join(artifacts, `${lesson.id}-desktop-guide.png`) });
      }
      for (const [id, viewport] of [['java-basics', { width: 1440, height: 1000 }], ['jpa-state', { width: 390, height: 844 }]]) {
        await page.setViewportSize(viewport);
        await openLesson(page, id);
        await geometry(page, id);
        await captureBoundary(page, `${id}-${viewport.width}-guide-to-theory-boundary`, '.theory-reading-title');
        await captureBoundary(page, `${id}-${viewport.width}-theory-to-visual-boundary`, '.theory-visual');
        if (viewport.width === 390) {
          await page.locator('#mobile-menu-toggle').click();
          assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
          await page.screenshot({ path: path.join(artifacts, `${id}-390-open-curriculum-drawer.png`), fullPage: false });
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
          assert.equal(await page.locator('#mobile-menu-toggle').evaluate(node => node === document.activeElement), true);
        }
      }
    });

    await run('all34-support-disclosures-keyboard-focus-and-source-access', async ({ page, context, external }) => {
      const before = await snapshot(page);
      for (const lesson of lessons) {
        await openLesson(page, lesson.id);
        await inspectSupport(page, lesson);
        assert.equal(await page.locator('.guide-scenario > h3').count(), 1);
        assert.equal(await page.locator('.guide-scenario > .small-label').count(), 0);
        if (lesson.id === 'java-basics') {
          for (const [selector, name, target] of [['#lesson-info', 'lesson-info', '.lesson-information'], ['#reference-column', 'references', '.reference-content'], ['.code-legend-disclosure', 'syntax-legend', '.guide-code-tools']]) {
            await keyboardDetails(page, selector, true);
            await capture(page, `java-basics-1440-expanded-${name}`, target);
            await keyboardDetails(page, selector, false);
          }
        }
      }
      await openLesson(page, 'exceptions');
      await keyboardDetails(page, '#reference-column', true);
      const source = page.locator('#source-list a').first();
      await source.focus();
      const expected = await source.getAttribute('href');
      const popupPromise = context.waitForEvent('page');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(popup.url(), new URL(expected).href);
      assert.equal(await popup.evaluate(() => window.opener), null);
      assert.deepEqual(external, [new URL(expected).href]);
      assert.match(await popup.locator('body').innerText(), /QA blocks remote network/);
      await popup.close();
      await keyboardDetails(page, '#reference-column', false);
      assert.deepEqual(await snapshot(page), before, 'all informational disclosure actions preserve records');
      return { sourceUrl: expected, sourceActivation: 'intercepted local mock; external source content not fetched' };
    }, { activateReference: true });

    await run('wide-reading-layout-and-twelve-original-diagram-boundaries', async ({ page }) => {
      const widths = [];
      for (const [width, minimum] of [[1280, 880], [1440, 1000], [1920, 1200]]) {
        await page.setViewportSize({ width, height: width === 1280 ? 600 : 1000 });
        await openLesson(page, 'java-basics');
        await geometry(page, `wide-${width}`);
        const measurements = await page.evaluate(() => {
          const widthOf = selector => document.querySelector(selector).getBoundingClientRect().width;
          return { viewport: innerWidth, lesson: widthOf('#lesson-card'), panel: widthOf('#lesson-panel'), code: widthOf('.guide-code'), visual: widthOf('.theory-visual'), sidebar: widthOf('#curriculum-sidebar'), columns: getComputedStyle(document.querySelector('#workspace-grid')).gridTemplateColumns, referenceInsideArticle: document.querySelector('#lesson-card').contains(document.querySelector('#reference-column')) };
        });
        assert.ok(measurements.code >= minimum && measurements.visual >= minimum, `wide reading target: ${JSON.stringify(measurements)}`);
        assert.equal(measurements.columns.split(' ').length, 2, 'only navigation and lesson occupy persistent columns');
        assert.equal(measurements.referenceInsideArticle, true);
        widths.push(measurements);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (width === 1280) {
          const visible = await page.locator('.guide-scenario-text').evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height, visibleHeight: Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top) };
          });
          assert.ok(visible.visibleHeight >= Math.min(visible.height, 40) - 1, `1280×600 starts with readable scenario: ${JSON.stringify(visible)}`);
        }
        await page.screenshot({ path: path.join(artifacts, `reading-layout-${width}-top.png`), fullPage: false });
      }
      const transitions = [];
      for (const width of [1280, 1250, 1280]) {
        await page.setViewportSize({ width, height: 600 });
        await geometry(page, `desktop-transition-${width}`);
        transitions.push({ width, codeWidth: (await page.locator('.guide-code').boundingBox()).width });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(artifacts, `reading-layout-${width}-transition-top.png`), fullPage: false });
      }
      assert.ok(Math.abs(transitions[0].codeWidth - transitions[1].codeWidth) < 100, '1250 breakpoint does not suddenly narrow the reading area');
      assert.equal(transitions[0].codeWidth, transitions[2].codeWidth, 'restored desktop viewport restores reading width');
      assert.equal(Object.keys(lessonVisuals).length, 12);
      const diagrams = [];
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const [id, visual] of Object.entries(lessonVisuals)) {
        await openLesson(page, id);
        const figure = page.locator('#lesson-panel > figure.theory-visual');
        assert.equal(await figure.count(), 1);
        assert.equal(await figure.isVisible(), true);
        assert.equal(await figure.getAttribute('data-visual-id'), visual.id);
        assert.equal(await figure.locator('.visual-title').textContent(), visual.title);
        assert.equal(await figure.locator('.visual-description').textContent(), visual.caption);
        assert.equal(await figure.locator('.visual-alt-text').textContent(), visual.altText);
        const preceding = await figure.evaluate(node => [...node.parentElement.children].slice(0, [...node.parentElement.children].indexOf(node)).filter(item => item.classList.contains('theory-section')).length);
        assert.equal(preceding, visual.afterSection + 1, `${id}: original theory boundary remains`);
        assert.equal(await figure.evaluate(node => Boolean(node.closest('details'))), false, 'diagram is not hidden in an information disclosure');
        diagrams.push({ id, visual: visual.id, precedingTheorySections: preceding });
      }
      return { widths, transitions, diagrams };
    });

    await run('all34-five-stages-retain-example-quiz-practice-and-lab', async ({ page }) => {
      for (const lesson of lessons) {
        for (const step of ['theory', 'example', 'quiz', 'practice', 'lab']) {
          await openLesson(page, lesson.id, step);
          assert.ok((await page.locator('#lesson-panel').innerText()).trim().length > 40, `${lesson.id}/${step}`);
          assert.equal(await page.locator('#lesson-panel').getAttribute('aria-labelledby'), `tab-${step}`);
          if (step !== 'theory') assert.equal(await page.locator('.learning-guide').count(), 0);
        }
      }
    });

    await run('keyboard-disclosure-repetition-never-grants-achievement', async ({ page }) => {
      for (const id of ['java-basics', 'jpa-state', 'jwt-validation']) {
        await openLesson(page, id);
        const before = await snapshot(page);
        const summary = page.locator('.guide-prediction summary');
        await summary.focus();
        for (let repeat = 0; repeat < 3; repeat++) {
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('.guide-prediction').getAttribute('open'), '');
          assert.equal(await page.locator('.guide-answer-text').isVisible(), true);
          await page.keyboard.press('Space');
          assert.equal(await page.locator('.guide-prediction').getAttribute('open'), null);
          assert.equal(await summary.evaluate(node => node === document.activeElement), true);
        }
        await page.keyboard.press('Enter');
        assert.deepEqual(await snapshot(page), before, 'prediction has no persistence side effects');
        assert.equal(await page.locator('#overall-completed').textContent(), '0');
        assert.equal(await page.locator('#lesson-achievements [data-achievement="quiz"]').getAttribute('data-complete'), 'false');
        assert.equal(await page.locator('#lesson-achievements [data-achievement="lab"]').getAttribute('data-complete'), 'false');
        await capture(page, `${id}-keyboard-answer`, '.guide-prediction');
      }
    });

    await run('three-themes-copy-selection-and-keyboard-code-scroll', async ({ page }) => {
      await openLesson(page, 'java-basics');
      const source = coreLessons.find(lesson => lesson.id === 'java-basics').learningGuide.code.source;
      const palettes = [];
      for (const theme of ['dark', 'light', 'contrast']) {
        await page.locator('#theory-theme-select').selectOption(theme);
        assert.equal(await page.locator('.guide-code').getAttribute('data-editor-theme'), theme);
        const palette = await page.locator('#theory-code-panel').evaluate(node => ({
          background: getComputedStyle(node.closest('.code-shell')).backgroundColor,
          foreground: getComputedStyle(node).color,
          colors: [...new Set([...node.querySelectorAll('[class*="tok-"]')].map(token => getComputedStyle(token).color))],
        }));
        assert.ok(palette.colors.length >= 3, `${theme}: syntax colors are rendered`);
        for (const color of [...palette.colors, palette.foreground]) assert.ok(contrastRatio(color, palette.background) >= 4.5, `${theme}: code color contrast ${color}/${palette.background}`);
        palettes.push(palette);
        await page.locator('#copy-theory-code').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => window.qaClipboardText), source);
        await page.evaluate(() => { window.qaClipboardDenied = true; });
        await page.locator('#copy-theory-code').click();
        assert.equal(await page.evaluate(() => getSelection().toString()), source, 'denied clipboard selects the complete source');
        await capture(page, `java-basics-${theme}-selected-code`, '#theory-code-panel');
        await page.evaluate(() => { window.qaClipboardDenied = false; getSelection().removeAllRanges(); });
      }
      assert.notDeepEqual(palettes[0], palettes[1]);
      assert.notDeepEqual(palettes[0], palettes[2]);
      await page.setViewportSize({ width: 320, height: 720 });
      const pre = page.locator('#theory-code-panel');
      await pre.focus();
      const scrollable = await pre.evaluate(node => node.scrollWidth > node.clientWidth);
      if (scrollable) {
        await page.keyboard.press('ArrowRight');
        await eventually(() => pre.evaluate(node => node.scrollLeft), value => value > 0, 'keyboard can scroll long code without page overflow');
      }
      await geometry(page, 'keyboard-code-scroll');
      await page.reload();
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#theory-theme-select').inputValue(), 'contrast');
    });

    await run('guides-preserve-earned-progress-core-and-project-drafts-and-notes', async ({ page, requests }) => {
      const first = coreLessons[0];
      await openLesson(page, first.id, 'quiz');
      for (const question of first.quiz) await page.locator(`#quiz-form [name="quiz-${question.id}"][value="${question.correctIndex}"]`).check();
      await page.locator('#quiz-submit').click();
      await openLesson(page, first.id, 'practice');
      const note = '코드를 따라 읽은 뒤에도 보존할 QA 설계 기록';
      await page.locator('#design-notes').fill(note);
      await openLesson(page, first.id, 'lab');
      const draft = `${coreExercises.find(exercise => exercise.id === first.exerciseId).template}\n// independent readability QA draft\n`;
      await page.locator('#code-editor [role="textbox"]').fill(draft);
      await page.locator('#submit-code').click();
      await eventually(() => page.locator('#lesson-achievements [data-achievement="lab"]').getAttribute('data-complete'), 'true', 'mock submission establishes a prior earned snapshot');
      await openLesson(page, professionalLessons[0].id, 'lab');
      const file = professionalExercises[0].files.find(item => item.editable);
      const projectDraft = `${file.source}\n// independent QA project draft\n`;
      await page.locator('#code-editor [role="textbox"]').fill(projectDraft);
      await openLesson(page, first.id);
      const before = await snapshot(page);
      assert.ok(before.quizPassed.includes(first.id));
      assert.ok(before.labPassed.some(item => item.source === draft));
      assert.ok(before.drafts.some(item => item.source === draft));
      assert.ok(before.fileDrafts.some(item => item.source === projectDraft));
      for (const id of ['java-basics', 'oop', 'jpa-state', 'security-csrf', 'jwt-validation', 'kafka-idempotency']) {
        await openLesson(page, id);
        for (const selector of ['#lesson-info', '#reference-column']) {
          await keyboardDetails(page, selector, true);
          await keyboardDetails(page, selector, false);
        }
        await page.locator('.guide-prediction summary').click();
        await page.locator('#theory-theme-select').selectOption('light');
        await page.locator('#copy-theory-code').click();
      }
      await page.reload();
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.deepEqual(await snapshot(page), before);
      assert.equal(requests.filter(request => request.path === '/api/execute').length, 1);
      await openLesson(page, first.id, 'practice');
      assert.equal(await page.locator('#design-notes').inputValue(), note);
      await openLesson(page, first.id);
      assert.equal(await page.locator('#overall-completed').textContent(), '1');
      assert.equal(await page.locator('#theory-theme-select').inputValue(), 'light');
    }, { mockSubmit: true });

    const withoutGuides = values => values.map(({ learningGuide, ...lesson }) => lesson);
    await run('all34-missing-guide-fallback-keeps-original-theory-and-five-stages', async ({ page }) => {
      for (const lesson of lessons) {
        await openLesson(page, lesson.id);
        assert.equal(await page.locator('.learning-guide').count(), 0);
        await originalTheory(page, lesson);
        for (const step of ['example', 'quiz', 'practice', 'lab']) {
          await openLesson(page, lesson.id, step);
          assert.ok((await page.locator('#lesson-panel').innerText()).trim().length > 40);
        }
      }
    }, { core: withoutGuides(coreLessons), professional: withoutGuides(professionalLessons) });

    const malformed = structuredClone(coreLessons);
    [null, [], 5, { terms: [null, {}, { term: '빈 정의' }], code: { source: 4 }, walkthrough: [null, 5] }].forEach((value, index) => { malformed[index].learningGuide = value; });
    await run('malformed-optional-guide-values-do-not-break-original-learning', async ({ page }) => {
      for (const lesson of malformed.slice(0, 4)) {
        await openLesson(page, lesson.id);
        assert.equal(await page.locator('.learning-guide').count(), 0);
        await originalTheory(page, lesson);
        await page.locator('#lesson-panel .next-step-row button').click();
        assert.equal(await page.locator('[data-step="example"]').getAttribute('aria-selected'), 'true');
      }
    }, { core: malformed });

    const injected = structuredClone(coreLessons);
    const payload = '<img src=x onerror="window.qaGuideInjected=true"><script>window.qaGuideInjected=true</script>';
    Object.assign(injected[0].learningGuide, { scenario: payload, question: payload, terms: [{ term: payload, meaning: payload }], code: { file: 'Main.java', source: payload }, walkthrough: [payload], prediction: { question: payload, answer: payload, explanation: payload }, takeaway: payload });
    await run('guide-content-is-rendered-as-text-not-executable-markup', async ({ page }) => {
      await openLesson(page, injected[0].id);
      await page.locator('.guide-prediction summary').click();
      for (const selector of ['.guide-scenario-text', '.guide-question', '#theory-code-panel code', '.guide-answer-text']) assert.equal(await page.locator(selector).textContent(), payload);
      assert.equal(await page.locator('.learning-guide img,.learning-guide script').count(), 0);
      assert.equal(await page.evaluate(() => window.qaGuideInjected), undefined);
    }, { core: injected });

    await run('syntax-module-failure-keeps-exact-guide-code-copy-and-prediction', async ({ page }) => {
      for (const id of ['java-basics', 'jpa-state', 'jwt-validation']) {
        await openLesson(page, id);
        const lesson = lessons.find(item => item.id === id);
        assert.equal(await page.locator('#theory-code-panel code').textContent(), lesson.learningGuide.code.source);
        assert.equal(await page.locator('#theory-code-panel [class*="tok-"]').count(), 0);
        assert.match(await page.locator('.guide-code-hint').textContent(), /원문/);
        await page.locator('#copy-theory-code').click();
        assert.equal(await page.evaluate(() => window.qaClipboardText), lesson.learningGuide.code.source);
        await page.locator('.guide-prediction summary').click();
        assert.equal(await page.locator('.guide-answer-text').isVisible(), true);
      }
      await capture(page, 'jwt-fallback-code', '#theory-code-panel');
    }, { noEditor: true });

    for (const width of [320, 360, 390, 768, 1440]) for (const font of [100, 200]) {
      await run(`all34-layout-${width}px-${font}percent-text`, async ({ page }) => {
        for (const lesson of lessons) {
          await openLesson(page, lesson.id);
          await page.locator('.guide-prediction summary').click();
          await geometry(page, lesson.id);
          // The prior overflow lived in the references column. A collapsed
          // replacement must not merely conceal it, so inspect both states.
          await page.locator('#lesson-info > summary').press('Enter');
          await page.locator('#reference-column > summary').press('Enter');
          if (await page.locator('.code-legend-disclosure').count()) await page.locator('.code-legend-disclosure > summary').press('Enter');
          await geometry(page, `${lesson.id}/expanded-support`);
        }
        for (const id of ['java-basics', 'jpa-state', 'jwt-validation']) {
          await openLesson(page, id);
          if (id === 'java-basics') {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.screenshot({ path: path.join(artifacts, `reading-layout-${width}-${font}-top.png`), fullPage: false });
          }
          await capture(page, `${id}-${width}-${font}-scenario`);
          await capture(page, `${id}-${width}-${font}-code`, '#theory-code-panel');
          if ((width === 320 || width === 390) && font === 200) {
            await page.locator('.guide-prediction summary').click();
            await capture(page, `${id}-${width}-${font}-answer`, '.guide-prediction-answer');
            await capture(page, `${id}-${width}-${font}-trace`, '.guide-walkthrough');
            await keyboardDetails(page, '#reference-column', true);
            await capture(page, `${id}-${width}-${font}-expanded-references`, '.reference-content');
          }
        }
      }, { viewport: { width, height: width < 500 ? 844 : 1000 }, font });
    }

    for (const width of [704, 689]) {
      await run(`desktop-minimum-web-viewport-${width}x521-at-100-and-200percent-text`, async ({ page }) => {
        const checks = [];
        for (const font of [100, 200]) {
          await page.locator('html').evaluate((node, value) => { node.style.fontSize = `${value}%`; }, font);
          await openLesson(page, 'exceptions');
          const before = await snapshot(page);
          const menu = page.locator('#mobile-menu-toggle');
          await menu.focus();
          await page.keyboard.press('Enter');
          assert.equal(await menu.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('#curriculum-sidebar').evaluate(node => node.contains(document.activeElement)), true);
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false');
          assert.equal(await menu.evaluate(node => node === document.activeElement), true, 'drawer restores opener focus');
          for (const selector of ['#lesson-info', '#reference-column']) await keyboardDetails(page, selector, true);
          await geometry(page, `minimum-${width}-${font}/open-support`);
          await capture(page, `minimum-${width}-${font}-expanded-references`, '.reference-content');
          await page.setViewportSize({ width: width + 80, height: 650 });
          await geometry(page, `minimum-${width}-${font}/resized`);
          for (const selector of ['#lesson-info', '#reference-column']) assert.equal(await page.locator(selector).evaluate(node => node.open), true, 'resize preserves expanded information');
          await page.setViewportSize({ width, height: 521 });
          for (const selector of ['#reference-column', '#lesson-info']) await keyboardDetails(page, selector, false);
          assert.deepEqual(await snapshot(page), before);
          await openLesson(page, 'java-basics');
          const pre = page.locator('#theory-code-panel');
          await pre.focus();
          const preDimensions = await pre.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
          if (preDimensions.scroll > preDimensions.width) {
            await page.keyboard.press('ArrowRight');
            await eventually(() => pre.evaluate(node => node.scrollLeft), value => value > 0, 'long guide code scrolls internally');
          }
          await page.locator('#tab-theory').focus();
          for (const step of ['example', 'quiz', 'practice', 'lab']) {
            await page.keyboard.press('ArrowRight');
            await eventually(() => page.locator(`#tab-${step}`).getAttribute('aria-selected'), 'true', `minimum window ${step} keyboard stage`);
            assert.equal(await page.locator(`#tab-${step}`).evaluate(node => node === document.activeElement), true);
            await activeTabGeometry(page, `${width}px/${font}%/${step}/keyboard`);
            await geometry(page, `minimum-${width}-${font}/${step}`);
          }
          await openLesson(page, 'java-basics', 'theory');
          await openLesson(page, 'java-basics', 'lab');
          await activeTabGeometry(page, `${width}px/${font}%/direct-hash-lab`);
          const draft = `${coreExercises.find(item => item.id === coreLessons[0].exerciseId).template}\n// ${width}px ${font}% ${'long_identifier_'.repeat(80)}\n`;
          await page.locator('#code-editor [role="textbox"]').fill(draft);
          const drafted = await eventually(() => snapshot(page), value => value.drafts.some(item => item.source === draft), 'the edited source is saved before testing persistence');
          const scroll = await page.locator('#code-editor .cm-scroller').evaluate(node => {
            node.scrollLeft = 180;
            return { width: node.clientWidth, scroll: node.scrollWidth, left: node.scrollLeft };
          });
          assert.ok(scroll.scroll > scroll.width && scroll.left > 0, 'long editor source stays inside its scroller');
          await keyboardDetails(page, '#lesson-info', true);
          await keyboardDetails(page, '#reference-column', true);
          await page.setViewportSize({ width: 844, height: 390 });
          await geometry(page, `minimum-${width}-${font}/landscape-editor`);
          await activeTabGeometry(page, `${width}px/${font}%/landscape-editor`);
          await page.setViewportSize({ width, height: 521 });
          await geometry(page, `minimum-${width}-${font}/restored-editor`);
          await activeTabGeometry(page, `${width}px/${font}%/restored-editor`);
          await page.locator('#copy-code').click();
          assert.equal(await page.evaluate(() => window.qaClipboardText), draft, 'draft remains exact after information toggles and resize');
          assert.deepEqual(await snapshot(page), drafted);
          await capture(page, `minimum-${width}-${font}-editor`, '#run-code');
          await page.locator('#tab-lab').focus();
          await page.keyboard.press('Home');
          await eventually(() => page.locator('#tab-theory').getAttribute('aria-selected'), 'true', 'Home returns to theory');
          assert.equal(await page.locator('#tab-theory').evaluate(node => node === document.activeElement), true);
          await keyboardDetails(page, '#reference-column', false);
          await keyboardDetails(page, '#lesson-info', false);
          assert.deepEqual(await snapshot(page), drafted);
          await openLesson(page, 'java-basics', 'lab');
          await page.reload();
          await page.locator('#code-editor [role="textbox"]').waitFor({ state: 'visible' });
          await page.locator('html').evaluate((node, value) => { node.style.fontSize = `${value}%`; }, font);
          await activeTabGeometry(page, `${width}px/${font}%/reload-lab`);
          await page.locator('#copy-code').click();
          assert.equal(await page.evaluate(() => window.qaClipboardText), draft, 'complete editor source survives reload at the minimum viewport');
          assert.deepEqual(await snapshot(page), drafted);
          checks.push({ font, guideCode: preDimensions, editorScroll: scroll, draftPreserved: true, drawerFocusRestored: true, allFiveTabsKeyboard: true, directHashAndResizeAndReloadTabVisible: true });
        }
        return { environment: 'web viewport emulation, not an Electron app launch', viewport: { width, height: 521 }, checks };
      }, { viewport: { width, height: 521 } });
    }

    await run('touch-emulation-resize-and-short-height-keep-open-prediction', async ({ page }) => {
      await openLesson(page, 'jpa-state');
      await page.locator('.guide-prediction summary').tap();
      for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 600 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.locator('.guide-prediction').getAttribute('open'), '');
        assert.equal(await page.locator('.guide-answer-text').isVisible(), true);
        await geometry(page, 'jpa-state');
        await capture(page, `jpa-state-${viewport.width}x${viewport.height}-open-answer`, '.guide-prediction-answer');
      }
      await page.locator('.guide-prediction summary').tap();
      assert.equal(await page.locator('.guide-prediction').getAttribute('open'), null);
    }, { viewport: { width: 390, height: 844 }, touch: true });
  } finally { await browser.close(); }
  const after = await hashes();
  const changed = filesToHash.filter(file => before[file] !== after[file]);
  if (changed.length) results.push({ name: 'verified-source-did-not-change-during-run', status: 'BLOCKED', changed });
  const report = { recordedAt: new Date().toISOString(), browser: process.env.PLAYWRIGHT_CHANNEL || 'chromium', browserVersion, node: process.version, mode: 'Isolated browser and touch emulation; mocked API; 200% document text, not physical devices or OS scaling', before, after, results };
  await writeFile(path.join(artifacts, `results-${Date.now()}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!results.length || results.some(result => result.status !== 'PASS')) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
