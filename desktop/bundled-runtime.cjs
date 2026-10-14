const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { lstat, readFile, readlink, readdir, realpath } = require('node:fs/promises');
const path = require('node:path');

const JAVA_VERSIONS = [8, 11, 17, 21];
const MAX_FILES = 12_000;
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const BUNDLE_ERROR = '앱에 포함된 Java/Maven 파일을 확인할 수 없습니다. 원본 설치 파일을 다시 설치하거나 ZIP을 새 폴더에 풀어 주세요.';

function failure(detail) {
  const error = new Error(`${BUNDLE_ERROR} (${detail})`);
  error.code = 'invalid_bundled_runtime';
  return error;
}

function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.length > 700 || /[\\\x00-\x1f<>:"|?*]/.test(value)
    || value.split('/').some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part))) throw failure('invalid relative path');
  return value;
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash;
  } catch { return false; }
}

function validateProvenance(value) {
  if (!value || typeof value !== 'object' || typeof value.distribution !== 'string' || !value.distribution.trim()
    || typeof value.version !== 'string' || !value.version.trim() || !httpsUrl(value.sourceUrl)
    || !SHA256.test(value.archiveSha256) || typeof value.license !== 'string' || !value.license.trim()
    || !Array.isArray(value.licenseFiles) || !value.licenseFiles.length || value.licenseFiles.length > 40
    || (value.sourceCodeUrl !== undefined && !httpsUrl(value.sourceCodeUrl))
    || (value.redistributionSourceUrl !== undefined && !httpsUrl(value.redistributionSourceUrl))
    || (value.redistributionSourceFiles !== undefined && (!Array.isArray(value.redistributionSourceFiles) || !value.redistributionSourceFiles.length || value.redistributionSourceFiles.length > 40 || !value.redistributionSourceUrl))) throw failure('missing distribution provenance');
  for (const name of value.licenseFiles) safeRelative(name);
  for (const name of value.redistributionSourceFiles || []) safeRelative(name);
}

function manifestIdentity(manifest) {
  const { id: _id, ...contents } = manifest;
  return createHash('sha256').update(JSON.stringify(contents)).digest('hex');
}

async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function inside(root, child) {
  const relative = path.relative(root, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/** Preserve vendor links verbatim, but never follow links while enumerating a tree. */
async function inventoryTree(root, { excludeManifest = false, allowSymlinks = false, includeExecutable = false, linkRoots = [root] } = {}) {
  const canonicalRoot = await realpath(root);
  const files = [];
  async function visit(directory, prefix = '') {
    for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const relative = safeRelative(prefix ? `${prefix}/${item.name}` : item.name);
      if (excludeManifest && relative === 'manifest.json') continue;
      const file = path.join(directory, item.name);
      const info = await lstat(file);
      if (info.isSymbolicLink()) {
        if (!allowSymlinks) throw failure('linked distribution file');
        const target = await readlink(file);
        if (!target || path.isAbsolute(target) || path.win32.isAbsolute(target) || /[\\\x00-\x1f]/.test(target)) throw failure('invalid distribution link');
        const resolved = await realpath(file).catch(() => { throw failure('missing or cyclic distribution link'); });
        const owner = linkRoots.find((candidate) => inside(candidate, file));
        if (!owner || !inside(canonicalRoot, resolved) || !inside(owner, resolved)) throw failure('escaping distribution link');
        const targetInfo = await lstat(resolved);
        if (!targetInfo.isFile() && !targetInfo.isDirectory()) throw failure('unsupported distribution link');
        if (files.length >= MAX_FILES) throw failure('too many distribution files');
        files.push({ path: relative, type: 'symlink', target, size: Buffer.byteLength(target), sha256: createHash('sha256').update(target).digest('hex') });
      } else if (info.isDirectory()) await visit(file, relative);
      else if (info.isFile()) {
        if (files.length >= MAX_FILES) throw failure('too many distribution files');
        files.push({ path: relative, size: info.size, sha256: await sha256File(file), ...(includeExecutable ? { executable: (info.mode & 0o111) !== 0 } : {}) });
      } else throw failure('unsupported distribution file');
    }
  }
  await visit(root);
  return files;
}

/** Check all packaged bytes before using metadata. The manifest is integrity data, not a signature. */
async function inspectBundledRuntime(directory, { required = true, expectedPlatform = process.platform, expectedArch = process.arch } = {}) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw failure('absolute bundle root required');
  const rootInfo = await lstat(directory).catch((error) => { if (!required && error.code === 'ENOENT') return null; throw error; });
  if (!rootInfo) return null;
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw failure('invalid bundle directory');
  const root = await realpath(directory);
  const manifestPath = path.join(root, 'manifest.json');
  const info = await lstat(manifestPath);
  if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_MANIFEST_BYTES) throw failure('invalid manifest file');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { throw failure('invalid manifest JSON'); }
  const windows = manifest.schemaVersion === 1 && manifest.platform === 'win32' && manifest.arch === 'x64';
  const mac = manifest.schemaVersion === 2 && manifest.platform === 'darwin' && ['x64', 'arm64'].includes(manifest.arch);
  if ((!windows && !mac) || manifest.platform !== expectedPlatform || manifest.arch !== expectedArch
    || !Array.isArray(manifest.jdks) || !manifest.jdks.length || manifest.jdks.length > JAVA_VERSIONS.length
    || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > MAX_FILES
    || !SHA256.test(manifest.id) || manifest.id !== manifestIdentity(manifest)) throw failure('unsupported manifest');
  const versions = new Set();
  for (const jdk of manifest.jdks) {
    validateProvenance(jdk);
    if (!JAVA_VERSIONS.includes(jdk.major) || versions.has(jdk.major)
      || jdk.home !== `jdks/${jdk.major}${mac ? '/Contents/Home' : ''}`
      || (mac ? jdk.distributionRoot !== `jdks/${jdk.major}` : jdk.distributionRoot !== undefined)) throw failure('invalid JDK layout');
    versions.add(jdk.major);
  }
  if (!versions.has(21)) throw failure('default Java 21 missing');
  validateProvenance(manifest.maven);
  if (manifest.maven.home !== 'maven' || !/^3\.([9]|[1-9]\d+)\.\d+$/.test(manifest.maven.version)) throw failure('invalid Maven layout or version');
  const expected = new Map();
  const insensitive = new Set();
  for (const file of manifest.files) {
    const name = safeRelative(file.path);
    if (!SHA256.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0 || expected.has(name) || insensitive.has(name.toLowerCase())
      || !['THIRD-PARTY-NOTICES.txt', ...manifest.jdks.map((jdk) => `${jdk.distributionRoot || jdk.home}/`), 'maven/'].some((prefix) => prefix.endsWith('/') ? name.startsWith(prefix) : name === prefix)) throw failure('invalid file inventory');
    if (mac && (file.type === 'symlink' ? typeof file.target !== 'string' || file.executable !== undefined : file.type !== undefined || typeof file.executable !== 'boolean')) throw failure('invalid Unix file inventory');
    expected.set(name, file);
    insensitive.add(name.toLowerCase());
  }
  for (const jdk of manifest.jdks) {
    for (const name of [mac ? 'bin/java' : 'bin/java.exe', mac ? 'bin/javac' : 'bin/javac.exe', 'release', ...jdk.licenseFiles]) if (!expected.has(`${jdk.home}/${name}`)) throw failure('missing JDK or license file');
    if (mac) for (const name of ['bin/java', 'bin/javac']) if (expected.get(`${jdk.home}/${name}`).executable !== true) throw failure('JDK executable permission missing');
  }
  for (const name of ['bin/m2.conf', ...manifest.maven.licenseFiles]) if (!expected.has(`maven/${name}`)) throw failure('missing Maven or license file');
  if (!expected.has('THIRD-PARTY-NOTICES.txt') || !manifest.files.some((file) => /^maven\/boot\/plexus-classworlds-[A-Za-z0-9.-]+\.jar$/.test(file.path))
    || !expected.has(`maven/lib/maven-core-${manifest.maven.version}.jar`)) throw failure('incomplete Maven distribution');
  const actual = await inventoryTree(root, { excludeManifest: true, allowSymlinks: mac, includeExecutable: mac,
    linkRoots: [...manifest.jdks.map((jdk) => path.join(root, jdk.distributionRoot || jdk.home)), path.join(root, 'maven')] });
  if (actual.length !== expected.size || actual.some((file) => {
    const listed = expected.get(file.path);
    return listed?.sha256 !== file.sha256 || listed?.size !== file.size || (mac && (listed.type !== file.type || listed.target !== file.target || listed.executable !== file.executable));
  })) throw failure('distribution integrity mismatch');
  return {
    id: manifest.id,
    platform: manifest.platform,
    arch: manifest.arch,
    root,
    jdks: manifest.jdks.map((jdk) => ({ version: jdk.major, home: path.join(root, ...jdk.home.split('/')), description: `${jdk.distribution} ${jdk.version} · 앱 포함`, distribution: jdk.distribution, distributionVersion: jdk.version })),
    maven: { home: path.join(root, 'maven'), version: manifest.maven.version },
    fileCount: actual.length,
    bytes: actual.reduce((total, file) => total + file.size, 0),
  };
}

async function loadBundledRuntime(directory, options) {
  try { return await inspectBundledRuntime(directory, options); }
  catch (error) { if (error.code === 'invalid_bundled_runtime') throw error; throw failure('missing or unreadable distribution file'); }
}

module.exports = { loadBundledRuntime, manifestIdentity, inventoryTree, validateProvenance };
