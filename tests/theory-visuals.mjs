import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { exercises as coreExercises } from '../dist/data/exercises.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';
import { lessonVisuals } from '../dist/data/lesson-visuals.js';

// Independent browser QA. Execution APIs and activated external references are
// intercepted: this suite never submits learner code or visits a remote source.
const root = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const artifacts = path.resolve(process.env.QA_ARTIFACT_DIR || path.join(root, 'work/theory-independent-qa'));
const filter = process.env.QA_FILTER ? new RegExp(process.env.QA_FILTER) : null;
const lessons = [...coreLessons, ...professionalLessons];
const selected = ['java-basics', 'oop', 'polymorphism', 'collections', 'generics', 'streams', 'concurrency', 'jpa-state', 'tx-proxy', 'security-csrf', 'jwt-validation', 'kafka-idempotency'];
const storageKey = 'java-edu:progress:v1';
const results = [];
let browser;

async function eventually(read, expected, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (typeof expected === 'function' ? expected(value) : value === expected) return value;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail(`${message}: ${JSON.stringify(value)}`);
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Parent-owned preview is unavailable at ${base}`);
}

async function run(name, test, options = {}) {
  if (filter && !filter.test(name)) return;
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 1000 } });
  const requests = [];
  const external = [];
  const pageErrors = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) {
      external.push(url.href);
      return route.fulfill({ contentType: 'text/plain', body: 'QA reference activation: remote network intentionally not used.' });
    }
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      if (url.pathname === '/api/runtime') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ provider: 'Wandbox', available: true, runtime: { javaVersion: 21 }, supportedTargets: [8, 11, 17, 21] }) });
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'qa_no_execution', message: 'This suite does not execute code.' } }) });
    }
    if (url.pathname === '/data/lesson-visuals.js' && options.visualModule) {
      return options.visualModule === '404'
        ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Optional diagrams unavailable' })
        : route.fulfill({ contentType: 'text/javascript', body: options.visualModule });
    }
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
    await test({ page, context, requests, external });
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
    assert.equal(requests.filter(request => request.path !== '/api/runtime').length, 0, 'theory interaction never executes code');
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, `failure-${name}.png`), fullPage: true }).catch(() => {});
    results.push({ name, status: 'FAIL', message: error.message, durationMs: Date.now() - started });
    console.error(`FAIL ${name}: ${error.stack}`);
  } finally { await context.close(); }
}

async function openLesson(page, id, stage = 'theory') {
  const lesson = lessons.find(item => item.id === id);
  assert.ok(lesson, id);
  await page.evaluate(hash => { location.hash = hash; }, `lesson=${id}&step=${stage}&version=21`);
  await eventually(() => page.locator('#lesson-title').textContent(), text => text?.includes(lesson.title), `${id} lesson is selected`);
  await eventually(() => page.locator(`[data-step="${stage}"]`).getAttribute('aria-selected'), 'true', `${stage} tab is selected`);
}

async function originalTheory(page, lesson) {
  const actual = await page.locator('#lesson-panel > .theory-section').evaluateAll(nodes => nodes.map(node => ({ heading: node.querySelector('h3').textContent, text: node.querySelector('p').textContent })));
  assert.deepEqual(actual, lesson.theory.map(({ heading, text }) => ({ heading, text })), `${lesson.id} original sections are unchanged`);
}

async function inspectVisual(page, lesson, visual) {
  const figure = page.locator('figure.theory-visual');
  assert.equal(await figure.count(), 1, lesson.id);
  assert.equal(await figure.getAttribute('data-visual-id'), visual.id);
  assert.equal(await figure.getAttribute('data-visual-kind'), visual.kind);
  assert.equal(await figure.locator('.visual-title').textContent(), visual.title);
  assert.equal(await figure.locator('.visual-description').textContent(), visual.caption);
  assert.ok((await figure.locator('.visual-reading-order').textContent()).includes(visual.readingOrder));
  const insertion = await figure.evaluate(node => [...node.parentElement.children].slice(0, [...node.parentElement.children].indexOf(node)).filter(sibling => sibling.classList.contains('theory-section')).length);
  assert.equal(insertion, visual.afterSection + 1, `${lesson.id} appears after the intended explanation`);
  const aria = await figure.evaluate(node => Object.fromEntries(['aria-labelledby', 'aria-describedby'].map(attribute => [attribute, document.getElementById(node.getAttribute(attribute))?.textContent])));
  assert.equal(aria['aria-labelledby'], visual.title);
  assert.equal(aria['aria-describedby'], visual.caption);
  const panels = figure.locator('.visual-panel');
  assert.equal(await panels.count(), visual.panels.length);
  for (let index = 0; index < visual.panels.length; index++) {
    const expected = visual.panels[index];
    const panel = panels.nth(index);
    assert.equal(await panel.locator('.visual-panel-title').textContent(), expected.title);
    const nodes = await panel.locator('.visual-node').evaluateAll(items => items.map(node => ({ id: node.dataset.nodeId, label: node.querySelector('.visual-node-label').textContent, detail: node.querySelector('.visual-node-detail')?.textContent || '' })));
    assert.deepEqual(nodes, expected.nodes.map(({ id, label, detail }) => ({ id, label, detail })), `${lesson.id} panel ${index} reading order and labels`);
    const edges = await panel.locator('.visual-transition,.visual-relationship').evaluateAll(items => items.map(node => ({ from: node.dataset.from, to: node.dataset.to, text: node.querySelector('.visual-edge-label').textContent })));
    assert.equal(edges.length, expected.edges.length);
    for (const edge of expected.edges) {
      const from = expected.nodes.find(node => node.id === edge.from).label;
      const to = expected.nodes.find(node => node.id === edge.to).label;
      assert.ok(edges.some(item => item.from === edge.from && item.to === edge.to && item.text === `${from}에서 ${to}로: ${edge.label}`), `${lesson.id}: ${edge.from}→${edge.to} retains endpoints and meaning`);
    }
  }
  assert.equal(await figure.locator('.visual-alt-text').textContent(), visual.altText);
  assert.deepEqual(await figure.locator('.visual-limits li').allTextContents(), visual.limits);
  const sources = await figure.locator('.visual-source-link').evaluateAll(items => items.map(link => ({ title: link.textContent, url: link.href, target: link.target, rel: link.rel })));
  assert.deepEqual(sources.map(({ title, url }) => ({ title, url })), visual.sources.map(source => ({ title: source.title, url: new URL(source.url).href })));
  for (const source of sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.equal(source.target, '_blank');
    assert.ok(source.rel.includes('noopener') && source.rel.includes('noreferrer'));
  }
  for (const source of visual.sources) {
    const metadata = await figure.locator('.visual-source-meta').allTextContents();
    assert.ok(metadata.some(text => text.includes(source.edition) && text.includes(source.checkedAt)));
  }
}

async function geometry(page, id) {
  const value = await page.evaluate(() => {
    const figure = document.querySelector('.theory-visual');
    const bound = figure.getBoundingClientRect();
    const bad = [...figure.querySelectorAll('.visual-node,.visual-edge-label,.visual-panel-title,.visual-title,.visual-source-link,.visual-endpoint')].flatMap(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const outside = rect.left < bound.left - 1 || rect.right > bound.right + 1;
      const clipped = ['hidden', 'clip'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
      return outside || clipped ? [{ text: node.textContent.slice(0, 100), outside, clipped, left: rect.left, right: rect.right }] : [];
    });
    const order = [...figure.querySelectorAll('.visual-panel')].map((node, index) => { const rect = node.getBoundingClientRect(); return { index, top: Math.round(rect.top), left: Math.round(rect.left) }; });
    return { width: document.documentElement.clientWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), bad, order };
  });
  assert.ok(value.scroll <= value.width + 1, `${id}: viewport overflow ${JSON.stringify(value)}`);
  assert.deepEqual(value.bad, [], `${id}: diagram label escapes/clips its figure`);
  assert.deepEqual([...value.order].sort((a, b) => a.top - b.top || a.left - b.left).map(panel => panel.index), value.order.map(panel => panel.index), `${id}: visual panel order agrees with DOM order`);
}

async function captureViewport(page, id, suffix, selector = '.visual-title') {
  await page.locator(`.theory-visual ${selector}`).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(artifacts, `${id}-${suffix}.png`), fullPage: false });
}

async function main() {
  await mkdir(artifacts, { recursive: true });
  await waitForServer();
  assert.equal(lessons.length, 34);
  assert.deepEqual(Object.keys(lessonVisuals).sort(), [...selected].sort());
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const version = browser.version();
  try {
    await run('all34-original-theory-and12-visual-contracts', async ({ page }) => {
      for (const lesson of lessons) {
        await openLesson(page, lesson.id);
        await originalTheory(page, lesson);
        const visual = lessonVisuals[lesson.id];
        if (visual) {
          await inspectVisual(page, lesson, visual);
          await geometry(page, lesson.id);
          await page.locator('.theory-visual').screenshot({ path: path.join(artifacts, `${lesson.id}-desktop-figure.png`) });
        } else assert.equal(await page.locator('.theory-visual').count(), 0, `${lesson.id}: no unnecessary diagram`);
      }
    });

    await run('keyboard-description-and-reference-activation', async ({ page, context, external }) => {
      await openLesson(page, 'jwt-validation');
      const details = page.locator('.visual-text-description');
      const summary = details.locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await details.getAttribute('open'), '');
      assert.equal(await details.locator('.visual-alt-text').isVisible(), true);
      await page.keyboard.press('Space');
      assert.equal(await details.getAttribute('open'), null);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.visual-source-link').first().evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await summary.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Enter');
      await captureViewport(page, 'jwt-validation', 'keyboard-expanded-description', '.visual-text-description');
      const popupPromise = context.waitForEvent('page');
      await page.locator('.visual-source-link').first().click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      assert.equal(popup.url(), lessonVisuals['jwt-validation'].sources[0].url);
      assert.ok(external.includes(popup.url()));
      assert.equal(await popup.evaluate(() => window.opener), null);
      await popup.close();
      assert.equal(await page.locator('.theory-visual').count(), 1);
    });

    await run('theory-navigation-preserves-quiz-notes-and-file-drafts', async ({ page }) => {
      const first = coreLessons[0];
      await openLesson(page, first.id, 'quiz');
      for (const question of first.quiz) await page.locator(`#quiz-form [name="quiz-${question.id}"][value="${question.correctIndex}"]`).check();
      await page.locator('#quiz-submit').click();
      await openLesson(page, first.id, 'practice');
      const note = '도식을 읽어도 유지할 설계 기록';
      await page.locator('#design-notes').fill(note);
      await openLesson(page, first.id, 'lab');
      const draft = `${coreExercises.find(exercise => exercise.id === first.exerciseId).template}\n// preserved visual QA draft\n`;
      await page.locator('#code-editor [role="textbox"]').fill(draft);
      await page.locator('#editor-theme-select').selectOption('contrast');
      await openLesson(page, professionalLessons[0].id, 'lab');
      const file = professionalExercises[0].files.find(item => item.editable);
      const fileDraft = `${file.source}\n// preserved project visual QA\n`;
      await page.locator('#code-editor [role="textbox"]').fill(fileDraft);
      await openLesson(page, first.id);
      const snapshot = async () => page.evaluate(key => { const stored = JSON.parse(localStorage.getItem(key)); return Object.fromEntries(['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'notes'].map(field => [field, stored[field]])); }, storageKey);
      const before = await snapshot();
      assert.ok(before.quizPassed.includes(first.id));
      assert.ok(before.drafts.some(item => item.source === draft));
      assert.ok(before.fileDrafts.some(item => item.source === fileDraft));
      for (const id of ['generics', 'streams', 'jpa-state', 'jwt-validation']) {
        await openLesson(page, id);
        await page.locator('.visual-text-description summary').click();
      }
      await page.locator('#version-select').selectOption('8');
      await page.locator('[data-track="transition"]').click();
      await page.locator('#lesson-search').fill('qa-no-match-visual');
      await page.locator('#lesson-search').fill('');
      await page.locator('[data-track="all"]').click();
      await page.locator('#version-select').selectOption('21');
      assert.deepEqual(await snapshot(), before);
      await page.reload();
      await page.locator('#workspace-grid').waitFor({ state: 'visible' });
      assert.deepEqual(await snapshot(), before);
      await openLesson(page, first.id, 'practice');
      assert.equal(await page.locator('#design-notes').inputValue(), note);
      await openLesson(page, first.id, 'lab');
      assert.equal(await page.locator('#editor-theme-select').inputValue(), 'contrast');
      assert.equal(await page.locator('#lesson-achievements [data-achievement="quiz"]').getAttribute('data-complete'), 'true');
      assert.equal(await page.locator('#lesson-achievements [data-achievement="lab"]').getAttribute('data-complete'), 'false');
    });

    for (const [name, visualModule] of [['optional-module-404', '404'], ['invalid-export-shape', 'export const lessonVisuals = [];'], ['optional-module-syntax-error', 'export const lessonVisuals = {;']]) {
      await run(`${name}-retains-original-learning`, async ({ page }) => {
        for (const id of selected) {
          await openLesson(page, id);
          await originalTheory(page, lessons.find(lesson => lesson.id === id));
          assert.equal(await page.locator('.theory-visual').count(), 0);
        }
        await page.locator('#lesson-panel .next-step-row button').click();
        assert.equal(await page.locator('[data-step="example"]').getAttribute('aria-selected'), 'true');
        assert.ok((await page.locator('#lesson-panel').innerText()).length > 100);
      }, { visualModule });
    }

    const damaged = structuredClone(lessonVisuals);
    damaged['java-basics'].panels[0].nodes[1].id = damaged['java-basics'].panels[0].nodes[0].id;
    damaged.oop.kind = 'unknown';
    damaged.streams.sources[0].url = 'javascript:window.qaDiagramInjected=true';
    damaged['tx-proxy'].panels[0].edges[0].to = 'nonexistent-node';
    await run('invalid-individual-diagrams-do-not-break-other-lessons', async ({ page }) => {
      for (const id of selected) {
        await openLesson(page, id);
        await originalTheory(page, lessons.find(lesson => lesson.id === id));
        assert.equal(await page.locator('.theory-visual').count(), ['java-basics', 'oop', 'streams', 'tx-proxy'].includes(id) ? 0 : 1);
      }
      assert.equal(await page.evaluate(() => window.qaDiagramInjected), undefined);
    }, { visualModule: `export const lessonVisuals = ${JSON.stringify(damaged)};` });

    const textOnly = structuredClone(lessonVisuals);
    textOnly['java-basics'].title = '<img src=x onerror="window.qaDiagramInjected=true">';
    textOnly['java-basics'].panels[0].nodes[0].label = '<script>window.qaDiagramInjected=true</script>';
    await run('diagram-text-is-not-executed-as-markup', async ({ page }) => {
      await openLesson(page, 'java-basics');
      assert.equal(await page.locator('.visual-title').textContent(), textOnly['java-basics'].title);
      assert.equal(await page.locator('.theory-visual img,.theory-visual script').count(), 0);
      assert.equal(await page.evaluate(() => window.qaDiagramInjected), undefined);
      await originalTheory(page, coreLessons[0]);
    }, { visualModule: `export const lessonVisuals = ${JSON.stringify(textOnly)};` });

    for (const width of [320, 360, 390, 768, 1440]) for (const font of [100, 200]) {
      await run(`all12-diagram-layout-${width}px-${font}percent`, async ({ page }) => {
        for (const id of selected) {
          await openLesson(page, id);
          await geometry(page, id);
        }
        for (const id of ['java-basics', 'security-csrf', 'jwt-validation']) {
          await openLesson(page, id);
          await captureViewport(page, id, `${width}-${font}-title`);
          if (width === 320 && font === 200 || width === 390 && font === 200) {
            await captureViewport(page, id, `${width}-${font}-nodes`, '.visual-node');
            await page.locator('.visual-text-description summary').click();
            await captureViewport(page, id, `${width}-${font}-description`, '.visual-alt-text');
            await captureViewport(page, id, `${width}-${font}-sources`, '.visual-sources');
            await geometry(page, id);
          }
        }
      }, { viewport: { width, height: width < 500 ? 844 : 1000 }, font });
    }

    await run('short-height-orientation-and-expanded-details', async ({ page }) => {
      for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 600 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        for (const id of ['oop', 'streams', 'jwt-validation', 'kafka-idempotency']) {
          await openLesson(page, id);
          await page.locator('.visual-text-description summary').click();
          await geometry(page, id);
        }
        await captureViewport(page, 'kafka-idempotency', `${viewport.width}x${viewport.height}-orientation`, '.visual-node');
      }
    });
  } finally { await browser.close(); }
  const hashes = {};
  for (const relative of ['dist/app.js', 'dist/styles.css', 'dist/data/lesson-visuals.js', 'tests/theory-visuals.mjs']) hashes[relative] = createHash('sha256').update(await readFile(path.join(root, relative))).digest('hex');
  const report = { recordedAt: new Date().toISOString(), browser: process.env.PLAYWRIGHT_CHANNEL || 'chromium', browserVersion: version, mode: 'Isolated browser emulation; mocked API/reference activation; no real devices', selectedLessons: selected, hashes, results };
  await writeFile(path.join(artifacts, `results-${Date.now()}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!results.length || results.some(result => result.status !== 'PASS')) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
