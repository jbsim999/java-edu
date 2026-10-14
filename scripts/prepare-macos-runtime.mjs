// Build-time only: pinned vendor downloads; never installs a system toolchain.
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, lstat } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

// These exact pinned Temurin archives use jdk-<version>/Contents, without a
// .jdk suffix. Do not rename the vendor root or discard unknown archive entries.
export async function inspectVendorLayout(jdkDirectory, mavenDirectory, { jdkVersion, mavenVersion }) {
  const jdkNames = (await readdir(jdkDirectory)).sort();
  const mavenNames = (await readdir(mavenDirectory)).sort();
  const expectedJdk = `jdk-${jdkVersion}`;
  const expectedMaven = `apache-maven-${mavenVersion}`;
  const observed = `JDK entries=${JSON.stringify(jdkNames)}, expected=${JSON.stringify(expectedJdk)}; Maven entries=${JSON.stringify(mavenNames)}, expected=${JSON.stringify(expectedMaven)}`;
  if (jdkNames.length !== 1 || jdkNames[0] !== expectedJdk || mavenNames.length !== 1 || mavenNames[0] !== expectedMaven) throw new Error(`Unexpected vendor archive layout: ${observed}`);
  const jdkRoot = path.join(jdkDirectory, expectedJdk);
  const mavenRoot = path.join(mavenDirectory, expectedMaven);
  for (const [entry, directory] of [
    [jdkRoot, true], [path.join(jdkRoot, 'Contents'), true], [path.join(jdkRoot, 'Contents/Home'), true],
    [path.join(jdkRoot, 'Contents/Home/release'), false], [path.join(jdkRoot, 'Contents/Info.plist'), false], [mavenRoot, true],
  ]) {
    const info = await lstat(entry).catch(() => null);
    if (!info || info.isSymbolicLink() || !(directory ? info.isDirectory() : info.isFile())) throw new Error(`Unexpected vendor archive layout: invalid ${JSON.stringify(entry)}; ${observed}`);
  }
  return { jdkRoot, mavenRoot, jdkNames, mavenNames };
}

async function download(tool, destination) {
  const response = await fetch(tool.sourceUrl, { signal: AbortSignal.timeout(300000) });
  if (!response.ok || !response.body) throw new Error(`Vendor download failed: ${response.status} ${tool.sourceUrl}`);
  const hash = createHash('sha256');
  const hashing = new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } });
  await pipeline(Readable.fromWeb(response.body), hashing, createWriteStream(destination, { flags: 'wx' }));
  const sha256 = hash.digest('hex');
  if (sha256 !== tool.archiveSha256) throw new Error(`Vendor checksum mismatch: ${destination}`);
  return { archive: path.basename(destination), sourceUrl: tool.sourceUrl, sha256, verified: true };
}

async function prepareMacosRuntime() {
  if (process.platform !== 'darwin' || !['x64', 'arm64'].includes(process.arch)) throw new Error('Run on a native Intel or Apple Silicon Mac.');
  const metadataPath = path.join(root, 'desktop', `toolchain-provenance.darwin-${process.arch}.json`);
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const input = path.join(root, 'work', `macos-vendor-${process.arch}`);
  await mkdir(path.dirname(input), { recursive: true });
  await mkdir(input); // Existing archives/staging are never silently reused or replaced.
  const evidence = { platform: process.platform, arch: process.arch, startedAt: new Date().toISOString(), metadata, archives: [] };
  const saveEvidence = () => writeFile(path.join(input, 'download-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  let stage = 'download_jdk';
  try {
    const jdkArchive = path.join(input, 'jdk.tar.gz');
    const mavenArchive = path.join(input, 'maven.zip');
    evidence.archives.push(await download(metadata.jdks[0], jdkArchive)); await saveEvidence();
    stage = 'download_maven';
    evidence.archives.push(await download(metadata.maven, mavenArchive));
    evidence.verifiedAt = new Date().toISOString(); evidence.status = 'downloads_verified'; await saveEvidence();
    const jdkDirectory = path.join(input, 'jdk');
    const mavenDirectory = path.join(input, 'maven');
    await mkdir(jdkDirectory); await mkdir(mavenDirectory);
    stage = 'extract_archives';
    await run('/usr/bin/tar', ['-xzf', jdkArchive, '-C', jdkDirectory]);
    await run('/usr/bin/ditto', ['-x', '-k', mavenArchive, mavenDirectory]);
    evidence.entries = { jdk: (await readdir(jdkDirectory)).sort(), maven: (await readdir(mavenDirectory)).sort() }; await saveEvidence();
    stage = 'validate_archive_layout';
    const layout = await inspectVendorLayout(jdkDirectory, mavenDirectory, { jdkVersion: metadata.jdks[0].version, mavenVersion: metadata.maven.version });
    stage = 'stage_bundle';
    const result = await run(process.execPath, [path.join(root, 'scripts/bundle-runtime.mjs'), '--platform', 'darwin', '--arch', process.arch, '--jdk21', layout.jdkRoot, '--maven', layout.mavenRoot, '--metadata', metadataPath], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    console.log(result.stdout);
    evidence.status = 'bundle_staged'; await saveEvidence();
  } catch (error) {
    evidence.status = 'failed'; evidence.failureStage = stage; evidence.error = error.message; await saveEvidence(); throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareMacosRuntime();
