// Build-time staging only. The desktop application never downloads or installs a toolchain.
import { cp, lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { loadBundledRuntime, manifestIdentity, inventoryTree, validateProvenance } from '../desktop/bundled-runtime.cjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(projectRoot, 'work', 'desktop-bundle');
const { values } = parseArgs({ options: {
  check: { type: 'boolean', default: false },
  metadata: { type: 'string' },
  maven: { type: 'string' },
  jdk8: { type: 'string' }, jdk11: { type: 'string' }, jdk17: { type: 'string' }, jdk21: { type: 'string' },
}, strict: true });

function inside(root, child) {
  const relative = path.relative(root, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function record(value) {
  validateProvenance(value);
  return { distribution: value.distribution, version: value.version, sourceUrl: value.sourceUrl, archiveSha256: value.archiveSha256,
    license: value.license, licenseFiles: [...value.licenseFiles], ...(value.sourceCodeUrl ? { sourceCodeUrl: value.sourceCodeUrl } : {}),
    ...(value.redistributionSourceUrl ? { redistributionSourceUrl: value.redistributionSourceUrl } : {}),
    ...(value.redistributionSourceFiles ? { redistributionSourceFiles: [...value.redistributionSourceFiles] } : {}) };
}

async function sourceDirectory(value) {
  if (!value) throw new Error('검증한 JDK 21·Maven 폴더와 --metadata가 필요합니다.');
  const root = await realpath(path.resolve(value));
  if (!(await lstat(root)).isDirectory() || inside(root, destination)) throw new Error('배포본 폴더는 출력 디렉터리의 상위일 수 없습니다.');
  return root;
}

async function copyDistribution(source, target) {
  const originals = await inventoryTree(source); // Reject symlinks before copying a vendor distribution.
  await cp(source, target, { recursive: true, dereference: false, force: false, errorOnExist: true });
  const copied = await inventoryTree(target);
  if (JSON.stringify(originals) !== JSON.stringify(copied)) throw new Error('복사 전후 배포본 파일이 일치하지 않습니다.');
}

if (values.check) {
  if (Object.entries(values).some(([key, value]) => key !== 'check' && value !== undefined)) throw new Error('--check는 다른 입력과 함께 사용할 수 없습니다.');
  const bundle = await loadBundledRuntime(destination);
  console.log(JSON.stringify({ status: 'passed', directory: destination, id: bundle.id, javaVersions: bundle.jdks.map((jdk) => jdk.version), mavenVersion: bundle.maven.version, files: bundle.fileCount, bytes: bundle.bytes }, null, 2));
} else {
  if (!values.metadata || !values.jdk21 || !values.maven) throw new Error('사용법: node scripts/bundle-runtime.mjs --jdk21 <폴더> --maven <폴더> --metadata <배포 출처 JSON>');
  const existing = await lstat(destination).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing) throw new Error('work/desktop-bundle이 이미 있습니다. --check로 검사하거나 기존 결과를 보존한 뒤 새로 준비하세요.');
  const metadataPath = path.resolve(values.metadata);
  if ((await lstat(metadataPath)).size > 1024 * 1024) throw new Error('배포 출처 JSON이 너무 큽니다.');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (!Array.isArray(metadata.jdks) || !metadata.jdks.length || metadata.jdks.length > 4) throw new Error('JDK 배포 출처가 필요합니다.');
  const jdks = [];
  for (const major of [8, 11, 17, 21]) {
    const source = values[`jdk${major}`];
    const entries = metadata.jdks.filter((jdk) => jdk.major === major);
    if (entries.length > 1 || Boolean(source) !== (entries.length === 1)) throw new Error(`Java ${major} 폴더와 배포 출처가 일치하지 않습니다.`);
    if (!source) continue;
    const details = record(entries[0]);
    if (!details.sourceCodeUrl) throw new Error('JDK 재배포의 정확한 소스 코드 위치를 기록하세요.');
    const root = await sourceDirectory(source);
    const release = await readFile(path.join(root, 'release'), 'utf8');
    const installedVersion = /^JAVA_VERSION="([^"]+)"/m.exec(release)?.[1];
    const installedMajor = Number(installedVersion?.startsWith('1.') ? installedVersion.split('.')[1] : installedVersion?.split(/[.+_-]/)[0]);
    if (installedMajor !== major || !/^OS_ARCH="(?:x86_64|amd64)"/m.test(release) || !/^OS_NAME="Windows"/m.test(release)) throw new Error('Windows x64용 요청 JDK 버전인지 확인하세요.');
    const exactVersions = [installedVersion, /^SEMANTIC_VERSION="([^"]+)"/m.exec(release)?.[1], /^JAVA_RUNTIME_VERSION="([^"]+)"/m.exec(release)?.[1]?.replace(/-LTS$/, '')];
    if (!exactVersions.includes(details.version)) throw new Error('기록한 JDK 배포 버전과 실제 release 파일이 일치하지 않습니다.');
    jdks.push({ major, home: `jdks/${major}`, ...details, source: root });
  }
  if (metadata.jdks.length !== jdks.length) throw new Error('지원하지 않는 JDK 배포 출처가 있습니다.');
  const mavenSource = await sourceDirectory(values.maven);
  const maven = { home: 'maven', ...record(metadata.maven) };
  await mkdir(path.dirname(destination), { recursive: true });
  const staging = path.join(path.dirname(destination), `desktop-bundle.partial-${randomUUID()}`);
  await mkdir(staging);
  try {
    for (const jdk of jdks) await copyDistribution(jdk.source, path.join(staging, ...jdk.home.split('/')));
    await copyDistribution(mavenSource, path.join(staging, maven.home));
    const notices = ['Java Edu bundled third-party distributions', '',
      'These complete, unmodified vendor distributions retain their original licenses and notices.',
      'Archive checksums identify the original downloads; manifest.json records every packaged file.',
      'No vendor endorsement is implied.', '',
      ...[...jdks, maven].flatMap((tool) => [
        `${tool.distribution} ${tool.version}`, `License: ${tool.license}`, `Download: ${tool.sourceUrl}`, `Original archive SHA-256: ${tool.archiveSha256}`,
        ...(tool.sourceCodeUrl ? [`Corresponding source: ${tool.sourceCodeUrl}`] : []),
        ...(tool.redistributionSourceUrl ? [`Redistributed corresponding source: ${tool.redistributionSourceUrl}`, `Source assets / contents: ${(tool.redistributionSourceFiles || []).join(', ')}`] : []),
        `License and notice paths: ${tool.licenseFiles.map((file) => `${tool.home}/${file}`).join(', ')}`, '',
      ]),
    ].join('\n');
    await writeFile(path.join(staging, 'THIRD-PARTY-NOTICES.txt'), notices, 'utf8');
    const manifest = { schemaVersion: 1, platform: 'win32', arch: 'x64', jdks: jdks.map(({ source: _source, ...jdk }) => jdk), maven, files: await inventoryTree(staging) };
    manifest.id = manifestIdentity(manifest);
    await writeFile(path.join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    const bundle = await loadBundledRuntime(staging);
    await rename(staging, destination);
    console.log(JSON.stringify({ status: 'passed', directory: destination, id: bundle.id, javaVersions: bundle.jdks.map((jdk) => jdk.version), mavenVersion: bundle.maven.version, files: bundle.fileCount, bytes: bundle.bytes }, null, 2));
  } catch (error) {
    console.error(`불완전한 결과는 실행에 사용하지 않습니다. 검사 경로: ${staging}`);
    throw error;
  }
}
