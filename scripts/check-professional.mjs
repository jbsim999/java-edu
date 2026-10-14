import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const course = path.join(root, 'curriculum/professional');
const catalog = JSON.parse(await readFile(path.join(course, 'catalog.json'), 'utf8'));
const compileOnly = process.argv.includes('--compile-only');
const selected = process.argv.slice(2).filter((arg) => arg !== '--compile-only');
const externalLessons = new Set(['redis-cache', 'kafka-idempotency']);
const entries = selected.length ? catalog.lessons.filter((l) => selected.includes(l.id)) : catalog.lessons.filter((l) => !externalLessons.has(l.id));
if (!selected.length) for (const id of externalLessons) console.log(`SKIP ${id}: optional Redis/Kafka services are required`);
if (selected.some((id) => !entries.some((e) => e.id === id))) throw new Error('Unknown lesson ID');
const workspace = path.resolve(process.env.PROFESSIONAL_CHECK_DIR || path.join(root, 'work/professional-check', String(Date.now())));
const javaHome = process.env.JAVA_HOME;
const mavenHome = process.env.MAVEN_HOME;
if (!javaHome || !mavenHome) throw new Error('JAVA_HOME and MAVEN_HOME are required');
const java = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const launcherName = (await readdir(path.join(mavenHome, 'boot'))).find((n) => /^plexus-classworlds-.*\.jar$/.test(n));
if (!launcherName) throw new Error('Maven classworlds launcher is missing');
await mkdir(workspace, { recursive: true });
await cp(path.join(course, 'pom.xml'), path.join(workspace, 'pom.xml'));
const results = [];
for (const lesson of entries) {
  const dir = path.join(workspace, 'lessons', lesson.id);
  await mkdir(dir, { recursive: true });
  for (const kind of ['reference', 'starter', 'grader']) {
    await cp(path.join(course, 'lessons', lesson.id, kind), path.join(dir, kind), { recursive: true, filter: (p) => !p.split(path.sep).includes('target') });
  }
  const args = ['-Xmx768m', '-Dfile.encoding=UTF-8', `-Dmaven.home=${mavenHome}`, `-Dmaven.multiModuleProjectDirectory=${workspace}`, `-Dclassworlds.conf=${path.join(mavenHome, 'bin/m2.conf')}`, '-classpath', path.join(mavenHome, 'boot', launcherName), 'org.codehaus.plexus.classworlds.launcher.Launcher', '-B', '-ntp', `-Dmaven.repo.local=${path.resolve(process.env.PROFESSIONAL_M2 || path.join(workspace, 'm2'))}`, compileOnly ? 'test-compile' : 'test'];
  const run = async (kind) => {
    const log = [];
    const env = { ...process.env, JAVA_HOME: javaHome };
    for (const name of ['JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'CLASSPATH', 'MAVEN_OPTS', 'MAVEN_ARGS']) delete env[name];
    const child = spawn(java, args, { cwd: path.join(dir, kind), env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (b) => log.push(b));
    child.stderr.on('data', (b) => log.push(b));
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    const output = Buffer.concat(log).toString('utf8');
    await writeFile(path.join(dir, `${kind}.log`), output);
    let tests = 0, failures = 0, errors = 0;
    const reportsDir = path.join(dir, kind, 'target/surefire-reports');
    try {
      for (const name of await readdir(reportsDir)) {
        if (!/^TEST-.*\.xml$/.test(name)) continue;
        const report = await readFile(path.join(reportsDir, name), 'utf8');
        const attrs = report.match(/<testsuite\s[^>]*>/)?.[0] || '';
        tests += Number(attrs.match(/\btests="(\d+)"/)?.[1] || 0);
        failures += Number(attrs.match(/\bfailures="(\d+)"/)?.[1] || 0);
        errors += Number(attrs.match(/\berrors="(\d+)"/)?.[1] || 0);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return { code, tests, failures, errors, log: path.join(dir, `${kind}.log`) };
  };
  const reference = await run('reference');
  const starter = reference.code === 0 && (compileOnly || reference.tests > 0) ? await run('starter') : null;
  const passed = compileOnly ? reference.code === 0 && starter?.code === 0 : reference.code === 0 && reference.tests > 0 && reference.failures === 0 && reference.errors === 0 && starter?.code !== 0 && (starter?.failures + starter?.errors) > 0;
  results.push({ id: lesson.id, mode: compileOnly ? 'compile-only' : 'test', passed, reference, starter });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${lesson.id}: ${compileOnly ? 'compile only; service execution not verified' : `reference ${reference.tests} tests, starter ${starter?.failures ?? '-'} failures/${starter?.errors ?? '-'} errors`}`);
}
await writeFile(path.join(workspace, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), javaHome, mavenHome, results }, null, 2));
console.log(`Evidence: ${workspace}`);
if (results.some((r) => !r.passed)) process.exitCode = 1;
