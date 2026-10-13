import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath, rename, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectVendorLayout } from '../../scripts/prepare-macos-runtime.mjs';

const versions = { jdkVersion: '21.0.12.1+1', mavenVersion: '3.10.0' };
async function fixture(t) {
  const parent = await realpath(tmpdir()); const root = await mkdtemp(path.join(parent, 'java-edu-archive-layout-'));
  t.after(async () => { const resolved = await realpath(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('java-edu-archive-layout-')); await rm(resolved, { recursive: true, force: true }); });
  const jdk = path.join(root, 'jdk'); const maven = path.join(root, 'maven');
  const jdkRoot = path.join(jdk, 'jdk-21.0.12.1+1'); const mavenRoot = path.join(maven, 'apache-maven-3.10.0');
  await mkdir(path.join(jdkRoot, 'Contents/Home'), { recursive: true }); await mkdir(mavenRoot, { recursive: true });
  await writeFile(path.join(jdkRoot, 'Contents/Home/release'), 'original vendor release'); await writeFile(path.join(jdkRoot, 'Contents/Info.plist'), 'original signed bundle metadata');
  return { root, jdk, maven, jdkRoot, mavenRoot };
}

test('pinned Temurin archive root without .jdk suffix resolves the complete Contents tree', async (t) => {
  const data = await fixture(t); const result = await inspectVendorLayout(data.jdk, data.maven, versions);
  assert.equal(result.jdkRoot, data.jdkRoot); assert.equal(result.mavenRoot, data.mavenRoot);
  assert.deepEqual(result.jdkNames, ['jdk-21.0.12.1+1']); assert.deepEqual(result.mavenNames, ['apache-maven-3.10.0']);
});

test('unexpected vendor roots and extra archive entries reject with observed names', async (t) => {
  for (const kind of ['suffix', 'wrong-version', 'extra-jdk', 'extra-maven']) {
    const data = await fixture(t);
    if (kind === 'suffix') await rename(data.jdkRoot, `${data.jdkRoot}.jdk`);
    if (kind === 'wrong-version') await rename(data.jdkRoot, path.join(data.jdk, 'jdk-21.0.11+1'));
    if (kind === 'extra-jdk') await writeFile(path.join(data.jdk, 'unexpected.txt'), 'unexpected');
    if (kind === 'extra-maven') await mkdir(path.join(data.maven, '__MACOSX'));
    await assert.rejects(inspectVendorLayout(data.jdk, data.maven, versions), (error) => /Unexpected vendor archive layout/.test(error.message) && /JDK entries=/.test(error.message) && /Maven entries=/.test(error.message), kind);
  }
});

test('archive root contract rejects incomplete Contents trees and redirected roots', async (t) => {
  for (const kind of ['missing-release', 'missing-plist', 'linked-root']) {
    const data = await fixture(t);
    if (kind === 'missing-release') await rm(path.join(data.jdkRoot, 'Contents/Home/release'));
    if (kind === 'missing-plist') await rm(path.join(data.jdkRoot, 'Contents/Info.plist'));
    if (kind === 'linked-root') { const moved = path.join(data.root, 'outside'); await rename(data.jdkRoot, moved); await symlink(moved, data.jdkRoot, process.platform === 'win32' ? 'junction' : 'dir'); t.after(async () => { await rm(data.jdkRoot, { force: true }); }); }
    await assert.rejects(inspectVendorLayout(data.jdk, data.maven, versions), /Unexpected vendor archive layout: invalid/, kind);
  }
});
