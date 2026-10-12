import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { LocalError, requireRecord } from './errors.mjs';
import { safeRelativePath, readTrustedFile } from './workspace.mjs';
import { requiredServices } from './resources.mjs';

const xmlUnescape = (value) => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const xmlEscape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function loadProfessionalProjects(projectRoot) {
  try {
    const catalog = JSON.parse(await readFile(path.join(projectRoot, 'catalog.json'), 'utf8'));
    const profiles = JSON.parse(await readFile(path.join(projectRoot, 'profiles.json'), 'utf8'));
    if (catalog.schemaVersion !== 1 || profiles.schemaVersion !== 1) throw new Error('Unsupported schema');
    return catalog.lessons.map((lesson) => {
      const profile = profiles.profiles.find((entry) => entry.id === lesson.profileId);
      if (!profile) throw new Error('Missing profile');
      return { ...lesson, exerciseId: lesson.exerciseId || `${lesson.id}-project`, minVersion: profile.compilerTarget, profile };
    });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new LocalError('project_configuration', '실무 교재 카탈로그를 읽을 수 없습니다.', 500);
  }
}

export function validateSubmittedFiles(project, supplied) {
  requireRecord(supplied, '실습 파일 목록을 확인하세요.');
  const allowed = new Set(project.editableFiles || []);
  if (!allowed.size || !Array.isArray(project.files) || !Array.isArray(project.testFiles)) throw new LocalError('project_not_ready', '이 실습의 로컬 실행 파일을 아직 준비 중입니다.', 409);
  let total = 0;
  for (const [file, source] of Object.entries(supplied)) {
    safeRelativePath(file);
    if (!allowed.has(file)) throw new LocalError('file_not_editable', '이 실습에서 편집할 수 없는 파일입니다.');
    if (typeof source !== 'string' || source.includes('\0') || Buffer.byteLength(source) > 64 * 1024) throw new LocalError('source_too_large', '각 파일은 UTF-8 64 KiB 이하의 텍스트여야 합니다.', 413);
    total += Buffer.byteLength(source);
  }
  if (Object.keys(supplied).length !== allowed.size || [...allowed].some((file) => !Object.hasOwn(supplied, file))) throw new LocalError('missing_file', '편집 가능한 모든 실습 파일을 제출하세요.');
  if (total > 256 * 1024) throw new LocalError('source_too_large', '실습 파일 합계는 UTF-8 256 KiB 이하여야 합니다.', 413);
  return supplied;
}

export async function describeProject(projectRoot, project) {
  if (!Array.isArray(project.files) || !project.files.length) throw new LocalError('project_not_ready', '이 실습의 프로젝트 파일을 준비 중입니다.', 409);
  return {
    exerciseId: project.exerciseId, lessonId: project.id, title: project.title, profileId: project.profileId,
    runtimeRequirements: { minimumJava: project.minVersion, recommendedJava: 21, maven: '3.9+', dependencySetupRequired: true, services: requiredServices(project).map(({ type, host, port, label }) => ({ type, host, port, label })) },
    files: await Promise.all(project.files.map(async (file) => ({ path: safeRelativePath(file.path), source: await readTrustedFile(projectRoot, file.templatePath), editable: file.editable === true }))),
    notice: '실행과 제출 모두 교재에 고정된 테스트를 실행합니다. 외부 Redis·Kafka·OAuth 서비스와 실제 통신하는 운영 실습은 별도 환경이 필요합니다.',
  };
}

export async function materializeProject(workspace, projectRoot, project, supplied, { reference = false } = {}) {
  if (!Array.isArray(project.files) || !Array.isArray(project.testFiles)) throw new LocalError('project_not_ready', '실무 프로젝트 파일을 준비 중입니다.', 409);
  const base = `professional/lessons/${safeRelativePath(project.id)}`;
  const moduleName = reference ? 'reference' : 'starter';
  const module = `${base}/${moduleName}`;
  await workspace.write('professional/pom.xml', await readTrustedFile(projectRoot, 'pom.xml'));
  let hasPom = false;
  for (const file of project.files) {
    safeRelativePath(file.path);
    if (file.path === 'pom.xml') hasPom = true;
    const source = !reference && file.editable ? supplied[file.path] : await readTrustedFile(projectRoot, reference ? file.referencePath : file.templatePath);
    await workspace.write(`${module}/${file.path}`, source);
  }
  if (!hasPom) await workspace.write(`${module}/pom.xml`, await readTrustedFile(projectRoot, `${reference ? project.referenceDir : project.starterDir}/pom.xml`));
  for (const file of project.testFiles) {
    const relative = safeRelativePath(file.path);
    // Graders are siblings of starter/reference, matching the authored parent POM.
    await workspace.write(`${base}/grader/${relative}`, await readTrustedFile(projectRoot, file.sourcePath));
  }
  return path.join(workspace.directory, module);
}

/** Invoke Maven's Java entry point directly: no cmd.exe, learner commands, wrappers or user settings. */
export async function mavenCommand({ workspace, moduleDirectory, dataRoot, jdk, maven, offline = true }) {
  const repository = path.join(dataRoot, 'maven-repository');
  await mkdir(repository, { recursive: true });
  const settings = `<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"><localRepository>${xmlEscape(repository)}</localRepository><interactiveMode>false</interactiveMode><mirrors><mirror><id>java-edu-central</id><mirrorOf>*</mirrorOf><url>https://repo.maven.apache.org/maven2</url></mirror></mirrors></settings>`;
  const settingsPath = await workspace.write('maven-settings.xml', settings);
  return {
    executable: jdk.java,
    args: [
      '-Xmx512m', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-Dsun.stdout.encoding=UTF-8', '-Dsun.stderr.encoding=UTF-8', ...(process.platform === 'win32' ? ['-Djavax.net.ssl.trustStoreType=Windows-ROOT', '-Djavax.net.ssl.trustStore=NONE'] : []), `-Duser.home=${workspace.directory}`, `-Dmaven.home=${maven.home}`,
      `-Dclassworlds.conf=${maven.configuration}`, `-Dmaven.multiModuleProjectDirectory=${moduleDirectory}`,
      '-classpath', maven.launcher, 'org.codehaus.plexus.classworlds.launcher.Launcher',
      '--batch-mode', '--no-transfer-progress', ...(offline ? ['--offline'] : []),
      '--settings', settingsPath, '--global-settings', settingsPath, '--file', path.join(moduleDirectory, 'pom.xml'),
      // A fresh Maven JVM already exists per job. Avoid Surefire's internal cmd.exe launcher,
      // which expands literal %VAR% segments in valid Windows profile paths.
      '-Dstyle.color=never', '-DforkCount=0', 'test',
    ],
  };
}

/** Minimal, bounded parsing of Surefire's own report format; XML entities and external resources are never evaluated. */
export async function readTestReports(moduleDirectory) {
  const directory = path.join(moduleDirectory, 'target', 'surefire-reports');
  const names = (await readdir(directory).catch(() => [])).filter((name) => /^TEST-[A-Za-z0-9_.$-]+\.xml$/.test(name)).sort();
  if (names.length > 64) throw new LocalError('report_limit', '테스트 결과 파일이 너무 많습니다.', 422);
  const checks = [];
  let bytes = 0;
  for (const name of names) {
    const file = path.join(directory, name);
    const info = await stat(file);
    bytes += info.size;
    if (!info.isFile() || info.size > 512 * 1024 || bytes > 2 * 1024 * 1024) throw new LocalError('report_limit', '테스트 결과가 크기 제한을 넘었습니다.', 422);
    const text = await readFile(file, 'utf8');
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new LocalError('invalid_test_report', '지원하지 않는 테스트 결과 형식입니다.', 422);
    for (const match of text.matchAll(/<testcase\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/testcase>)/g)) {
      const nameMatch = /\bname="([^"]*)"/.exec(match[1]);
      const classMatch = /\bclassname="([^"]*)"/.exec(match[1]);
      if (!nameMatch) continue;
      const body = match[2] || '';
      const skipped = /<skipped\b/.test(body);
      checks.push({ name: xmlUnescape(`${classMatch?.[1] || 'test'} · ${nameMatch[1]}`).slice(0, 250), passed: !skipped && !/<(?:failure|error)\b/.test(body), ...(skipped ? { skipped: true } : {}) });
    }
  }
  return checks;
}

export async function readTestDiagnostics(moduleDirectory) {
  const directory = path.join(moduleDirectory, 'target', 'surefire-reports');
  const names = (await readdir(directory).catch(() => [])).filter((name) => /^[A-Za-z0-9_.-]+\.(?:dump|dumpstream)$/.test(name)).slice(0, 8);
  const output = [];
  for (const name of names) {
    const file = path.join(directory, name);
    const info = await stat(file);
    if (info.isFile() && info.size <= 16 * 1024) output.push(`${name}\n${await readFile(file, 'utf8')}`);
  }
  return output.join('\n').slice(0, 16 * 1024);
}
