// Build-time only: pinned vendor downloads; never installs a system toolchain.
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
if (process.platform !== 'darwin' || !['x64', 'arm64'].includes(process.arch)) throw new Error('Run on a native Intel or Apple Silicon Mac.');
const metadataPath = path.join(root, 'desktop', `toolchain-provenance.darwin-${process.arch}.json`);
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const input = path.join(root, 'work', `macos-vendor-${process.arch}`);
await mkdir(path.dirname(input), { recursive: true });
await mkdir(input); // Existing archives/staging are never silently reused or replaced.

async function download(tool, destination) {
  const response = await fetch(tool.sourceUrl, { signal: AbortSignal.timeout(300000) });
  if (!response.ok || !response.body) throw new Error(`Vendor download failed: ${response.status} ${tool.sourceUrl}`);
  const hash = createHash('sha256');
  const hashing = new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } });
  await pipeline(Readable.fromWeb(response.body), hashing, createWriteStream(destination, { flags: 'wx' }));
  if (hash.digest('hex') !== tool.archiveSha256) throw new Error(`Vendor checksum mismatch: ${destination}`);
}

const jdkArchive = path.join(input, 'jdk.tar.gz');
const mavenArchive = path.join(input, 'maven.zip');
await download(metadata.jdks[0], jdkArchive);
await download(metadata.maven, mavenArchive);
const jdkDirectory = path.join(input, 'jdk');
const mavenDirectory = path.join(input, 'maven');
await mkdir(jdkDirectory);
await mkdir(mavenDirectory);
await run('/usr/bin/tar', ['-xzf', jdkArchive, '-C', jdkDirectory]);
await run('/usr/bin/ditto', ['-x', '-k', mavenArchive, mavenDirectory]);
const jdkNames = await readdir(jdkDirectory);
const mavenNames = await readdir(mavenDirectory);
if (jdkNames.length !== 1 || !jdkNames[0].endsWith('.jdk') || mavenNames.length !== 1 || mavenNames[0] !== `apache-maven-${metadata.maven.version}`) throw new Error('Unexpected vendor archive layout.');
const result = await run(process.execPath, [path.join(root, 'scripts/bundle-runtime.mjs'), '--platform', 'darwin', '--arch', process.arch, '--jdk21', path.join(jdkDirectory, jdkNames[0]), '--maven', path.join(mavenDirectory, mavenNames[0]), '--metadata', metadataPath], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
console.log(result.stdout);
await writeFile(path.join(input, 'download-verification.json'), JSON.stringify({ platform: process.platform, arch: process.arch, verifiedAt: new Date().toISOString(), metadata }, null, 2));
