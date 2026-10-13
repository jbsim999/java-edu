const path = require('node:path');
const { loadBundledRuntime } = require('./bundled-runtime.cjs');
const architectures = ['ia32', 'x64', 'armv7l', 'arm64', 'universal'];
const targetOptions = (context) => ({ expectedPlatform: context.electronPlatformName, expectedArch: architectures[context.arch] });
const packagedBundle = (context) => path.join(context.appOutDir, ...(context.electronPlatformName === 'darwin' ? ['Java Edu.app', 'Contents', 'Resources'] : ['resources']), 'toolchains');

module.exports = {
  appId: 'kr.javaedu.desktop',
  productName: 'Java Edu',
  asar: true,
  asarUnpack: ['desktop/job-runner.ps1'],
  extraResources: [{ from: 'work/desktop-bundle', to: 'toolchains', filter: ['**/*'] }],
  beforePack: async (context) => { await loadBundledRuntime(path.join(__dirname, '..', 'work', 'desktop-bundle'), targetOptions(context)); },
  afterPack: async (context) => { await loadBundledRuntime(packagedBundle(context), targetOptions(context)); },
  afterSign: async (context) => { if (context.electronPlatformName === 'darwin') await loadBundledRuntime(packagedBundle(context), targetOptions(context)); },
  directories: { output: 'desktop-release' },
  files: ['desktop/**', 'server/**', 'dist/**', '!dist/server/**', '!dist/.openai/**', 'curriculum/professional/**', 'package.json', '!**/target/**', '!**/node_modules/**'],
  win: { target: [{ target: 'nsis', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }], artifactName: 'Java-Edu-${version}-${arch}.${ext}', signAndEditExecutable: false },
  mac: {
    target: ['dmg', 'zip'],
    artifactName: 'Java-Edu-${version}-mac-${arch}.${ext}',
    category: 'public.app-category.education',
    minimumSystemVersion: '13.0.0',
    identity: '-',
    hardenedRuntime: false,
    notarize: false,
    // Preserve every vendor JDK byte and its original signature.
    signIgnore: ['Contents/Resources/toolchains(?:/|$)'],
  },
  dmg: { sign: false, title: 'Java Edu ${version}', contents: [{ x: 130, y: 220 }, { x: 410, y: 220, type: 'link', path: '/Applications' }] },
  // Preserve vendor ARM64 files: the bundled NSIS 7z decoder predates the ARM64 codec.
  nsis: { artifactName: 'Java-Edu-Setup-${version}-${arch}.${ext}', differentialPackage: false, useZip: true, oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, runAfterFinish: false, deleteAppDataOnUninstall: false },
  publish: null,
};
