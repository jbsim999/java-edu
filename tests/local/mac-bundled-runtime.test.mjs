import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath, chmod, symlink, readlink, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inventoryTree, loadBundledRuntime, manifestIdentity } from '../../desktop/bundled-runtime.cjs';
import buildConfig from '../../desktop/build-config.cjs';

const invalidBundle = { code: 'invalid_bundled_runtime' };
const nativeUnix = { skip: process.platform === 'win32' };
async function scratch(t) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'java-edu-mac-bundle-test-'));
  t.after(async () => { const resolved = await realpath(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('java-edu-mac-bundle-test-')); await rm(resolved, { recursive: true, force: true }); });
  return root;
}
async function saveManifest(directory, manifest) {
  manifest.id = manifestIdentity(manifest);
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
}
async function fixture(root, arch = 'arm64') {
  const directory = path.join(root, 'toolchains');
  const files = {
    'jdks/21/Contents/Home/bin/java': 'fixture java', 'jdks/21/Contents/Home/bin/javac': 'fixture javac',
    'jdks/21/Contents/Home/release': `JAVA_VERSION="21.0.12.1"\nOS_ARCH="${arch === 'arm64' ? 'aarch64' : 'x86_64'}"\nOS_NAME="Darwin"\n`,
    'jdks/21/Contents/Home/legal/java.base/LICENSE': 'original license',
    'jdks/21/Contents/Info.plist': 'original vendor bundle metadata',
    'maven/bin/m2.conf': 'fixture config', 'maven/LICENSE': 'original Maven license',
    'maven/boot/plexus-classworlds-2.9.0.jar': 'fixture launcher', 'maven/lib/maven-core-3.10.0.jar': 'fixture Maven',
    'THIRD-PARTY-NOTICES.txt': 'fixture provenance',
  };
  for (const [relative, content] of Object.entries(files)) { const file = path.join(directory, relative); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
  for (const name of ['java', 'javac']) await chmod(path.join(directory, `jdks/21/Contents/Home/bin/${name}`), 0o755);
  const provenance = (distribution) => ({ distribution, version: distribution === 'JDK' ? '21.0.12.1' : '3.10.0', sourceUrl: 'https://example.org/archive.tar.gz', archiveSha256: 'a'.repeat(64), license: 'fixture-only', licenseFiles: distribution === 'JDK' ? ['legal/java.base/LICENSE'] : ['LICENSE'], sourceCodeUrl: 'https://example.org/source' });
  const manifest = { schemaVersion: 2, platform: 'darwin', arch, jdks: [{ major: 21, distributionRoot: 'jdks/21', home: 'jdks/21/Contents/Home', ...provenance('JDK') }], maven: { home: 'maven', ...provenance('Maven') }, files: await inventoryTree(directory, { allowSymlinks: true, includeExecutable: true }) };
  await saveManifest(directory, manifest);
  return { directory, manifest };
}

test('bundle loader refuses platform and architecture mismatches before tool registration', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const mismatch = (error) => error.code === 'invalid_bundled_runtime' && /unsupported manifest/.test(error.message);
  await assert.rejects(loadBundledRuntime(directory, { expectedPlatform: 'darwin', expectedArch: 'x64' }), mismatch);
  await assert.rejects(loadBundledRuntime(directory, { expectedPlatform: 'win32', expectedArch: 'arm64' }), mismatch);
  if (process.platform !== 'darwin' || process.arch !== 'arm64') await assert.rejects(loadBundledRuntime(directory), mismatch);
  else assert.equal((await loadBundledRuntime(directory)).arch, 'arm64');
});

test('Mac post-sign hook rejects changed JDK bytes without rewriting the manifest', nativeUnix, async (t) => {
  const root = await scratch(t);
  const resources = path.join(root, 'Java Edu.app', 'Contents', 'Resources');
  await mkdir(resources, { recursive: true });
  const { directory } = await fixture(resources);
  const context = { appOutDir: root, electronPlatformName: 'darwin', arch: 3 };
  const originalManifest = await readFile(path.join(directory, 'manifest.json'));
  const java = path.join(directory, 'jdks/21/Contents/Home/bin/java');
  const originalJava = await readFile(java);
  await buildConfig.afterPack(context);
  await buildConfig.afterSign(context);
  for (const changed of [Buffer.concat([originalJava, Buffer.from('simulated signature bytes')]),
    Buffer.alloc(originalJava.length, 0x78)]) {
    await writeFile(java, changed);
    await assert.rejects(buildConfig.afterSign(context), (error) =>
      error.code === 'invalid_bundled_runtime' && /distribution integrity mismatch/.test(error.message));
    assert.deepEqual(await readFile(path.join(directory, 'manifest.json')), originalManifest);
  }
});

test('mac JDK preserves whole vendor bundle, modes and contained license links', nativeUnix, async (t) => {
  const root = await scratch(t);
  const { directory, manifest } = await fixture(root);
  const legal = path.join(directory, 'jdks/21/Contents/Home/legal');
  await mkdir(path.join(legal, 'java.logging'));
  await symlink('../java.base/LICENSE', path.join(legal, 'java.logging/LICENSE'));
  manifest.files = await inventoryTree(directory, { excludeManifest: true, allowSymlinks: true, includeExecutable: true }); await saveManifest(directory, manifest);
  const bundle = await loadBundledRuntime(directory, { expectedPlatform: 'darwin', expectedArch: 'arm64' });
  assert.equal(bundle.jdks[0].home, path.join(directory, 'jdks/21/Contents/Home'));
  assert.equal(bundle.platform, 'darwin'); assert.equal(bundle.arch, 'arm64');
  assert.ok(manifest.files.some((file) => file.path.endsWith('Contents/Info.plist')));
  const copied = path.join(root, 'copied'); await cp(directory, copied, { recursive: true, dereference: false, verbatimSymlinks: true });
  assert.equal(await readlink(path.join(copied, 'jdks/21/Contents/Home/legal/java.logging/LICENSE')), '../java.base/LICENSE');
  await loadBundledRuntime(copied, { expectedPlatform: 'darwin', expectedArch: 'arm64' });
  await chmod(path.join(directory, 'jdks/21/Contents/Home/bin/java'), 0o644);
  await assert.rejects(loadBundledRuntime(directory, { expectedPlatform: 'darwin', expectedArch: 'arm64' }), invalidBundle);
});

test('mac links cannot escape vendor roots, be absolute, cycle or change text', nativeUnix, async (t) => {
  const root = await scratch(t);
  for (const kind of ['escape', 'absolute', 'cycle', 'cross-vendor', 'changed']) {
    const parent = path.join(root, kind); await mkdir(parent);
    const { directory, manifest } = await fixture(parent);
    const link = path.join(directory, 'jdks/21/Contents/Home/legal/link');
    if (kind === 'changed') {
      await symlink('java.base/LICENSE', link); manifest.files = await inventoryTree(directory, { excludeManifest: true, allowSymlinks: true, includeExecutable: true }); await saveManifest(directory, manifest);
      await rm(link); await symlink('./java.base/LICENSE', link);
    } else {
      await writeFile(path.join(parent, 'outside'), 'outside');
      const target = kind === 'escape' ? '../../../../../../outside' : kind === 'absolute' ? path.join(parent, 'outside') : kind === 'cycle' ? 'link' : '../../../../../maven/LICENSE';
      await symlink(target, link);
    }
    await assert.rejects(loadBundledRuntime(directory, { expectedPlatform: 'darwin', expectedArch: 'arm64' }), invalidBundle, kind);
  }
});

test('mac staging checks release target and copies a complete vendor .jdk without mutation', nativeUnix, async (t) => {
  const root = await scratch(t);
  const { directory, manifest } = await fixture(root, 'x64');
  const project = path.join(root, 'project'); await mkdir(path.join(project, 'scripts'), { recursive: true }); await mkdir(path.join(project, 'desktop'));
  await cp(new URL('../../scripts/bundle-runtime.mjs', import.meta.url), path.join(project, 'scripts/bundle-runtime.mjs'));
  await cp(new URL('../../desktop/bundled-runtime.cjs', import.meta.url), path.join(project, 'desktop/bundled-runtime.cjs'));
  const metadata = path.join(root, 'metadata.json'); await writeFile(metadata, JSON.stringify({ jdks: manifest.jdks, maven: manifest.maven }));
  const args = [path.join(project, 'scripts/bundle-runtime.mjs'), '--platform', 'darwin', '--arch', 'x64', '--jdk21', path.join(directory, 'jdks/21'), '--maven', path.join(directory, 'maven'), '--metadata', metadata];
  const wrong = spawnSync(process.execPath, args.map((arg) => arg === 'x64' ? 'arm64' : arg), { encoding: 'utf8' }); assert.notEqual(wrong.status, 0); assert.match(wrong.stderr, /release/);
  const staged = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(staged.status, 0, staged.stderr);
  const bundle = await loadBundledRuntime(path.join(project, 'work/desktop-bundle'), { expectedPlatform: 'darwin', expectedArch: 'x64' }); assert.equal(bundle.arch, 'x64');
  assert.equal(await readFile(path.join(bundle.jdks[0].home, '../Info.plist'), 'utf8'), 'original vendor bundle metadata');
  const checked = spawnSync(process.execPath, [args[0], '--check', '--platform', 'darwin', '--arch', 'x64'], { encoding: 'utf8' }); assert.equal(checked.status, 0, checked.stderr);
});
