module.exports = {
  appId: 'kr.javaedu.desktop',
  productName: 'Java Edu',
  asar: true,
  asarUnpack: ['desktop/job-runner.ps1'],
  directories: { output: 'desktop-release' },
  files: ['desktop/**', 'server/**', 'dist/**', '!dist/server/**', '!dist/.openai/**', 'curriculum/professional/**', 'package.json', '!**/target/**', '!**/node_modules/**'],
  win: { target: [{ target: 'nsis', arch: ['x64'] }], artifactName: 'Java-Edu-Setup-${version}-${arch}.${ext}', signAndEditExecutable: false },
  nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, runAfterFinish: false, deleteAppDataOnUninstall: false },
  publish: null,
};
