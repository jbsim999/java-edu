import { mkdir, readFile, writeFile, rename, stat, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';
import { LocalError } from './errors.mjs';
import { runProcess, processEnvironment } from './process.mjs';

export const JAVA_VERSIONS = Object.freeze([8, 11, 17, 21]);
export const EXECUTION_NOTICE = '코드는 이 PC의 사용자 권한으로 실행되며 파일과 네트워크에 접근할 수 있습니다. 보안 샌드박스가 아닙니다. 직접 작성했거나 신뢰하는 수업 코드만 실행하세요. 실행 버튼을 누르기 전에는 학습 코드를 실행하지 않습니다.';
export const DEPENDENCY_NOTICE = '실무 환경 준비는 Maven Central에서 고정된 라이브러리를 내려받고 교재의 기준 답안 테스트를 실행합니다. 사용자 코드는 전송하지 않습니다. 준비 뒤 학습자 코드의 Maven 빌드는 오프라인 모드로 실행합니다.';
const executableName = (name) => process.platform === 'win32' ? `${name}.exe` : name;

export function parseJavaVersion(text) {
  const match = text.match(/(?:java|openjdk|javac)(?:\s+version)?\s+"?(1\.)?(\d+)(?:[._+"\s-]|$)/i);
  return match ? Number(match[2]) : null;
}

async function ordinaryFile(file) {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new LocalError('tool_not_found', '선택한 폴더에 필요한 실행 파일이 없습니다.');
  return realpath(file);
}

export async function inspectJdk(home, expectedVersion, { cwd, runner = runProcess } = {}) {
  if (typeof home !== 'string' || !path.isAbsolute(home) || !JAVA_VERSIONS.includes(expectedVersion)) throw new LocalError('invalid_jdk', 'Java 8·11·17·21 중 설치된 JDK 폴더를 선택하세요.');
  const javaHome = await realpath(home).catch(() => null);
  if (!javaHome) throw new LocalError('tool_not_found', 'JDK 폴더를 찾을 수 없습니다.');
  const java = await ordinaryFile(path.join(javaHome, 'bin', executableName('java')));
  const javac = await ordinaryFile(path.join(javaHome, 'bin', executableName('javac')));
  // Resolving both binaries prevents a selected folder from redirecting only the compiler elsewhere.
  if (path.dirname(java) !== path.dirname(javac)) throw new LocalError('jdk_mismatch', 'java와 javac는 같은 JDK의 bin 폴더에 있어야 합니다.');
  const options = { cwd, timeoutMs: 10_000, env: processEnvironment(javaHome, cwd) };
  const [runtime, compiler] = await Promise.all([runner(java, ['-Xms16m', '-Xmx96m', '-version'], options), runner(javac, ['-J-Xmx128m', '-version'], options)]);
  const runtimeVersion = parseJavaVersion(runtime.stdout + runtime.stderr);
  const compilerVersion = parseJavaVersion(compiler.stdout + compiler.stderr);
  if (runtime.reason !== 'exited' || compiler.reason !== 'exited' || runtime.exitCode !== 0 || compiler.exitCode !== 0
    || runtimeVersion !== expectedVersion || compilerVersion !== expectedVersion) {
    throw new LocalError('jdk_mismatch', `선택한 폴더의 java와 javac가 모두 Java ${expectedVersion}인지 확인하세요. ${[runtime.stdout, runtime.stderr, compiler.stdout, compiler.stderr].join('\n').trim().slice(0, 1200)}`);
  }
  return { home: javaHome, java, javac, version: expectedVersion, verifiedAt: new Date().toISOString(), description: (runtime.stdout + runtime.stderr).trim().slice(0, 500) };
}

export async function inspectMaven(home) {
  if (typeof home !== 'string' || !path.isAbsolute(home)) throw new LocalError('invalid_maven', 'Maven 배포본의 폴더를 선택하세요.');
  const mavenHome = await realpath(home).catch(() => null);
  if (!mavenHome) throw new LocalError('tool_not_found', 'Maven 폴더를 찾을 수 없습니다.');
  const names = await readdir(path.join(mavenHome, 'boot')).catch(() => []);
  const classworlds = names.filter((name) => /^plexus-classworlds-[A-Za-z0-9.-]+\.jar$/.test(name));
  if (classworlds.length !== 1) throw new LocalError('invalid_maven', 'Apache Maven 3 배포본의 boot 폴더를 확인하세요.');
  const launcher = await ordinaryFile(path.join(mavenHome, 'boot', classworlds[0]));
  const configuration = await ordinaryFile(path.join(mavenHome, 'bin', 'm2.conf'));
  const lib = await readdir(path.join(mavenHome, 'lib')).catch(() => []);
  const version = lib.map((name) => /^maven-core-(3\.\d+\.\d+)\.jar$/.exec(name)?.[1]).find(Boolean);
  if (!version || Number(version.split('.')[1]) < 9) throw new LocalError('maven_version', 'Apache Maven 3.9 이상의 Maven 3 배포본을 선택하세요.');
  return { home: mavenHome, launcher, configuration, version, verifiedAt: new Date().toISOString() };
}

export function createSettingsStore(dataRoot, { runner = runProcess, bundledRuntime = null } = {}) {
  if (!path.isAbsolute(dataRoot)) throw new Error('An absolute app-owned data root is required.');
  const settingsFile = path.join(dataRoot, 'settings.json');
  const inspectionRoot = path.join(dataRoot, 'tool-checks');
  let settings = { schema: 1, jdks: {}, maven: null, executionConsent: false, bundledRuntime: null };
  let writeQueue = Promise.resolve();
  async function save() {
    const snapshot = JSON.stringify(settings, null, 2);
    writeQueue = writeQueue.catch(() => {}).then(async () => {
      const temporary = `${settingsFile}.tmp`;
      await writeFile(temporary, snapshot, { mode: 0o600 });
      await rename(temporary, settingsFile);
    });
    await writeQueue;
  }
  return {
    async initialize() {
      await mkdir(inspectionRoot, { recursive: true });
      try {
        const stored = JSON.parse(await readFile(settingsFile, 'utf8'));
        if (stored.schema === 1 && stored.jdks && typeof stored.jdks === 'object') {
          settings.executionConsent = stored.executionConsent === true;
          for (const version of JAVA_VERSIONS) {
            const entry = stored.jdks[version];
            // Startup reads only metadata. Executables are probed after the user's selection or execution action.
            // A persisted bundled path can be stale after reinstall/moving a ZIP. Never use it.
            if (entry && entry.source !== 'bundled' && entry.version === version && typeof entry.home === 'string' && path.isAbsolute(entry.home)) {
              settings.jdks[version] = { home: entry.home, version, java: path.join(entry.home, 'bin', executableName('java')), javac: path.join(entry.home, 'bin', executableName('javac')), verifiedAt: entry.verifiedAt, description: entry.description, source: 'external' };
            }
          }
          if (stored.maven?.source !== 'bundled' && stored.maven?.home && path.isAbsolute(stored.maven.home)) {
            const maven = await inspectMaven(stored.maven.home).catch(() => null);
            if (maven) settings.maven = { ...maven, source: 'external' };
          }
        }
      } catch { /* An absent or malformed settings file starts with no configured tools. */ }
      if (bundledRuntime) {
        // Only desktop main supplies this verified, app-resource-owned object. It is not an IPC input.
        const bundledMaven = await inspectMaven(bundledRuntime.maven.home);
        if (bundledMaven.version !== bundledRuntime.maven.version) throw new LocalError('bundled_maven_mismatch', '앱에 포함된 Maven 버전을 확인할 수 없습니다.', 500);
        for (const jdk of bundledRuntime.jdks) {
          if (!JAVA_VERSIONS.includes(jdk.version) || !path.isAbsolute(jdk.home)) throw new LocalError('invalid_bundled_jdk', '앱에 포함된 JDK 경로를 확인할 수 없습니다.', 500);
          if (!settings.jdks[jdk.version]) settings.jdks[jdk.version] = {
            home: jdk.home, version: jdk.version, java: path.join(jdk.home, 'bin', executableName('java')), javac: path.join(jdk.home, 'bin', executableName('javac')),
            description: jdk.description, source: 'bundled', bundleId: bundledRuntime.id,
          };
        }
        if (!settings.maven) settings.maven = { ...bundledMaven, source: 'bundled', bundleId: bundledRuntime.id };
        settings.bundledRuntime = { id: bundledRuntime.id, javaVersions: bundledRuntime.jdks.map((jdk) => jdk.version), mavenVersion: bundledMaven.version };
      }
      return this.snapshot();
    },
    snapshot() { return structuredClone(settings); },
    async chooseJdk(home, version) {
      const result = await inspectJdk(home, version, { cwd: inspectionRoot, runner });
      settings.jdks[version] = { ...result, source: 'external' };
      await save();
      return this.snapshot();
    },
    async chooseMaven(home) {
      settings.maven = { ...await inspectMaven(home), source: 'external' };
      await save();
      return this.snapshot();
    },
    async setConsent(accepted) {
      if (typeof accepted !== 'boolean') throw new LocalError('invalid_consent', '실행 동의 값을 확인하세요.');
      settings.executionConsent = accepted;
      await save();
      return this.snapshot();
    },
    async verifyJdk(version) {
      const entry = settings.jdks[version];
      if (!entry) throw new LocalError('jdk_required', `실행할 Java ${version} JDK를 먼저 등록하세요.`, 409);
      const verified = await inspectJdk(entry.home, version, { cwd: inspectionRoot, runner });
      settings.jdks[version] = { ...verified, source: entry.source || 'external', ...(entry.bundleId ? { bundleId: entry.bundleId } : {}) };
      return settings.jdks[version];
    },
  };
}
