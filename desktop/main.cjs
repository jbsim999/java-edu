const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDesktopStorage } = require('./storage.cjs');
const { externalReferenceUrl } = require('./reference-policy.cjs');
const { mkdirSync } = require('node:fs');

if (!app.isPackaged && process.env.JAVA_EDU_QA_DATA) {
  if (!path.isAbsolute(process.env.JAVA_EDU_QA_DATA)) throw new Error('개발 검증 데이터 경로는 절대 경로여야 합니다.');
  mkdirSync(process.env.JAVA_EDU_QA_DATA, { recursive: true });
  app.setPath('userData', process.env.JAVA_EDU_QA_DATA);
}

let mainWindow;
let localServer;
let settings;
let engine;
let allowQuit = false;
let quitting = false;

function authorizeIpc(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || new URL(event.senderFrame.url).origin !== localServer.origin) throw new Error('설치형 앱의 기본 화면에서만 사용할 수 있습니다.');
}

function safelyOpenReference(value) {
  const url = externalReferenceUrl(value);
  if (url) void shell.openExternal(url);
}

async function initialize() {
  const root = path.join(__dirname, '..');
  const dataRoot = path.join(app.getPath('userData'), 'java-edu');
  const [{ createSettingsStore }, { createLocalEngine }, { startLocalServer, SESSION_COOKIE, CSRF_HEADER }] = await Promise.all([
    import(pathToFileURL(path.join(root, 'server/local/settings.mjs'))),
    import(pathToFileURL(path.join(root, 'server/local/engine.mjs'))),
    import(pathToFileURL(path.join(root, 'server/local/http.mjs'))),
  ]);
  settings = createSettingsStore(dataRoot);
  await settings.initialize();
  const storage = createDesktopStorage(dataRoot);
  engine = await createLocalEngine({ dataRoot, projectRoot: path.join(root, 'curriculum/professional'), settings });
  localServer = await startLocalServer({ distRoot: path.join(root, 'dist'), engine });
  const localSession = session.fromPartition('java-edu-desktop'); // In-memory cookies: no reusable session credential on disk.
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  await localSession.cookies.set({ url: localServer.origin, name: SESSION_COOKIE, value: localServer.sessionToken, httpOnly: true, sameSite: 'strict', path: '/' });
  mainWindow = new BrowserWindow({ width: 1440, height: 940, minWidth: 720, minHeight: 560, show: false, title: 'Java Edu', backgroundColor: '#f5f2e9',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), partition: 'java-edu-desktop', contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, spellcheck: false } });
  mainWindow.removeMenu();
  localSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = details.webContentsId === mainWindow?.webContents.id && new URL(details.url).origin === localServer.origin;
    callback({ cancel: !allowed });
  });
  localSession.webRequest.onBeforeSendHeaders({ urls: [`${localServer.origin}/*`] }, (details, callback) => {
    const headers = { ...details.requestHeaders };
    for (const key of Object.keys(headers)) if (key.toLowerCase() === CSRF_HEADER) delete headers[key];
    if (details.webContentsId === mainWindow?.webContents.id && new URL(details.url).origin === localServer.origin) headers[CSRF_HEADER] = localServer.csrfToken;
    callback({ requestHeaders: headers });
  });
  mainWindow.webContents.on('will-navigate', (event, url) => { event.preventDefault(); safelyOpenReference(url); });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { safelyOpenReference(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  localSession.on('will-download', (event) => event.preventDefault());
  const ipc = (channel, handler) => ipcMain.handle(channel, async (event, ...args) => { authorizeIpc(event); return handler(...args); });
  ipc('java-edu:settings', () => engine.runtime());
  ipc('java-edu:choose-jdk', async (version) => {
    if (![8, 11, 17, 21].includes(version)) throw new Error('지원하는 JDK 버전을 선택하세요.');
    const selected = await dialog.showOpenDialog(mainWindow, { title: `Java ${version} JDK 폴더 선택 (bin 폴더의 상위)`, properties: ['openDirectory'] });
    if (!selected.canceled) await settings.chooseJdk(selected.filePaths[0], version);
    return engine.runtime();
  });
  ipc('java-edu:choose-maven', async () => {
    const selected = await dialog.showOpenDialog(mainWindow, { title: 'Apache Maven 3.9 이상 배포본 폴더 선택', properties: ['openDirectory'] });
    if (!selected.canceled) await settings.chooseMaven(selected.filePaths[0]);
    return engine.runtime();
  });
  ipc('java-edu:consent', async (accepted) => { await settings.setConsent(accepted); if (!accepted) await engine.cancelActive(); return engine.runtime(); });
  ipcMain.on('java-edu:storage', (event, input) => {
    try {
      authorizeIpc(event);
      if (!input || !['getItem', 'setItem', 'removeItem'].includes(input.method)) throw new Error('지원하지 않는 저장 요청입니다.');
      event.returnValue = { value: storage[input.method](input.key, input.value) };
    } catch (error) { event.returnValue = { error: error.message }; }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  await mainWindow.loadURL(localServer.origin);
}

app.setAppUserModelId('kr.javaedu.desktop');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(initialize).catch(async (error) => { dialog.showErrorBox('Java Edu 시작 실패', error.message); await localServer?.close(); allowQuit = true; app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (event) => {
    if (allowQuit) return;
    event.preventDefault();
    if (quitting) return;
    quitting = true;
    Promise.resolve(localServer?.close()).finally(() => { allowQuit = true; app.quit(); });
  });
}
