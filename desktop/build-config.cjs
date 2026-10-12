const path = require('node:path');
const { loadBundledRuntime } = require('./bundled-runtime.cjs');

module.exports = {
  appId: 'kr.javaedu.desktop',
  productName: 'Java Edu',
  asar: true,
  asarUnpack: ['desktop/job-runner.ps1'],
  extraResources: [{ from: 'work/desktop-bundle', to: 'toolchains', filter: ['**/*'] }],
  beforePack: async () => { await loadBundledRuntime(path.join(__dirname, '..', 'work', 'desktop-bundle')); },
  afterPack: async ({ appOutDir }) => { await loadBundledRuntime(path.join(appOutDir, 'resources', 'toolchains')); },
  directories: { output: 'desktop-release' },
  files: ['desktop/**', 'server/**', 'dist/**', '!dist/server/**', '!dist/.openai/**', 'curriculum/professional/**', 'package.json', '!**/target/**', '!**/node_modules/**'],
  win: { target: [{ target: 'nsis', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }], artifactName: 'Java-Edu-${version}-${arch}.${ext}', signAndEditExecutable: false },
  nsis: { artifactName: 'Java-Edu-Setup-${version}-${arch}.${ext}', oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, runAfterFinish: false, deleteAppDataOnUninstall: false },
  publish: null,
};
