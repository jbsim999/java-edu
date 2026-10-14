// Opt-in integration check. Runs repository-authored reference answers only.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSettingsStore } from '../../server/local/settings.mjs';
import { createLocalEngine } from '../../server/local/engine.mjs';
import { exerciseDefinitions } from '../../server/exercises.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const ephemeralParent = await realpath(tmpdir());
const root = process.env.JAVA_EDU_SMOKE_ROOT ? path.resolve(process.env.JAVA_EDU_SMOKE_ROOT) : await mkdtemp(path.join(ephemeralParent, 'java-edu-java-smoke-한글 & %JAVA_HOME%-'));
await mkdir(root, { recursive: true });
if (process.env.JAVA_EDU_SMOKE_CACHE && !process.env.JAVA_EDU_SMOKE_ROOT) await cp(process.env.JAVA_EDU_SMOKE_CACHE, path.join(root, 'maven-repository'), { recursive: true, errorOnExist: true, force: false });
const settings = createSettingsStore(root);
let engine;
try {
  await settings.initialize();
  for (const version of [8, 11, 17, 21]) {
    const home = process.env[`JAVA_EDU_JDK_${version}`];
    if (home) await settings.chooseJdk(home, version);
  }
  await settings.setConsent(true);
  if (process.env.JAVA_EDU_MAVEN_HOME) await settings.chooseMaven(process.env.JAVA_EDU_MAVEN_HOME);
  engine = await createLocalEngine({ dataRoot: root, projectRoot: path.join(repo, 'curriculum/professional'), settings });
  const solutions = JSON.parse(await readFile(path.join(repo, 'examples/solutions.json'), 'utf8'));
  if (process.env.JAVA_EDU_SMOKE_PROJECT) {
    for (const id of process.env.JAVA_EDU_SMOKE_PROJECT.split(',')) {
    const result = await engine.prepare({ exerciseId: `${id}-project`, requestId: `prepare-${Date.now()}`, runtimeVersion: 21 });
    console.log(JSON.stringify(result.status === 'passed' ? { exerciseId: `${id}-project`, operation: 'prepare', status: result.status, runtimeVersion: result.runtimeVersion, passed: result.passed, total: result.total, durationMs: result.durationMs } : result, null, 2));
    assert.equal(result.status, 'passed');
    const project = await engine.project(`${id}-project`);
    const lesson = JSON.parse(await readFile(path.join(repo, `curriculum/professional/lessons/${id}/lesson.json`), 'utf8'));
    const files = Object.fromEntries(await Promise.all(lesson.professionalExercise.files.filter((file) => file.editable).map(async (file) => [file.path, await readFile(path.join(repo, 'curriculum/professional', file.referencePath), 'utf8')])));
    const submitted = await engine.execute({ exerciseId: project.exerciseId, files, action: 'submit', requestId: `submit-${Date.now()}`, runtimeVersion: 21 });
    console.log(JSON.stringify({ exerciseId: project.exerciseId, status: submitted.status, runtimeVersion: submitted.runtimeVersion, passed: submitted.passed, total: submitted.total, stderr: submitted.stderr }, null, 2));
    assert.equal(submitted.status, 'passed');
    }
  } else {
    for (const version of [8, 11, 17, 21]) {
      if (!process.env[`JAVA_EDU_JDK_${version}`]) continue;
      for (const exercise of exerciseDefinitions.filter((definition) => definition.minVersion <= version && (!process.env.JAVA_EDU_SMOKE_EXERCISE || definition.id === process.env.JAVA_EDU_SMOKE_EXERCISE))) {
        const result = await engine.execute({ exerciseId: exercise.id, source: solutions[exercise.id], action: 'submit', requestId: `smoke-${version}-${exercise.id}`, runtimeVersion: version });
        console.log(JSON.stringify({ exerciseId: exercise.id, runtime: result.runtimeVersion, target: result.targetVersion, status: result.status, passed: result.passed, total: result.total, durationMs: result.durationMs }));
        if (result.status !== 'passed') console.error(result.compilerOutput, result.stderr, result.stdout);
        assert.equal(result.status, 'passed');
        assert.equal(result.runtimeVersion, version);
      }
      const compilationError = await engine.execute({ exerciseId: 'java-basics-lab', source: 'class Solution { public boolean sameCode(String left, String right) { return 없는변수; } }', action: 'submit', requestId: `smoke-korean-error-${version}`, runtimeVersion: version });
      assert.equal(compilationError.status, 'compile_error');
      assert.match(compilationError.compilerOutput, /없는변수/);
      console.log(JSON.stringify({ case: 'Korean compiler diagnostics', runtime: version, status: 'passed' }));
    }
  }
} finally {
  await engine?.close();
  if (!process.env.JAVA_EDU_SMOKE_ROOT) {
    const verified = await realpath(root);
    assert.equal(path.dirname(verified), ephemeralParent);
    assert.ok(path.basename(verified).startsWith('java-edu-java-smoke-'));
    await rm(verified, { recursive: true, force: true });
  }
}
