// Opt-in actual native bundled toolchain check: no folder selection or external tool install.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBundledRuntime } from '../../desktop/bundled-runtime.cjs';
import { createSettingsStore } from '../../server/local/settings.mjs';
import { createLocalEngine } from '../../server/local/engine.mjs';
import { exerciseDefinitions } from '../../server/exercises.mjs';

if (!['win32', 'darwin'].includes(process.platform)) throw new Error('Bundled runtime smoke supports Windows and macOS.');
const root = fileURLToPath(new URL('../../', import.meta.url));
const bundleRoot = path.join(root, 'work/desktop-bundle');
const dataRoot = path.join(root, 'work', `bundled-runtime-smoke-${randomUUID()}`);
await mkdir(dataRoot);
const report = { startedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, bundleRoot, dataRoot, results: [] };
let engine;
try {
  const bundle = await loadBundledRuntime(bundleRoot);
  report.bundleId = bundle.id;
  const settings = createSettingsStore(dataRoot, { bundledRuntime: bundle });
  const initial = await settings.initialize();
  assert.equal(initial.executionConsent, false);
  assert.equal(initial.jdks[21].source, 'bundled');
  assert.equal(initial.maven.source, 'bundled');
  assert.deepEqual(Object.keys(initial.jdks), ['21']);
  await settings.setConsent(true);
  engine = await createLocalEngine({ dataRoot, projectRoot: path.join(root, 'curriculum/professional'), settings });
  assert.equal(engine.runtime().runtime.javaVersion, 21);
  const solutions = JSON.parse(await readFile(path.join(root, 'examples/solutions.json'), 'utf8'));
  for (const definition of exerciseDefinitions) {
    const result = await engine.execute({ exerciseId: definition.id, action: 'submit', source: solutions[definition.id], requestId: `bundled-${definition.id}` });
    report.results.push({ exerciseId: definition.id, runtime: result.runtimeVersion, target: result.targetVersion, status: result.status, passed: result.passed, total: result.total });
    console.log(JSON.stringify(report.results.at(-1)));
    if (result.status !== 'passed') console.error(result);
    assert.equal(result.status, 'passed');
    assert.equal(result.runtimeVersion, 21);
    assert.equal(result.targetVersion, definition.minVersion);
  }
  for (const lessonId of (process.env.JAVA_EDU_BUNDLE_SMOKE_PROJECT || '').split(',').filter(Boolean)) {
    const exerciseId = `${lessonId}-project`;
    const prepared = await engine.prepare({ exerciseId, requestId: `prepare-${lessonId}` });
    report.results.push({ exerciseId, action: 'prepare', status: prepared.status, passed: prepared.passed, total: prepared.total });
    console.log(JSON.stringify(report.results.at(-1)));
    if (prepared.status !== 'passed') console.error(prepared);
    assert.equal(prepared.status, 'passed');
    const lesson = JSON.parse(await readFile(path.join(root, 'curriculum/professional/lessons', lessonId, 'lesson.json'), 'utf8'));
    const files = Object.fromEntries(await Promise.all(lesson.professionalExercise.files.filter((file) => file.editable).map(async (file) => [file.path, await readFile(path.join(root, 'curriculum/professional', file.referencePath), 'utf8')])));
    const result = await engine.execute({ exerciseId, action: 'submit', files, requestId: `submit-${lessonId}` });
    report.results.push({ exerciseId, action: 'submit', runtime: result.runtimeVersion, target: result.targetVersion, status: result.status, passed: result.passed, total: result.total });
    console.log(JSON.stringify(report.results.at(-1)));
    if (result.status !== 'passed') console.error(result);
    assert.equal(result.status, 'passed');
  }
  const restarted = createSettingsStore(dataRoot, { bundledRuntime: await loadBundledRuntime(bundleRoot) });
  const restored = await restarted.initialize();
  assert.equal(restored.jdks[21].source, 'bundled');
  assert.equal(restored.maven.source, 'bundled');
  assert.equal(restored.executionConsent, true);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.message;
  throw error;
} finally {
  await engine?.close();
  report.finishedAt = new Date().toISOString();
  const evidence = path.join(dataRoot, 'results.json');
  await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ evidence, status: report.status }));
}
