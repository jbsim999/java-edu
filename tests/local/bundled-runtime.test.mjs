import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath, rename, symlink, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inventoryTree, loadBundledRuntime as nativeLoadBundledRuntime, manifestIdentity } from '../../desktop/bundled-runtime.cjs';
import { createSettingsStore } from '../../server/local/settings.mjs';
import { createLocalEngine } from '../../server/local/engine.mjs';

// These fixtures deliberately exercise schema1 Windows bytes on every CI host.
const loadBundledRuntime = (directory, options) => nativeLoadBundledRuntime(directory, { expectedPlatform: 'win32', expectedArch: 'x64', ...options });

async function scratch(t) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'java-edu-bundle-test-'));
  t.after(async () => {
    const resolved = await realpath(root);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith('java-edu-bundle-test-'));
    await rm(resolved, { recursive: true, force: true });
  });
  return root;
}

async function fixture(root, name = 'toolchains') {
  const directory = path.join(root, name);
  const files = {
    'jdks/21/bin/java.exe': 'fixture Java runtime', 'jdks/21/bin/javac.exe': 'fixture Java compiler',
    'jdks/21/release': 'JAVA_VERSION="21.0.12.1"\nOS_ARCH="x86_64"\nOS_NAME="Windows"\n',
    'jdks/21/legal/java.base/LICENSE': 'fixture license',
    'maven/boot/plexus-classworlds-2.9.0.jar': 'fixture launcher', 'maven/bin/m2.conf': 'fixture config',
    'maven/lib/maven-core-3.10.0.jar': 'fixture Maven', 'maven/LICENSE': 'fixture Maven license',
    'THIRD-PARTY-NOTICES.txt': 'fixture provenance',
  };
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(directory, ...relative.split('/'));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  const manifest = { schemaVersion: 1, platform: 'win32', arch: 'x64',
    jdks: [{ major: 21, home: 'jdks/21', distribution: 'Fixture JDK', version: '21.0.12.1+1', sourceUrl: 'https://example.org/jdk.zip', archiveSha256: 'a'.repeat(64), license: 'fixture-only', licenseFiles: ['legal/java.base/LICENSE'] }],
    maven: { home: 'maven', distribution: 'Fixture Maven', version: '3.10.0', sourceUrl: 'https://example.org/maven.zip', archiveSha256: 'b'.repeat(64), license: 'fixture-only', licenseFiles: ['LICENSE'] },
    files: await inventoryTree(directory),
  };
  await saveManifest(directory, manifest);
  return { directory, manifest };
}

async function saveManifest(directory, manifest) {
  manifest.id = manifestIdentity(manifest);
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
}

const invalidBundle = { code: 'invalid_bundled_runtime' };

test('bundle metadata is resolved only from the verified current resources root', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const bundle = await loadBundledRuntime(directory);
  assert.equal(bundle.jdks[0].version, 21);
  assert.equal(bundle.jdks[0].home, path.join(await realpath(directory), 'jdks', '21'));
  assert.equal(bundle.maven.home, path.join(await realpath(directory), 'maven'));
  assert.equal(bundle.fileCount, 9);
  assert.equal(await loadBundledRuntime(path.join(root, 'absent'), { required: false }), null);
  await assert.rejects(loadBundledRuntime(path.join(root, 'absent')), invalidBundle);
});

test('changed, missing and unlisted toolchain files fail integrity before registration', async (t) => {
  const root = await scratch(t);
  for (const scenario of ['changed', 'same-size-change', 'missing', 'extra', 'manifest']) {
    const { directory } = await fixture(root, scenario);
    if (scenario === 'changed') await writeFile(path.join(directory, 'jdks/21/bin/java.exe'), 'changed');
    if (scenario === 'same-size-change') {
      const java = path.join(directory, 'jdks/21/bin/java.exe');
      await writeFile(java, Buffer.alloc((await readFile(java)).length, 0x78));
    }
    if (scenario === 'missing') await rm(path.join(directory, 'maven/LICENSE'));
    if (scenario === 'extra') await writeFile(path.join(directory, 'maven/extra.jar'), 'unlisted');
    if (scenario === 'manifest') {
      const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json')));
      manifest.maven.version = '3.9.0';
      await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
    }
    await assert.rejects(loadBundledRuntime(directory), invalidBundle, scenario);
  }
});

test('self-consistent metadata cannot redirect homes, inventory paths or case aliases', async (t) => {
  const root = await scratch(t);
  const cases = [
    (manifest) => { manifest.jdks[0].home = '../outside'; },
    (manifest) => { manifest.files[0].path = '../outside/bin/java.exe'; },
    (manifest) => { manifest.files[0].path = 'jdks/21/bin/java.exe:stream'; },
    (manifest) => { manifest.files.push({ ...manifest.files[0], path: manifest.files[0].path.toUpperCase() }); },
    (manifest) => { manifest.jdks[0].licenseFiles = ['../LICENSE']; },
  ];
  for (const [index, mutate] of cases.entries()) {
    const { directory, manifest } = await fixture(root, `invalid-${index}`);
    mutate(manifest);
    await saveManifest(directory, manifest);
    await assert.rejects(loadBundledRuntime(directory), invalidBundle);
  }
});

test('directory links in a bundle cannot point at an external toolchain', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const outside = path.join(root, 'outside-bin');
  await rename(path.join(directory, 'jdks/21/bin'), outside);
  const link = path.join(directory, 'jdks/21/bin');
  await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(loadBundledRuntime(directory), invalidBundle); }
  finally { await rm(link); }
});

test('fresh bundled settings need no folder selection, no startup execution and explicit consent', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const bundle = await loadBundledRuntime(directory);
  let probes = 0;
  const settings = createSettingsStore(path.join(root, 'data'), { bundledRuntime: bundle, runner: async () => { probes++; throw new Error('No startup process'); } });
  const value = await settings.initialize();
  assert.equal(probes, 0);
  assert.equal(value.jdks[21].source, 'bundled');
  assert.equal(value.maven.source, 'bundled');
  assert.equal(value.executionConsent, false);
  const engine = await createLocalEngine({ dataRoot: path.join(root, 'data'), settings, projects: [] });
  const runtime = engine.runtime();
  assert.equal(runtime.available, false);
  assert.deepEqual(runtime.supportedTargets, [8, 11, 17, 21]);
  assert.equal(runtime.runtime.javaVersion, 21);
  assert.deepEqual(runtime.runtimes.filter((entry) => entry.available).map((entry) => [entry.javaVersion, entry.source]), [[21, 'bundled']]);
  assert.equal(runtime.maven.source, 'bundled');
  assert.deepEqual(runtime.bundledRuntime, { id: bundle.id, javaVersions: [21], mavenVersion: '3.10.0' });
  await assert.rejects(engine.execute({ exerciseId: 'java-basics-lab', source: 'class Solution {}', action: 'run', requestId: 'no-consent' }), { code: 'execution_consent_required' });
  assert.equal(probes, 0);
  await settings.setConsent(true);
  assert.equal(engine.runtime().available, true);
  await engine.close();
});

test('reinstall and ZIP move repair bundled paths while old absolute paths are ignored', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const dataRoot = path.join(root, 'data');
  const first = createSettingsStore(dataRoot, { bundledRuntime: await loadBundledRuntime(directory) });
  await first.initialize();
  await first.setConsent(true);
  const saved = JSON.parse(await readFile(path.join(dataRoot, 'settings.json')));
  saved.jdks[21].home = path.join(root, 'attacker-selected-home');
  saved.maven.home = path.join(root, 'attacker-selected-maven');
  await writeFile(path.join(dataRoot, 'settings.json'), JSON.stringify(saved));
  const moved = path.join(root, 'moved toolchains 한글');
  await rename(directory, moved);
  const next = createSettingsStore(dataRoot, { bundledRuntime: await loadBundledRuntime(moved) });
  const value = await next.initialize();
  assert.equal(value.jdks[21].home, path.join(await realpath(moved), 'jdks', '21'));
  assert.equal(value.maven.home, path.join(await realpath(moved), 'maven'));
  assert.equal(value.executionConsent, true);
  const withoutBundle = createSettingsStore(dataRoot);
  const absent = await withoutBundle.initialize();
  assert.deepEqual(absent.jdks, {});
  assert.equal(absent.maven, null);
});

test('legacy or explicit external selections are preserved across bundled startup and probes', async (t) => {
  const root = await scratch(t);
  const { directory } = await fixture(root);
  const externalJdk = path.join(root, 'external-jdk21');
  const externalMaven = path.join(root, 'external-maven');
  await cp(path.join(directory, 'jdks/21'), externalJdk, { recursive: true });
  if (process.platform !== 'win32') {
    await cp(path.join(externalJdk, 'bin/java.exe'), path.join(externalJdk, 'bin/java'));
    await cp(path.join(externalJdk, 'bin/javac.exe'), path.join(externalJdk, 'bin/javac'));
  }
  await cp(path.join(directory, 'maven'), externalMaven, { recursive: true });
  const dataRoot = path.join(root, 'data');
  await mkdir(dataRoot);
  await writeFile(path.join(dataRoot, 'settings.json'), JSON.stringify({ schema: 1, executionConsent: true, jdks: { 21: { home: externalJdk, version: 21 } }, maven: { home: externalMaven } }));
  const optionsSeen = [];
  const runner = async (executable, _args, options) => {
    optionsSeen.push(options);
    return { reason: 'exited', exitCode: 0, stdout: executable.includes('javac') ? 'javac 21.0.12.1' : '', stderr: executable.includes('javac') ? '' : 'openjdk version "21.0.12.1"' };
  };
  const settings = createSettingsStore(dataRoot, { runner, bundledRuntime: await loadBundledRuntime(directory) });
  const value = await settings.initialize();
  assert.equal(value.jdks[21].source, 'external');
  assert.equal(value.jdks[21].home, externalJdk);
  assert.equal(value.maven.home, await realpath(externalMaven));
  assert.equal(value.maven.source, 'external');
  assert.equal(optionsSeen.length, 0);
  const verified = await settings.verifyJdk(21);
  assert.equal(verified.source, 'external');
  assert.equal(verified.home, await realpath(externalJdk));
  assert.equal(optionsSeen.length, 2);
  for (const options of optionsSeen) for (const name of ['JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'MAVEN_ARGS', 'CLASSPATH']) assert.equal(Object.hasOwn(options.env, name), false);
});
