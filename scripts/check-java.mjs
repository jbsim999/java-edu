import { readFile, writeFile, mkdtemp, rm, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { exerciseDefinitions } from '../server/exercises.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'examples/expected-output.json'), 'utf8'));
const javaPath = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const javacPath = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac') : 'javac';
const versionText = execFileSync(javacPath, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Some Java 8 distributions print the compiler version on stderr.
const compilerVersion = (() => {
  try { return versionText.trim(); } catch { return ''; }
})();
let rawVersion = compilerVersion;
if (!rawVersion) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(javacPath, ['-version'], { encoding: 'utf8' });
  rawVersion = result.stdout + result.stderr;
}
const match = rawVersion.match(/javac (?:1\.)?(\d+)/);
assert.ok(match, `Cannot identify javac version: ${rawVersion}`);
const major = Number(match[1]);
let passed = 0;
let skipped = 0;
const temporaryRoot = await realpath(tmpdir());
async function removeOwnedDirectory(directory) {
  const resolved = await realpath(directory);
  assert.equal(path.dirname(resolved), temporaryRoot);
  assert.ok(path.basename(resolved).startsWith('java-edu-check-'));
  await rm(resolved, { recursive: true, force: true });
}
for (const [relativeFile, expected] of Object.entries(manifest)) {
  if (expected.minVersion > major) {
    console.log(`SKIP ${relativeFile}: requires Java ${expected.minVersion}; installed ${major}`);
    skipped += 1;
    continue;
  }
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'java-edu-check-'));
  try {
    const flags = major >= 9 ? ['--release', String(expected.minVersion)] : ['-source', '1.8', '-target', '1.8'];
    execFileSync(javacPath, [...flags, '-encoding', 'UTF-8', '-d', outputDirectory, path.join(root, 'examples', relativeFile)], { stdio: 'pipe' });
    const actual = execFileSync(javaPath, ['-Dfile.encoding=UTF-8', '-cp', outputDirectory, expected.mainClass], { encoding: 'utf8', timeout: 15000 });
    assert.equal(actual.replaceAll('\r\n', '\n').trimEnd(), expected.stdout.replaceAll('\r\n', '\n').trimEnd(), relativeFile);
    console.log(`PASS ${relativeFile} on Java ${major} (target ${expected.minVersion})`);
    passed += 1;
  } finally {
    await removeOwnedDirectory(outputDirectory);
  }
}
const solutions = JSON.parse(await readFile(path.join(root, 'examples/solutions.json'), 'utf8'));
for (const exercise of exerciseDefinitions) {
  if (exercise.minVersion > major) { skipped += 1; continue; }
  const outputDirectory = await mkdtemp(path.join(temporaryRoot, 'java-edu-check-'));
  try {
    const checks = exercise.checks.map((check, index) => `if (!(${check.expression})) throw new AssertionError("check ${index + 1}");`).join('\n');
    const source = `${solutions[exercise.id]}\nclass Main { public static void main(String[] args) throws Exception {\n${checks}\nSystem.out.println("REFERENCE_PASS");\n} }`;
    const sourceFile = path.join(outputDirectory, 'Main.java');
    await writeFile(sourceFile, source);
    const flags = major >= 9 ? ['--release', String(exercise.minVersion)] : ['-source', '1.8', '-target', '1.8'];
    execFileSync(javacPath, [...flags, '-encoding', 'UTF-8', '-d', outputDirectory, sourceFile], { stdio: 'pipe' });
    const actual = execFileSync(javaPath, ['-Dfile.encoding=UTF-8', '-cp', outputDirectory, 'Main'], { encoding: 'utf8', timeout: 15000 });
    assert.ok(actual.includes('REFERENCE_PASS'), exercise.id);
    console.log(`PASS ${exercise.id}: ${exercise.checks.length} checks on Java ${major}`);
    passed += 1;
  } finally { await removeOwnedDirectory(outputDirectory); }
}
assert.ok(passed > 0, 'No compatible examples were tested');
console.log(`Java ${major}: ${passed} passed, ${skipped} skipped`);
