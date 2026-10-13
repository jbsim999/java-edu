import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const buildConfig = require('../../desktop/build-config.cjs');
const { MacTargetHelper } = require('app-builder-lib/out/mac/MacTargetHelper.js');
const signingUtil = require('@electron/osx-sign/dist/cjs/util.js');
const { signApp } = require('@electron/osx-sign/dist/cjs/sign.js');

// Run the installed builder and signer, replacing only native discovery/commands.
// These command-selection checks are not real macOS signing or app execution.
test('installed Mac signer excludes vendor toolchains but still signs the app', async (t) => {
  const app = '/tmp/한글 경로/Java Edu.app';
  const toolchains = `${app}/Contents/Resources/toolchains`;
  const vendor = [toolchains, `${toolchains}/jdks/21`,
    `${toolchains}/jdks/21/Contents/Home/bin/java`,
    `${toolchains}/jdks/21/Contents/Home/bin/javac`,
    `${toolchains}/jdks/21/Contents/Home/lib/libjvm.dylib`,
    `${toolchains}/maven/bin/mvn`];
  const electron = [`${app}/Contents/MacOS/Java Edu`,
    `${app}/Contents/Frameworks/Electron Framework.framework`,
    `${app}/Contents/Resources/toolchains-neighbor/native.dylib`];
  const calls = [];
  t.mock.method(signingUtil, 'validateOptsApp', async () => {});
  t.mock.method(signingUtil, 'validateOptsPlatform', async () => 'darwin');
  t.mock.method(signingUtil, 'walkAsync', async () => [...vendor, ...electron]);
  t.mock.method(signingUtil, 'execFileAsync', async (command, args) => { calls.push({ command, args }); return ''; });

  const packager = { config: { electronVersion: require('electron/package.json').version },
    resourceList: Promise.resolve([]), platformSpecificBuildOptions: buildConfig.mac };
  const helper = new MacTargetHelper(packager);
  for (const protectedVendor of [true, false]) {
    calls.length = 0;
    const config = { ...buildConfig.mac, ...(protectedVendor ? {} : { signIgnore: [] }) };
    const options = await helper.buildSignOptions(app, { name: '-' }, 'distribution', false, config, null, 3);
    await signApp({ ...options, preEmbedProvisioningProfile: false, preAutoEntitlements: false });
    const signed = calls.filter(({ args }) => args.includes('--sign'));
    const signedPaths = signed.map(({ args }) => args.at(-1));
    assert.deepEqual(new Set(signedPaths), new Set([...electron, app, ...(protectedVendor ? [] : vendor)]));
    assert.ok(signed.every(({ command, args }) => command === 'codesign' && !args.includes('--deep')));
    assert.ok(calls.some(({ args }) => args.includes('--verify') && args.includes('--deep')));
  }
});
