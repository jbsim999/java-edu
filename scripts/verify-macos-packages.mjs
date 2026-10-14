import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, open, mkdir, lstat, readFile, readlink, readdir, realpath, rename, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadBundledRuntime } from '../desktop/bundled-runtime.cjs';

const require = createRequire(import.meta.url);
const { listPackage, statFile, extractFile } = require('@electron/asar');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  assert.ok(process.argv[index + 1] && !process.argv[index + 1].startsWith('--'), name + ' needs a value');
  return process.argv[index + 1];
}
const arch = option('--arch');
const release = path.resolve(root, option('--release', 'desktop-release'));
const artifactsRoot = path.resolve(root, option('--artifacts', 'work/macos-qa'));
const artifacts = path.join(artifactsRoot, arch || 'invalid');
const runRoot = path.join(artifacts, 'run-' + randomUUID());
const ownershipToken = randomUUID();
const marker = '.java-edu-macos-qa-owner';
const evidence = { startedAt: new Date().toISOString(), platform: process.platform, hostArch: process.arch, arch,
  sourceRoot: root, release, artifacts: runRoot, commands: [], packageChecks: [], runtimeChecks: [], preflight: [],
  notExecuted: ['Downloaded-file Gatekeeper flow', 'Developer ID notarization', 'Physical user playtesting'] };
const exists = file => access(file).then(() => true, () => false);
const inside = (child, parent) => path.relative(parent, child) !== '' && !path.relative(parent, child).startsWith('..') && !path.isAbsolute(path.relative(parent, child));
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
let expectedUserData;
let ownedData = false;
let mountPoint;
let mountAttached = false;
let currentKind;

async function command(executable, args, { timeout = 120000, log = null, allowedExitCodes = [0] } = {}) {
  const record = { executable, args, startedAt: new Date().toISOString() };
  evidence.commands.push(record);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, env: process.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
    const forceTimer = setTimeout(() => { child.kill('SIGKILL'); }, timeout + 10000);
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', error => { clearTimeout(timer); clearTimeout(forceTimer); record.error = error.message; reject(error); });
    child.on('close', async (code, signal) => {
      clearTimeout(timer); clearTimeout(forceTimer);
      Object.assign(record, { exitCode: code, signal, timedOut, stdout, stderr, finishedAt: new Date().toISOString() });
      try {
        if (log) await writeFile(log, stdout + '\nSTDERR\n' + stderr);
        assert.ok(!timedOut && allowedExitCodes.includes(code), executable + ' failed (' + code + ', ' + signal + '): ' + stderr.slice(-3000));
        resolve({ stdout, stderr, exitCode: code });
      } catch (error) { reject(error); }
    });
  });
}
async function fileDigest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function inventory(base) {
  const entries = [];
  async function visit(directory, prefix = '') {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name);
      const relative = prefix ? prefix + '/' + name : name;
      const info = await lstat(file);
      const entry = { path: relative, mode: info.mode & 0o777 };
      if (info.isSymbolicLink()) {
        entry.type = 'symlink';
        entry.target = await readlink(file);
        assert.ok(inside(path.resolve(path.dirname(file), entry.target), base), 'symlink escapes extracted app: ' + relative);
        // Reject dangling/redirected links, including intermediate symlinks.
        assert.ok(inside(await realpath(file), base), 'symlink resolves outside extracted app: ' + relative);
      } else if (info.isDirectory()) entry.type = 'directory';
      else {
        assert.ok(info.isFile(), 'unsupported extracted item: ' + relative);
        Object.assign(entry, { type: 'file', bytes: info.size, sha256: await fileDigest(file) });
        const handle = await open(file, 'r');
        try {
          const header = Buffer.alloc(4);
          const { bytesRead } = await handle.read(header, 0, 4, 0);
          entry.nativeCandidate = bytesRead === 4 && ['feedface', 'cefaedfe', 'feedfacf', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca'].includes(header.toString('hex'));
        } finally { await handle.close(); }
      }
      entries.push(entry);
      if (entry.type === 'directory') await visit(file, relative);
    }
  }
  await visit(base);
  return entries;
}
async function packagedSourceFiles() {
  const files = [];
  async function visit(directory, relative) {
    for (const name of (await readdir(directory)).sort()) {
      const next = relative + '/' + name;
      // Match desktop/build-config.cjs source glob exclusions.
      if (name === 'node_modules' || name === 'target' || next === 'dist/server' || next === 'dist/.openai') continue;
      const info = await lstat(path.join(directory, name));
      if (info.isDirectory()) await visit(path.join(directory, name), next);
      else {
        assert.ok(info.isFile(), 'source package contains unexpected symlink/special file: ' + next);
        files.push(next);
      }
    }
  }
  for (const relative of ['desktop', 'server', 'dist', 'curriculum/professional']) await visit(path.join(root, relative), relative);
  return files.sort();
}
async function sourceAsarParity(appPath) {
  const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
  const result = [];
  for (const listed of listPackage(asarPath)) {
    const relative = listed.replace(/^[/\\]+/, '').replaceAll('\\', '/');
    const info = statFile(asarPath, relative);
    if (!Object.hasOwn(info, 'size')) continue;
    if (!['desktop/', 'server/', 'dist/', 'curriculum/professional/'].some(prefix => relative.startsWith(prefix))) continue;
    assert.ok(inside(path.resolve(root, relative), root), 'ASAR source path escapes');
    const source = await readFile(path.join(root, relative));
    const actual = info.unpacked
      ? await readFile(path.join(appPath, 'Contents/Resources/app.asar.unpacked', relative))
      : extractFile(asarPath, relative);
    const comparison = { path: relative, unpacked: info.unpacked === true, sha256: hashBytes(actual), sourceSha256: hashBytes(source), bytes: actual.length };
    result.push(comparison);
    assert.equal(comparison.sha256, comparison.sourceSha256, 'source/ASAR byte mismatch: ' + relative);
  }
  assert.deepEqual(result.map(item => item.path).sort(), await packagedSourceFiles(),
    'ASAR selected source inventory must be complete: no missing or additional source files');
  for (const required of ['desktop/main.cjs', 'desktop/preload.cjs', 'server/local/process.mjs', 'server/local/engine.mjs', 'dist/app.js', 'dist/styles.css', 'dist/data/professional.js']) assert.ok(result.some(item => item.path === required), 'ASAR missing required source: ' + required);
  const packaged = JSON.parse(extractFile(asarPath, 'package.json').toString('utf8'));
  const sourcePackage = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const key of ['name', 'version', 'main']) assert.equal(packaged[key], sourcePackage[key], 'packaged metadata ' + key);
  return { asarSha256: await fileDigest(asarPath), packaged, files: result };
}
async function nativeFacts(appPath, entries) {
  const facts = [];
  const wanted = arch === 'x64' ? 'x86_64' : 'arm64';
  for (const entry of entries.filter(item => item.nativeCandidate)) {
    const file = path.join(appPath, entry.path);
    const identified = await command('/usr/bin/file', ['-b', file]);
    if (!identified.stdout.includes('Mach-O')) continue; // A Java class can have the fat Mach-O magic.
    const result = await command('/usr/bin/lipo', ['-archs', file]);
    const architectures = result.stdout.trim().split(/\s+/);
    assert.ok(architectures.includes(wanted), 'wrong native arch: ' + entry.path + ' = ' + result.stdout.trim());
    facts.push({ path: entry.path, architectures, file: identified.stdout.trim() });
  }
  for (const required of ['Contents/MacOS/Java Edu', 'Contents/Resources/toolchains/jdks/21/Contents/Home/bin/java',
    'Contents/Resources/toolchains/jdks/21/Contents/Home/bin/javac']) {
    const fact = facts.find(item => item.path === required);
    assert.ok(fact, 'required native binary absent: ' + required);
    assert.deepEqual(fact.architectures, [wanted], 'entry point/tool must be native requested architecture: ' + required);
    assert.ok(entries.find(item => item.path === required).mode & 0o111, 'required executable lost mode: ' + required);
  }
  return facts;
}
async function verifyApp(kind, appPath, stagingInventory, sourceBundleInventory) {
  const record = { kind, appPath };
  evidence.packageChecks.push(record);
  const actual = await inventory(appPath);
  const inventoryFile = path.join(runRoot, kind + '-inventory.json');
  await writeFile(inventoryFile, JSON.stringify(actual, null, 2));
  record.inventoryFile = inventoryFile;
  assert.deepEqual(actual, stagingInventory, kind + ' full bundle differs from builder staging (bytes, modes, symlinks, entries)');
  const toolchains = path.join(appPath, 'Contents/Resources/toolchains');
  const packagedTools = await inventory(toolchains);
  assert.deepEqual(packagedTools, sourceBundleInventory, kind + ' toolchain bytes/signatures/modes/symlinks differ from vendor staging');
  const bundle = await loadBundledRuntime(toolchains);
  assert.equal(bundle.platform, 'darwin');
  assert.equal(bundle.arch, arch);
  record.bundle = { id: bundle.id, platform: bundle.platform, arch: bundle.arch, bytes: bundle.bytes, fileCount: bundle.fileCount };
  record.sourceAsar = await sourceAsarParity(appPath);
  record.native = await nativeFacts(appPath, actual);
  record.appSignature = await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', appPath]);
  const signature = await command('/usr/bin/codesign', ['--display', '--verbose=4', appPath]);
  assert.match(signature.stderr + signature.stdout, /Signature=adhoc/, 'final app must have verifiable ad hoc signature');
  record.appSignatureDisplay = signature;
  const vendorRoot = path.join(toolchains, 'jdks/21');
  record.vendorSignature = await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', vendorRoot]);
  record.vendorSignatureDisplay = await command('/usr/bin/codesign', ['--display', '--verbose=4', vendorRoot]);
  record.status = 'PASS';
}
async function archiveOwnedData(kind) {
  if (!ownedData) return;
  assert.ok(expectedUserData && path.dirname(expectedUserData) === path.join(os.homedir(), 'Library/Application Support'));
  assert.ok((await lstat(expectedUserData)).isDirectory() && !(await lstat(expectedUserData)).isSymbolicLink());
  assert.equal((await readFile(path.join(expectedUserData, marker), 'utf8')).trim(), ownershipToken, 'production-data ownership lost');
  const destination = path.join(runRoot, kind + '-production-user-data');
  assert.equal(await exists(destination), false);
  await rename(expectedUserData, destination);
  ownedData = false;
  evidence.archivedUserData ??= [];
  evidence.archivedUserData.push({ kind, from: expectedUserData, destination });
}
async function runtime(kind, appPath) {
  assert.equal(await exists(expectedUserData), false, 'never overwrite existing user data: ' + expectedUserData);
  // Marker gives a positive ownership proof even if Electron fails before
  // firstWindow. No app setting/state exists before its real first launch.
  await mkdir(expectedUserData, { recursive: false });
  ownedData = true;
  await writeFile(path.join(expectedUserData, marker), ownershipToken + '\n', { flag: 'wx', mode: 0o600 });
  const runtimeArtifacts = path.join(runRoot, kind + '-runtime');
  await mkdir(runtimeArtifacts);
  const record = { kind, artifacts: runtimeArtifacts, startedAt: new Date().toISOString() };
  evidence.runtimeChecks.push(record);
  let finishedChild = false;
  try {
    await command(process.execPath, [path.join(root, 'tests/macos-packaged.mjs'), '--kind', kind, '--arch', arch,
      '--app', appPath, '--artifacts', runtimeArtifacts, '--user-data', expectedUserData, '--ownership-token', ownershipToken],
    { timeout: 1200000, log: path.join(runtimeArtifacts, 'runtime.log') });
    finishedChild = true;
    record.result = JSON.parse(await readFile(path.join(runtimeArtifacts, 'runtime-results.json'), 'utf8'));
    assert.equal(record.result.status, 'PASS');
    assert.equal(record.result.closed, true);
    record.status = 'PASS';
  } catch (error) {
    record.status = 'FAIL';
    record.error = error.stack;
    record.result = JSON.parse(await readFile(path.join(runtimeArtifacts, 'runtime-results.json'), 'utf8').catch(() => '{}'));
    finishedChild = record.result.closed === true;
    throw error;
  } finally {
    // Never move data while a failed/timed-out app may still be alive.
    if (finishedChild) await archiveOwnedData(kind);
    else record.retainedProductionUserData = expectedUserData;
    record.finishedAt = new Date().toISOString();
  }
}
async function detach() {
  if (!mountAttached) return;
  assert.ok(mountPoint && inside(mountPoint, runRoot), 'detach only this run mount');
  await command('/usr/bin/hdiutil', ['detach', mountPoint]);
  mountAttached = false;
  evidence.detached = true;
}
async function main() {
  assert.equal(process.platform, 'darwin', 'execute package/runtime QA on native macOS only');
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'default-data QA requires ephemeral GitHub runner home');
  assert.ok(['x64', 'arm64'].includes(arch), 'pass --arch x64|arm64');
  assert.equal(process.arch, arch, 'native runner architecture must match package; Rosetta is not this gate');
  assert.ok(inside(runRoot, path.join(root, 'work')), 'keep extraction/evidence within workspace work/');
  await mkdir(runRoot, { recursive: true });
  const git = await command('git', ['rev-parse', 'HEAD']);
  evidence.sourceSha = git.stdout.trim();
  evidence.sourceStatus = (await command('git', ['status', '--porcelain'])).stdout;
  const staging = path.join(release, arch === 'arm64' ? 'mac-arm64' : 'mac', 'Java Edu.app');
  assert.equal((await lstat(staging)).isDirectory(), true);
  evidence.staging = staging;
  const stagingInventory = await inventory(staging);
  await writeFile(path.join(runRoot, 'staging-inventory.json'), JSON.stringify(stagingInventory, null, 2));
  const sourceBundleInventory = await inventory(path.join(root, 'work/desktop-bundle'));
  await writeFile(path.join(runRoot, 'source-toolchains-inventory.json'), JSON.stringify(sourceBundleInventory, null, 2));
  const stagingSource = await sourceAsarParity(staging);
  // Electron initializes its default app name from productName || name in
  // packaged package.json. Main does not override packaged userData.
  const appName = stagingSource.packaged.productName || stagingSource.packaged.name;
  assert.ok(appName && appName !== '.' && appName !== '..' && !/[\\/\0]/.test(appName));
  expectedUserData = path.join(os.homedir(), 'Library/Application Support', appName);
  const candidates = [...new Set([appName, 'java-edu', 'Java Edu'])].map(name => path.join(os.homedir(), 'Library/Application Support', name));
  for (const candidate of candidates) {
    const info = await lstat(candidate).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    evidence.preflight.push({ path: candidate, exists: info !== null });
    assert.equal(info, null, 'STOP: preserve pre-existing user data: ' + candidate);
  }
  evidence.expectedUserData = expectedUserData;
  await mkdir(path.dirname(expectedUserData), { recursive: true });
  const files = await readdir(release);
  for (const kind of ['dmg', 'zip']) {
    currentKind = kind;
    const matches = files.filter(name => name.endsWith('.' + kind) && name.includes('-' + arch + '.'));
    assert.equal(matches.length, 1, 'expected one actual ' + arch + ' ' + kind + ': ' + JSON.stringify(matches));
    const packageFile = path.join(release, matches[0]);
    evidence.packages ??= [];
    evidence.packages.push({ kind, path: packageFile, bytes: (await lstat(packageFile)).size, sha256: await fileDigest(packageFile) });
    const extraction = path.join(runRoot, kind + '-한글 설치 & %JAVA_HOME%', 'Applications');
    await mkdir(extraction, { recursive: true });
    const extractedApp = path.join(extraction, 'Java Edu.app');
    if (kind === 'dmg') {
      mountPoint = path.join(runRoot, 'owned-dmg-mount');
      await mkdir(mountPoint);
      try {
        // Explicit owned mount avoids unrelated /Volumes or /Applications.
        mountAttached = true; // detach attempted even after a partial attach failure
        const mounted = await command('/usr/bin/hdiutil', ['attach', packageFile, '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mountPoint, '-plist']);
        evidence.dmgAttach = mounted;
        assert.ok((await lstat(path.join(mountPoint, 'Java Edu.app'))).isDirectory());
        await command('/usr/bin/ditto', ['--rsrc', '--extattr', path.join(mountPoint, 'Java Edu.app'), extractedApp]);
      } finally { await detach(); }
    } else {
      await command('/usr/bin/ditto', ['-x', '-k', '--rsrc', '--extattr', packageFile, extraction]);
    }
    assert.ok((await lstat(extractedApp)).isDirectory() && !(await lstat(extractedApp)).isSymbolicLink(), 'actual package contains regular app');
    await verifyApp(kind, extractedApp, stagingInventory, sourceBundleInventory);
    await runtime(kind, extractedApp);
  }
  evidence.status = 'PASS';
}
try { await main(); }
catch (error) {
  evidence.status = 'FAIL';
  evidence.error = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  if (mountAttached) {
    try { await detach(); }
    catch (error) { evidence.detachError = error.stack; evidence.status = 'FAIL'; process.exitCode = 1; }
  }
  if (ownedData) evidence.retainedProductionUserData = { path: expectedUserData, kind: currentKind, reason: 'Child app close was not proved; preserved data in place.' };
  evidence.finishedAt = new Date().toISOString();
  // Failures, including non-macOS attempts, always leave a result.
  await mkdir(runRoot, { recursive: true });
  const resultFile = path.join(runRoot, 'package-qa-results.json');
  await writeFile(resultFile, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, arch, resultFile, packageChecks: evidence.packageChecks.map(item => ({ kind: item.kind, status: item.status })), runtimeChecks: evidence.runtimeChecks.map(item => ({ kind: item.kind, status: item.status })) }, null, 2));
}
