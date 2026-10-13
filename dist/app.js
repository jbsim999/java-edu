const STORAGE_KEY = 'java-edu:progress:v1';
const EDITOR_PREFERENCES_KEY = 'java-edu:editor-preferences:v1';
const EDITOR_THEMES = ['dark', 'light', 'contrast'];
const VERSIONS = [8, 11, 17, 21];
const STEPS = ['theory', 'example', 'quiz', 'practice', 'lab'];
const STEP_LABELS = { theory: '이론', example: '예제', quiz: '문제', practice: '실무', lab: '코드 실습' };
const TRANSITION_IDS = new Set(['java-basics', 'oop', 'polymorphism', 'collections', 'generics', 'exceptions', 'streams', 'modern-apis', 'records-sealed']);
const ADVANCED_IDS = new Set(['oop', 'polymorphism', 'generics', 'streams', 'concurrency', 'records-sealed', 'java21', 'testing-design']);
const EXECUTION_STATUSES = new Set(['passed', 'failed', 'compile_error', 'runtime_error', 'timeout', 'provider_error']);
const SOURCE_LIMIT = 50000;
const PROJECT_SOURCE_LIMIT = 65536;
const PROJECT_SNAPSHOT_LIMIT = 384 * 1024;
const NOTE_LIMIT = 20000;
const desktop = window.javaEduDesktop || null;
const isDesktop = Boolean(desktop);
const mobileMedia = window.matchMedia('(max-width: 899px)');
let lessons = [];
let exercises = [];
let jobEvidence = [];
let lessonVisuals = {};
let saveTimer;
let toastTimer;
let runtimeSequence = 0;
let editorLibrary = null;
let activeEditor = null;

const state = {
  version: 21, track: 'all', search: '', lessonId: '', step: 'theory',
  quizPassed: new Set(), labPassed: new Map(), drafts: new Map(), notes: new Map(),
  fileDrafts: new Map(), activeFiles: new Map(), projectInfo: new Map(),
  quizAnswers: new Map(), quizResults: new Map(), labResults: new Map(), undo: new Map(),
  storage: 'ready', runtime: null, runtimeStatus: 'checking', runtimeMessage: '',
  pending: null, menuOpen: false,
  editorTheme: 'dark', editorWrap: false,
  runtimeVersion: null, settingsBusy: false, settingsMessage: '', cancelling: false,
};

const dom = Object.fromEntries([
  'workspace-grid', 'loading-state', 'lesson-list', 'lesson-card', 'lesson-panel', 'lesson-title',
  'lesson-description', 'lesson-category', 'lesson-position', 'lesson-meta', 'lesson-achievements',
  'lesson-support', 'lesson-info', 'lesson-detail-meta', 'lesson-goals',
  'lesson-footer', 'source-list', 'evidence-list', 'reference-column', 'version-select',
  'lesson-search', 'curriculum-sidebar', 'mobile-menu-toggle', 'drawer-backdrop',
].map((id) => [id, document.getElementById(id)]));

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', `#icon-${name}`);
  svg.append(use);
  return svg;
}

function actionButton(text, className, onClick, id) {
  const button = el('button', className, text);
  button.type = 'button';
  if (id) { button.id = id; button.dataset.testid = id; }
  button.addEventListener('click', onClick);
  return button;
}

function safeLink(title, url, className = '') {
  const link = el('a', className);
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL');
    link.href = parsed.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  } catch {
    link.removeAttribute('href');
  }
  if (title) link.textContent = title;
  return link;
}

function announce(message) {
  const target = document.getElementById('announcer');
  target.textContent = '';
  window.setTimeout(() => { target.textContent = message; }, 30);
}

function toast(message) {
  const target = document.getElementById('toast');
  clearTimeout(toastTimer);
  target.textContent = message;
  target.classList.add('is-visible');
  toastTimer = window.setTimeout(() => target.classList.remove('is-visible'), 4500);
}

function currentLesson() { return visibleLessons().find((lesson) => lesson.id === state.lessonId); }
function exerciseFor(lesson) { return lesson && exercises.find((exercise) => exercise.id === lesson.exerciseId || exercise.lessonId === lesson.id); }
function storageAdapter() { return desktop?.storage ?? window.localStorage; }
function isProject(exercise) { return exercise?.mode === 'project'; }
function projectFiles(exercise) { return state.projectInfo.get(exercise.id)?.files || exercise.files || []; }
function activeFile(exercise) {
  if (!isProject(exercise)) return null;
  const files = projectFiles(exercise);
  return files.find((file) => file.path === state.activeFiles.get(exercise.id)) || files.find((file) => file.editable) || files[0];
}
function fileKey(exercise, path = activeFile(exercise)?.path) { return isProject(exercise) ? `${exercise.id}::${path}` : exercise.id; }
function sourceFor(exercise, path = activeFile(exercise)?.path) {
  if (!isProject(exercise)) return state.drafts.has(exercise.id) ? state.drafts.get(exercise.id) : exercise.template;
  const file = projectFiles(exercise).find((item) => item.path === path);
  return file?.editable && state.fileDrafts.has(fileKey(exercise, path)) ? state.fileDrafts.get(fileKey(exercise, path)) : file?.source || '';
}
function setSource(exercise, value, path = activeFile(exercise)?.path) {
  if (isProject(exercise)) state.fileDrafts.set(fileKey(exercise, path), value);
  else state.drafts.set(exercise.id, value);
}
function sourcesFor(exercise) {
  return Object.fromEntries(projectFiles(exercise).filter((file) => file.editable).map((file) => [file.path, sourceFor(exercise, file.path)]).sort(([a], [b]) => a.localeCompare(b)));
}
function sourceSnapshot(exercise) { return isProject(exercise) ? JSON.stringify(sourcesFor(exercise)) : sourceFor(exercise); }
function sourceLimit(exercise) { return isProject(exercise) ? PROJECT_SOURCE_LIMIT : SOURCE_LIMIT; }
function utf8Size(value) { return new TextEncoder().encode(value).byteLength; }
function fileLanguage(path) { return path.endsWith('.java') ? 'Java' : `${path.split('.').at(-1).toUpperCase()} · 일반 텍스트`; }
function labComplete(lesson) {
  const exercise = exerciseFor(lesson);
  return Boolean(exercise && state.labPassed.has(exercise.id) && state.labPassed.get(exercise.id) === sourceSnapshot(exercise));
}
function lessonComplete(lesson) { return state.quizPassed.has(lesson.id) && labComplete(lesson); }

function visibleLessons() {
  const query = state.search.trim().toLocaleLowerCase('ko');
  return lessons.filter((lesson) => {
    if (Number(lesson.minVersion) > state.version) return false;
    if (state.track === 'project') {
      if (!isProject(exerciseFor(lesson))) return false;
    } else if (state.track !== 'all') {
      const hasDeclaredTrack = ['transition', 'advanced', 'both'].includes(lesson.track);
      const fallback = state.track === 'transition' ? TRANSITION_IDS : ADVANCED_IDS;
      if (hasDeclaredTrack ? lesson.track !== state.track && lesson.track !== 'both' : !fallback.has(lesson.id)) return false;
    }
    if (!query) return true;
    const text = [lesson.title, lesson.description, lesson.category, ...(lesson.goals || []), ...(lesson.jobTags || [])].join(' ').toLocaleLowerCase('ko');
    return text.includes(query);
  });
}

function ensureSelection() {
  const filtered = visibleLessons();
  if (!filtered.some((lesson) => lesson.id === state.lessonId)) {
    const nextId = filtered[0]?.id || '';
    if (nextId !== state.lessonId) {
      cancelPending('수업 변경', false);
      state.lessonId = nextId;
      state.step = 'theory';
    }
  }
}

function restoreStorage() {
  let raw;
  try { raw = storageAdapter().getItem(STORAGE_KEY); }
  catch { state.storage = 'unavailable'; return; }
  if (!raw) return;
  try {
    const record = JSON.parse(raw);
    if (!record || typeof record !== 'object' || record.schema !== 1) throw new Error('Invalid record');
    if (VERSIONS.includes(record.version)) state.version = record.version;
    if (lessons.some((lesson) => lesson.id === record.lessonId)) state.lessonId = record.lessonId;
    if (Array.isArray(record.quizPassed)) {
      state.quizPassed = new Set(record.quizPassed.filter((id) => lessons.some((lesson) => lesson.id === id)));
    }
    for (const [key, destination, idKey, collection, limit] of [
      ['drafts', state.drafts, 'exerciseId', exercises, SOURCE_LIMIT],
      ['labPassed', state.labPassed, 'exerciseId', exercises, PROJECT_SNAPSHOT_LIMIT],
      ['notes', state.notes, 'lessonId', lessons, NOTE_LIMIT],
    ]) {
      if (!Array.isArray(record[key])) continue;
      for (const entry of record[key]) {
        if (!entry || typeof entry !== 'object') continue;
        const value = key === 'notes' ? entry.text : entry.source;
        if (typeof value !== 'string' || value.length > limit || !collection.some((item) => item.id === entry[idKey])) continue;
        destination.set(entry[idKey], value);
      }
    }
    if (Array.isArray(record.fileDrafts)) {
      for (const entry of record.fileDrafts) {
        const exercise = exercises.find((item) => item.id === entry?.exerciseId && isProject(item));
        const file = exercise?.files?.find((item) => item.path === entry.path && item.editable);
        if (file && typeof entry.source === 'string' && entry.source.length <= PROJECT_SOURCE_LIMIT) state.fileDrafts.set(fileKey(exercise, entry.path), entry.source);
      }
    }
  } catch {
    state.storage = 'invalid';
  }
}

function restoreEditorPreferences() {
  try {
    const preferences = JSON.parse(storageAdapter().getItem(EDITOR_PREFERENCES_KEY));
    if (!preferences || typeof preferences !== 'object') return;
    if (EDITOR_THEMES.includes(preferences.theme)) state.editorTheme = preferences.theme;
    if (typeof preferences.wrap === 'boolean') state.editorWrap = preferences.wrap;
  } catch { /* Preferences are optional; the default theme also works without storage. */ }
}

function saveEditorPreferences() {
  try {
    storageAdapter().setItem(EDITOR_PREFERENCES_KEY, JSON.stringify({ theme: state.editorTheme, wrap: state.editorWrap }));
  } catch {
    state.storage = 'unavailable';
    updateStorageIndicator();
    toast('코드 테마는 현재 화면에서만 적용됩니다. 학습 기록 저장소를 사용할 수 없습니다.');
  }
}

function setEditorTheme(theme) {
  if (!EDITOR_THEMES.includes(theme)) return;
  state.editorTheme = theme;
  document.querySelectorAll('[data-editor-theme]').forEach((node) => { node.dataset.editorTheme = theme; });
  document.querySelectorAll('.editor-theme-select').forEach((select) => { select.value = theme; });
  activeEditor?.setTheme(theme);
  saveEditorPreferences();
  announce(`코드 테마를 ${theme === 'dark' ? '다크' : theme === 'light' ? '라이트' : '고대비'}로 변경했습니다.`);
}

function codePreferences(id = 'editor-theme-select') {
  const settings = el('div', 'code-settings');
  const label = el('label', 'code-theme-label', '코드 테마');
  label.htmlFor = id;
  const select = el('select', 'editor-theme-select');
  select.id = id;
  select.dataset.testid = id;
  for (const [value, name] of [['dark', '다크'], ['light', '라이트'], ['contrast', '고대비']]) {
    const option = el('option', '', name); option.value = value; select.append(option);
  }
  select.value = state.editorTheme;
  select.addEventListener('change', () => setEditorTheme(select.value));
  settings.append(label, select);
  return settings;
}

function syntaxLegend() {
  const legend = el('div', 'syntax-legend');
  legend.setAttribute('aria-label', '코드 색상 안내');
  for (const [category, label] of [['keyword', '키워드'], ['class', '클래스'], ['type', '타입'], ['variable', '변수'], ['method', '메서드'], ['string', '문자열'], ['comment', '주석'], ['number', '숫자']]) {
    legend.append(el('span', `syntax-legend-item tok-${category}`, label));
  }
  return legend;
}

function destroyCodeEditor() {
  activeEditor?.destroy();
  activeEditor = null;
}

function updateStorageIndicator() {
  const indicator = document.getElementById('storage-indicator');
  indicator.classList.toggle('is-unavailable', state.storage !== 'ready');
  const location = isDesktop ? '이 PC의 앱에 저장' : '이 브라우저에 저장';
  const label = state.storage === 'unavailable' ? '현재 화면 동안만 기록' : state.storage === 'invalid' ? '기존 기록을 읽지 못했습니다' : location;
  document.getElementById('storage-label').textContent = label;
  indicator.title = state.storage === 'unavailable' ? '학습 기록 저장소를 사용할 수 없습니다. 작성 코드를 별도로 복사해 주세요.' : isDesktop ? '진도와 코드는 이 PC의 앱 데이터에 저장되며 앱 재시작 후에도 유지됩니다.' : '진도와 코드는 현재 브라우저에만 저장됩니다.';
  const editorSave = document.getElementById('editor-save-state');
  if (editorSave) editorSave.textContent = state.storage === 'unavailable' ? '저장 불가 · 코드 복사 권장' : location;
  const notesSave = document.getElementById('notes-save-state');
  if (notesSave) notesSave.textContent = state.storage === 'unavailable' ? '저장소를 사용할 수 없어 현재 화면 동안만 유지됩니다.' : `${location}됩니다. 설계 메모는 자동 평가하지 않습니다.`;
}

function saveStorage() {
  clearTimeout(saveTimer);
  const record = {
    schema: 1, version: state.version, lessonId: state.lessonId,
    quizPassed: [...state.quizPassed],
    labPassed: [...state.labPassed].map(([exerciseId, source]) => ({ exerciseId, source })),
    drafts: [...state.drafts].map(([exerciseId, source]) => ({ exerciseId, source })),
    fileDrafts: [...state.fileDrafts].map(([key, source]) => { const [exerciseId, path] = key.split('::'); return { exerciseId, path, source }; }),
    notes: [...state.notes].map(([lessonId, text]) => ({ lessonId, text })),
  };
  try {
    storageAdapter().setItem(STORAGE_KEY, JSON.stringify(record));
    state.storage = 'ready';
  } catch {
    if (state.storage !== 'unavailable') toast('학습 기록을 저장할 수 없습니다. 작성 코드를 별도로 복사해 주세요.');
    state.storage = 'unavailable';
  }
  updateStorageIndicator();
}

function scheduleSave() { clearTimeout(saveTimer); saveTimer = window.setTimeout(saveStorage, 450); }

function readHash() {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === 'learning-workspace' || hash === 'lesson-title') return;
  let requestedId;
  let requestedStep;
  let requestedVersion;
  try {
    if (hash.includes('=')) {
      const params = new URLSearchParams(hash);
      requestedId = params.get('lesson');
      requestedStep = params.get('step');
      const candidate = Number(params.get('version'));
      requestedVersion = VERSIONS.includes(candidate) ? candidate : null;
    } else {
      requestedId = decodeURIComponent(hash);
    }
  } catch { requestedId = ''; }
  const requestedLesson = lessons.find((lesson) => lesson.id === requestedId);
  state.track = 'all';
  state.search = '';
  if (requestedVersion) state.version = requestedVersion;
  if (requestedLesson) {
    if (!requestedVersion && requestedLesson.minVersion > state.version) {
      state.version = VERSIONS.find((version) => version >= requestedLesson.minVersion) || 21;
    }
    if (requestedLesson.minVersion <= state.version) {
      state.lessonId = requestedLesson.id;
      state.step = STEPS.includes(requestedStep) ? requestedStep : 'theory';
    } else {
      state.lessonId = '';
      state.step = 'theory';
      announce(`요청한 수업에는 Java ${requestedLesson.minVersion} 이상이 필요합니다. Java ${state.version}에서 사용할 수 있는 수업을 표시합니다.`);
    }
  } else {
    state.lessonId = '';
    state.step = 'theory';
    announce('수업 링크를 찾지 못해 첫 번째 수업을 표시합니다.');
  }
}

function syncHash(mode = 'replace') {
  if (!state.lessonId) return;
  const params = new URLSearchParams({ lesson: state.lessonId, step: state.step, version: String(state.version) });
  const next = `#${params.toString()}`;
  if (window.location.hash === next) return;
  try { window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', next); }
  catch { /* Browsers with restricted history still retain all in-page interactions. */ }
}

function renderControls() {
  dom['version-select'].value = String(state.version);
  dom['lesson-search'].value = state.search;
  document.querySelectorAll('[data-track]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.track === state.track)));
}

function renderSidebar() {
  const filtered = visibleLessons();
  dom['lesson-list'].replaceChildren();
  document.getElementById('filtered-count').textContent = `${filtered.length}개 수업`;
  document.getElementById('filtered-completed').textContent = `${filtered.filter(lessonComplete).length} / ${filtered.length} 완료`;
  if (!filtered.length) {
    dom['lesson-list'].append(el('p', 'sidebar-empty', '조건에 맞는 수업이 없습니다. 검색어 또는 학습 기준 버전을 바꿔 보세요.'));
    return;
  }
  for (const lesson of filtered) {
    const index = lessons.findIndex((item) => item.id === lesson.id);
    const complete = lessonComplete(lesson);
    const link = el('a', `lesson-link${lesson.id === state.lessonId ? ' is-active' : ''}${complete ? ' is-complete' : ''}`);
    link.href = `#${new URLSearchParams({ lesson: lesson.id, step: 'theory', version: String(state.version) })}`;
    link.dataset.lessonId = lesson.id;
    link.dataset.complete = String(complete);
    link.dataset.testid = `lesson-${lesson.id}`;
    if (lesson.id === state.lessonId) link.setAttribute('aria-current', 'page');
    const number = el('span', 'lesson-index');
    number.append(complete ? icon('check') : document.createTextNode(String(index + 1).padStart(2, '0')));
    if (complete) number.append(el('span', 'sr-only', '수업 완료'));
    const copy = el('span', 'lesson-link-copy');
    copy.append(el('span', 'lesson-link-title', lesson.title));
    const meta = el('span', 'lesson-link-meta');
    meta.append(el('span', '', `Java ${lesson.minVersion}+`), el('span', '', complete ? '완료' : isProject(exerciseFor(lesson)) ? '실무 프로젝트' : lesson.track === 'advanced' ? '실무 심화' : lesson.track === 'both' ? '공통' : 'Java 전환'));
    copy.append(meta);
    link.append(number, copy);
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      selectLesson(lesson.id, 'theory', true);
    });
    dom['lesson-list'].append(link);
  }
}

function continuationLesson() {
  const compatible = lessons.filter((lesson) => lesson.minVersion <= state.version);
  return compatible.find((lesson) => lesson.id === state.lessonId && !lessonComplete(lesson)) || compatible.find((lesson) => !lessonComplete(lesson)) || compatible[0];
}

function renderProgress() {
  const count = lessons.filter(lessonComplete).length;
  document.getElementById('overall-completed').textContent = String(count);
  document.getElementById('overall-denominator').textContent = ` / ${lessons.length}`;
  const progress = document.getElementById('overall-progress');
  progress.setAttribute('aria-valuemax', String(lessons.length));
  progress.setAttribute('aria-valuenow', String(count));
  progress.setAttribute('aria-valuetext', `전체 ${lessons.length}개 수업 중 ${count}개 완료`);
  document.getElementById('overall-progress-fill').style.width = `${lessons.length ? (count / lessons.length) * 100 : 0}%`;
  const next = continuationLesson();
  document.getElementById('continue-label').textContent = next && lessonComplete(next) ? '완료한 수업 다시 보기' : state.quizPassed.size || state.drafts.size || state.fileDrafts.size ? '이어서 학습하기' : '학습 시작하기';
  document.getElementById('continue-title').textContent = next?.title || '수업을 준비하고 있습니다';
  document.getElementById('continue-button').disabled = !next;
}

function renderAchievements(lesson = currentLesson()) {
  dom['lesson-achievements'].replaceChildren();
  if (!lesson) return;
  const exercise = exerciseFor(lesson);
  const quizDone = state.quizPassed.has(lesson.id);
  const labDone = labComplete(lesson);
  const priorLab = Boolean(exercise && state.labPassed.has(exercise.id) && !labDone);
  for (const [kind, complete, text, past] of [
    ['quiz', quizDone, quizDone ? '객관식 성취 완료' : '객관식 미완료', false],
    ['lab', labDone, labDone ? '현재 코드 제출 통과' : priorLab ? '이전 코드 통과 · 현재 코드 재제출 필요' : '코드 제출 미완료', priorLab],
  ]) {
    const badge = el('span', `achievement-badge${complete ? ' is-complete' : ''}${past ? ' is-past' : ''}`, text);
    badge.dataset.achievement = kind;
    badge.dataset.complete = String(complete);
    dom['lesson-achievements'].append(badge);
  }
  dom['lesson-card'].dataset.complete = String(lessonComplete(lesson));
}

function renderLesson() {
  const lesson = currentLesson();
  const changedLesson = dom['lesson-card'].dataset.lessonId !== (lesson?.id || '');
  const tabs = document.querySelector('.lesson-tabs');
  destroyCodeEditor();
  dom['lesson-panel'].replaceChildren();
  dom['lesson-meta'].replaceChildren();
  dom['lesson-detail-meta'].replaceChildren();
  dom['lesson-goals'].replaceChildren();
  dom['lesson-footer'].replaceChildren();
  dom['lesson-achievements'].replaceChildren();
  tabs.hidden = !lesson;
  dom['lesson-footer'].hidden = !lesson;
  dom['lesson-support'].hidden = !lesson;
  if (changedLesson) {
    dom['lesson-info'].open = false;
    dom['reference-column'].open = false;
  }
  dom['lesson-card'].dataset.lessonId = lesson?.id || '';
  if (!lesson) {
    dom['lesson-category'].textContent = 'FIND YOUR NEXT LESSON';
    dom['lesson-title'].textContent = '수업을 찾지 못했습니다';
    dom['lesson-description'].textContent = '현재 검색어와 필터에 맞는 수업이 없습니다.';
    dom['lesson-position'].textContent = '—';
    dom['lesson-panel'].setAttribute('aria-labelledby', 'lesson-title');
    const empty = el('div', 'empty-state');
    empty.append(icon('search'), el('h3', '', '다른 키워드로 찾아볼까요?'), el('p', '', `Java ${state.version}에서 사용할 수 있는 수업 중 제목·설명·학습 목표·기술 키워드를 검색합니다.`), actionButton('검색과 트랙 초기화', 'button button-secondary', () => { state.track = 'all'; state.search = ''; applyFilters(); }));
    dom['lesson-panel'].append(empty);
    return;
  }
  dom['lesson-category'].textContent = lesson.category || 'JAVA CORE';
  dom['lesson-title'].textContent = lesson.title;
  dom['lesson-description'].textContent = lesson.description;
  dom['lesson-position'].textContent = `${String(lessons.indexOf(lesson) + 1).padStart(2, '0')} / ${String(lessons.length).padStart(2, '0')}`;
  dom['lesson-meta'].append(el('span', 'meta-chip', `Java ${lesson.minVersion}+`));
  if (lesson.featureSince) dom['lesson-detail-meta'].append(el('span', '', `기능 도입 ${String(lesson.featureSince)}`));
  const trackLabel = lesson.track === 'both' ? '전환 · 심화 공통' : lesson.track === 'advanced' ? '실무 심화' : 'Java 전환';
  dom['lesson-detail-meta'].append(el('span', '', trackLabel));
  if (isProject(exerciseFor(lesson))) dom['lesson-meta'].append(el('span', 'meta-chip is-neutral', '실무 프로젝트 · Windows 앱 실행'));
  if (lesson.duration) {
    const time = el('span', 'meta-chip is-neutral');
    time.append(icon('clock'), document.createTextNode(typeof lesson.duration === 'number' ? `${lesson.duration}분` : lesson.duration));
    dom['lesson-detail-meta'].append(time);
  }
  if (lesson.preview) dom['lesson-meta'].append(el('span', 'meta-chip is-preview', 'Preview 기능 포함'));
  dom['lesson-goals'].append(el('h3', '', '학습 목표'));
  const goals = el('ul');
  (lesson.goals || []).forEach((goal) => { const item = el('li'); item.append(icon('check'), el('span', '', goal)); goals.append(item); });
  dom['lesson-goals'].append(goals);
  renderAchievements(lesson);
  document.querySelectorAll('[data-step]').forEach((tab) => {
    const selected = tab.dataset.step === state.step;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  dom['lesson-panel'].setAttribute('aria-labelledby', `tab-${state.step}`);
  const renderers = { theory: renderTheory, example: renderExample, quiz: renderQuiz, practice: renderPractice, lab: renderLab };
  renderers[state.step](lesson);
  renderLessonFooter(lesson);
  requestAnimationFrame(() => revealStepTab(state.step));
}

function renderLessonFooter(lesson) {
  const filtered = visibleLessons();
  const index = filtered.findIndex((item) => item.id === lesson.id);
  const previous = filtered[index - 1];
  const next = filtered[index + 1];
  if (previous) {
    const button = actionButton('← 이전 수업', '', () => selectLesson(previous.id, 'theory', true));
    button.append(el('strong', '', previous.title));
    dom['lesson-footer'].append(button);
  }
  if (next) {
    const button = actionButton('다음 수업 →', '', () => selectLesson(next.id, 'theory', true));
    button.append(el('strong', '', next.title));
    dom['lesson-footer'].append(button);
  }
  if (!previous && !next) dom['lesson-footer'].append(el('p', 'inline-note', '현재 조건에 맞는 유일한 수업입니다.'));
}

function renderReferences() {
  const lesson = currentLesson();
  dom['source-list'].replaceChildren();
  dom['evidence-list'].replaceChildren();
  if (!lesson) return;
  for (const source of lesson.sources || []) {
    const link = safeLink('', source.url, 'source-link');
    link.append(el('strong', '', source.title), icon('external'));
    const facts = [source.edition, source.checkedAt ? `확인 ${source.checkedAt}` : '공식 원문'].filter(Boolean);
    link.append(el('span', '', facts.join(' · ')));
    dom['source-list'].append(link);
  }
  const evidence = jobEvidence.filter((item) => item.lessonIds?.includes(lesson.id));
  if (!evidence.length) {
    dom['evidence-list'].append(el('p', 'reference-description', '이 수업에 직접 연결한 공고 사례는 아직 없습니다. 공식 문서와 실무 시나리오를 먼저 살펴보세요.'));
    return;
  }
  evidence.forEach((item, index) => {
    const card = el('div', 'evidence-item');
    const company = el('p', 'evidence-company', item.company);
    company.append(el('span', 'evidence-status', item.status || '상태 미확인'));
    const link = safeLink(item.title, item.url, 'evidence-title');
    link.append(icon('external'));
    card.append(company, link, el('p', '', item.summary));
    const tags = el('div', 'technology-tags');
    (item.technologies || []).slice(0, 5).forEach((tag) => tags.append(el('span', '', tag)));
    card.append(tags, el('p', 'evidence-date', `확인 ${item.checkedAt || '미기록'} · ${item.access === 'partial' ? '일부 본문 확인' : '본문 확인'}`));
    if (index < 2) dom['evidence-list'].append(card);
    else {
      let more = dom['evidence-list'].querySelector('details');
      if (!more) {
        more = el('details', 'evidence-more');
        more.append(el('summary', 'text-button', `사례 ${evidence.length - 2}개 더 보기`));
        dom['evidence-list'].append(more);
      }
      more.append(card);
    }
  });
}

function renderAll() {
  renderControls();
  renderSidebar();
  renderProgress();
  renderLesson();
  renderReferences();
  updateStorageIndicator();
}

function nextStepButton(step, label) {
  const row = el('div', 'next-step-row');
  const button = actionButton(label || `${STEP_LABELS[step]}로 이어가기`, 'button button-secondary', () => selectStep(step, true));
  button.append(icon('arrow'));
  row.append(button);
  return row;
}

function sectionTitle(text, number) {
  const heading = el('div', 'section-heading');
  if (number) heading.append(el('span', 'section-number', number));
  heading.append(el('h3', '', text));
  return heading;
}

function validLessonVisual(value) {
  if (!value || !['flow', 'comparison', 'state', 'relationship'].includes(value.kind)) return null;
  if (!['id', 'title', 'caption', 'altText', 'readingOrder'].every((key) => typeof value[key] === 'string' && value[key].trim())) return null;
  if (!Array.isArray(value.panels) || !value.panels.length || value.panels.length > 6) return null;
  for (const panel of value.panels) {
    if (!panel || typeof panel.title !== 'string' || !Array.isArray(panel.nodes) || !panel.nodes.length || panel.nodes.length > 12 || !Array.isArray(panel.edges) || panel.edges.length > 30) return null;
    if (!panel.nodes.every((node) => node && typeof node.id === 'string' && node.id && typeof node.label === 'string' && node.label.trim() && typeof node.detail === 'string')) return null;
    const ids = new Set(panel.nodes.map((node) => node.id));
    if (ids.size !== panel.nodes.length || !panel.edges.every((edge) => edge && ids.has(edge.from) && ids.has(edge.to) && typeof edge.label === 'string' && edge.label.trim())) return null;
  }
  if (!Array.isArray(value.sources) || !value.sources.length || !value.sources.every((source) => {
    if (!source || typeof source.title !== 'string' || !source.title.trim()) return false;
    try { return ['http:', 'https:'].includes(new URL(source.url).protocol); } catch { return false; }
  })) return null;
  return value;
}

function visualNode(node) {
  const tone = ['accent', 'warning'].includes(node.tone) ? node.tone : 'neutral';
  const card = el('div', `visual-node is-${tone}`);
  card.dataset.nodeId = node.id;
  card.append(el('strong', 'visual-node-label', node.label));
  if (node.detail) card.append(el('p', 'visual-node-detail', node.detail));
  return card;
}

function visualConnection(edge, nodes, standalone = false) {
  const from = nodes.find((node) => node.id === edge.from);
  const to = nodes.find((node) => node.id === edge.to);
  const connection = el('div', standalone ? 'visual-relationship' : 'visual-transition');
  connection.dataset.from = edge.from;
  connection.dataset.to = edge.to;
  if (standalone) connection.append(el('span', 'visual-endpoint', from.label));
  const arrow = el('span', 'visual-arrow');
  arrow.append(icon('arrow'));
  const label = el('span', 'visual-edge-label');
  label.append(el('span', 'sr-only', `${from.label}에서 ${to.label}로: `), document.createTextNode(edge.label));
  arrow.append(label);
  connection.append(arrow);
  if (standalone) connection.append(el('span', 'visual-endpoint', to.label));
  return connection;
}

function renderTheoryVisual(lesson, visual) {
  const figure = el('figure', 'theory-visual');
  const prefix = `theory-visual-${lessons.indexOf(lesson)}`;
  figure.dataset.visualId = visual.id;
  figure.dataset.visualKind = visual.kind;
  figure.setAttribute('aria-labelledby', `${prefix}-title`);
  figure.setAttribute('aria-describedby', `${prefix}-caption`);
  const caption = el('figcaption', 'visual-caption');
  const kinds = { flow: '실행 순서', comparison: '나란히 비교하기', state: '상태와 전이', relationship: '요소 사이의 관계' };
  const label = el('p', 'visual-kicker', kinds[visual.kind]);
  const title = el('h3', 'visual-title', visual.title); title.id = `${prefix}-title`;
  const description = el('p', 'visual-description', visual.caption); description.id = `${prefix}-caption`;
  caption.append(label, title, description);
  figure.append(caption);
  const order = el('p', 'visual-reading-order');
  order.append(el('strong', '', '읽는 순서'), document.createTextNode(` ${visual.readingOrder}`));
  figure.append(order);
  const panels = el('div', 'visual-panels');
  visual.panels.forEach((panel, panelIndex) => {
    const section = el('section', 'visual-panel');
    const heading = el('h4', 'visual-panel-title', panel.title); heading.id = `${prefix}-panel-${panelIndex}`;
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading);
    const nodes = el(visual.kind === 'flow' || visual.kind === 'state' ? 'ol' : 'ul', visual.kind === 'relationship' ? 'visual-nodes is-catalog' : 'visual-nodes');
    const used = new Set();
    panel.nodes.forEach((node, index) => {
      const row = el('li', 'visual-node-row');
      row.append(visualNode(node));
      if (visual.kind !== 'relationship' && index < panel.nodes.length - 1) {
        const edge = panel.edges.find((item) => item.from === node.id && item.to === panel.nodes[index + 1].id);
        if (edge) { row.append(visualConnection(edge, panel.nodes)); used.add(edge); }
      }
      nodes.append(row);
    });
    section.append(nodes);
    const additional = panel.edges.filter((edge) => !used.has(edge));
    if (additional.length) {
      const connections = el('div', 'visual-connections');
      connections.append(el('p', 'visual-connections-label', visual.kind === 'relationship' ? '연결 관계 · 화살표의 양 끝과 라벨을 함께 읽으세요' : '함께 볼 연결 관계'));
      for (const edge of additional) connections.append(visualConnection(edge, panel.nodes, true));
      section.append(connections);
    }
    panels.append(section);
  });
  figure.append(panels);
  if (typeof visual.takeaway === 'string' && visual.takeaway) {
    const takeaway = el('p', 'visual-takeaway');
    takeaway.append(el('strong', '', '핵심 판단'), document.createTextNode(` ${visual.takeaway}`));
    figure.append(takeaway);
  }
  const details = el('details', 'visual-text-description');
  details.append(el('summary', '', '도식의 텍스트 설명과 범위'));
  const alternative = el('p', 'visual-alt-text', visual.altText); alternative.id = `${prefix}-description`;
  details.append(alternative);
  if (Array.isArray(visual.limits) && visual.limits.length) {
    const limits = el('ul', 'visual-limits');
    visual.limits.filter((item) => typeof item === 'string').forEach((item) => limits.append(el('li', '', item)));
    details.append(limits);
  }
  figure.append(details);
  const sources = el('div', 'visual-sources');
  sources.append(el('p', 'visual-sources-label', '공식 문서에서 확인'));
  const sourceList = el('ul');
  for (const source of visual.sources) {
    const item = el('li');
    const link = safeLink(source.title, source.url, 'visual-source-link'); link.append(icon('external'));
    const facts = [source.edition, source.checkedAt ? `확인 ${source.checkedAt}` : ''].filter(Boolean);
    item.append(link);
    if (facts.length) item.append(el('span', 'visual-source-meta', facts.join(' · ')));
    sourceList.append(item);
  }
  sources.append(sourceList); figure.append(sources);
  return figure;
}

function learningGuideFor(lesson) {
  const value = lesson.learningGuide;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = (item) => typeof item === 'string' && item.trim() ? item : '';
  const terms = Array.isArray(value.terms) ? value.terms
    .filter((item) => item && text(item.term) && text(item.meaning))
    .map((item) => ({ term: item.term, meaning: item.meaning })) : [];
  const walkthrough = Array.isArray(value.walkthrough) ? value.walkthrough.filter((item) => text(item)) : [];
  const code = text(value.code?.source) ? { file: text(value.code.file) || '코드 발췌', source: value.code.source } : null;
  const prediction = text(value.prediction?.question) && text(value.prediction?.answer)
    ? { question: value.prediction.question, answer: value.prediction.answer, explanation: text(value.prediction.explanation) } : null;
  const guide = { scenario: text(value.scenario), question: text(value.question), terms, code, walkthrough, prediction, takeaway: text(value.takeaway) };
  return guide.scenario || guide.question || terms.length || code || walkthrough.length || prediction || guide.takeaway ? guide : null;
}

function renderGuideCode(excerpt) {
  const section = el('section', 'guide-section guide-code-section');
  section.append(el('h3', '', '작은 코드로 확인하기'));
  const scope = el('p', 'guide-code-scope', '이론 코드 발췌 · 전체 코드는 예제 단계에서 확인하세요.');
  scope.id = 'theory-code-scope';
  section.append(scope);
  const shell = el('div', 'code-shell guide-code');
  shell.dataset.editorTheme = state.editorTheme;
  const heading = el('div', 'code-heading');
  const filename = el('span', 'example-filename');
  filename.append(icon('code'), el('span', 'guide-code-filename', excerpt.file));
  const pre = el('pre', 'code-block');
  pre.id = 'theory-code-panel';
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', `${excerpt.file} · 이론 코드 발췌`);
  pre.setAttribute('aria-describedby', 'theory-code-scope theory-code-hint');
  const code = el('code', '', excerpt.source);
  let highlighted = false;
  if (editorLibrary && /\.java$/i.test(excerpt.file)) {
    try {
      editorLibrary.highlightJavaCode(code, excerpt.source);
      highlighted = true;
    } catch { code.textContent = excerpt.source; }
  }
  pre.append(code);
  const copy = actionButton('코드 복사', 'copy-button', () => copyText(excerpt.source, pre), 'copy-theory-code');
  copy.prepend(icon('copy'));
  heading.append(filename, copy);
  const tools = el('div', 'guide-code-tools');
  tools.append(codePreferences('theory-theme-select'));
  if (highlighted) {
    const legend = el('details', 'code-legend-disclosure');
    legend.append(el('summary', '', '구문 색상 안내'), syntaxLegend());
    tools.append(legend);
  }
  shell.append(heading, tools);
  shell.append(pre);
  const hint = el('p', 'guide-code-hint', '긴 줄은 코드 영역 안에서 가로로 스크롤할 수 있습니다.');
  hint.id = 'theory-code-hint';
  if (/\.java$/i.test(excerpt.file) && !highlighted) hint.append(document.createTextNode(' 문법 강조를 불러오지 못해 원문으로 표시합니다.'));
  section.append(shell, hint);
  return section;
}

function renderLearningGuide(guide) {
  const container = el('div', 'learning-guide');
  if (guide.scenario || guide.question) {
    const scenario = el('section', 'guide-scenario');
    scenario.append(el('h3', '', '이 상황부터 생각해보세요'));
    if (guide.scenario) scenario.append(el('p', 'guide-scenario-text', guide.scenario));
    if (guide.question) scenario.append(el('p', 'guide-question', guide.question));
    container.append(scenario);
  }
  if (guide.terms.length) {
    const section = el('section', 'guide-section guide-terms');
    section.append(el('h3', '', '먼저 알아둘 용어'));
    const list = el('dl', 'guide-terms-list');
    guide.terms.forEach(({ term, meaning }) => {
      const item = el('div', 'guide-term');
      item.append(el('dt', '', term), el('dd', '', meaning));
      list.append(item);
    });
    section.append(list);
    container.append(section);
  }
  if (guide.code) container.append(renderGuideCode(guide.code));
  if (guide.walkthrough.length) {
    const section = el('section', 'guide-section guide-walkthrough');
    section.append(el('h3', '', '순서대로 따라가 보기'));
    const list = el('ol');
    guide.walkthrough.forEach((step) => list.append(el('li', '', step)));
    section.append(list);
    container.append(section);
  }
  if (guide.prediction) {
    const section = el('section', 'guide-section guide-prediction-section');
    section.append(el('h3', '', '결과를 먼저 예상해보세요'), el('p', 'guide-prediction-question', guide.prediction.question));
    const details = el('details', 'guide-prediction');
    details.append(el('summary', '', guide.prediction.explanation ? '예상 답과 이유 확인' : '예상 답 확인'));
    const answer = el('div', 'guide-prediction-answer');
    answer.append(el('p', 'guide-answer-label', '예상 답'), el('p', 'guide-answer-text', guide.prediction.answer));
    if (guide.prediction.explanation) answer.append(el('p', 'guide-answer-label', '이유'), el('p', 'guide-answer-explanation', guide.prediction.explanation));
    details.append(answer);
    section.append(details);
    container.append(section);
  }
  if (guide.takeaway) {
    const takeaway = el('div', 'guide-takeaway');
    takeaway.append(el('p', 'small-label', '한 문장으로 정리하면'), el('p', '', guide.takeaway));
    container.append(takeaway);
  }
  return container;
}

function renderTheory(lesson) {
  const guide = learningGuideFor(lesson);
  if (guide) dom['lesson-panel'].append(renderLearningGuide(guide));
  if (guide && lesson.theory?.length) dom['lesson-panel'].append(el('h3', 'theory-reading-title', '핵심 개념 자세히 읽기'));
  const parts = lesson.theory || [];
  const visual = validLessonVisual(lessonVisuals[lesson.id]);
  const afterSection = visual && Number.isInteger(visual.afterSection) ? Math.min(Math.max(visual.afterSection, 0), Math.max(parts.length - 1, 0)) : 0;
  parts.forEach((part, index) => {
    const section = el('section', 'theory-section');
    section.append(sectionTitle(part.heading, String(index + 1).padStart(2, '0')), el('p', '', part.text));
    dom['lesson-panel'].append(section);
    if (visual && index === afterSection) dom['lesson-panel'].append(renderTheoryVisual(lesson, visual));
  });
  if (visual && !parts.length) dom['lesson-panel'].append(renderTheoryVisual(lesson, visual));
  dom['lesson-panel'].append(nextStepButton('example', '예제로 개념 확인하기'));
}

async function copyText(text, selectableNode) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    toast('코드를 복사했습니다.');
  } catch {
    if (typeof selectableNode?.selectAll === 'function') {
      selectableNode.selectAll();
    } else if (selectableNode instanceof HTMLTextAreaElement) {
      selectableNode.focus();
      selectableNode.select();
    } else if (selectableNode) {
      const range = document.createRange();
      range.selectNodeContents(selectableNode);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    toast('자동 복사를 사용할 수 없습니다. 선택된 코드를 직접 복사해 주세요.');
  }
}

function fileTabs(files, selectedPath, onSelect, prefix, panelId, label) {
  const tabs = el('div', 'file-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', label);
  files.forEach((file, index) => {
    const button = actionButton(file.path.split('/').at(-1), 'file-tab', () => {
      onSelect(file.path);
      document.getElementById(`${prefix}-${index}`)?.focus({ preventScroll: true });
    }, `${prefix}-${index}`);
    button.title = file.path;
    button.dataset.filePath = file.path;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-selected', String(file.path === selectedPath));
    button.setAttribute('aria-label', `${file.path}${file.editable === false ? ' · 읽기 전용' : ''}`);
    button.tabIndex = file.path === selectedPath ? 0 : -1;
    if (file.editable === false) button.append(el('span', 'file-readonly-badge', '읽기 전용'));
    button.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % files.length : event.key === 'ArrowLeft' ? (index + files.length - 1) % files.length : event.key === 'Home' ? 0 : event.key === 'End' ? files.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      onSelect(files[next].path);
      document.getElementById(`${prefix}-${next}`)?.focus({ preventScroll: true });
    });
    tabs.append(button);
  });
  return tabs;
}

function renderExample(lesson) {
  const example = lesson.example;
  if (!example) return;
  dom['lesson-panel'].append(sectionTitle(example.title || '코드로 개념 살펴보기'), el('p', 'section-caption', '아래는 학습용 예제와 예상 출력입니다. 실제 실행은 코드 실습에서 확인하세요.'));
  const shell = el('div', 'code-shell');
  shell.dataset.editorTheme = state.editorTheme;
  const heading = el('div', 'code-heading');
  const files = Array.isArray(example.files) && example.files.length ? example.files : [{ path: 'Main.java', language: 'java', code: example.code }];
  let selected = files[0];
  const filename = el('span', 'example-filename');
  const pre = el('pre', 'code-block');
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', '학습 예제 소스 코드');
  pre.id = 'example-file-panel';
  const code = el('code');
  pre.append(code);
  const copy = actionButton('코드 복사', 'copy-button', () => copyText(selected.code, pre), 'copy-example');
  copy.prepend(icon('copy'));
  heading.append(filename, copy);
  const legend = syntaxLegend();
  const tabsHost = el('div');
  function selectFile(path) {
    selected = files.find((file) => file.path === path) || files[0];
    filename.replaceChildren(icon('code'), document.createTextNode(selected.path));
    filename.append(el('span', 'file-readonly-badge', `${fileLanguage(selected.path)} · 읽기 전용 예제`));
    pre.setAttribute('aria-label', `${selected.path} · ${fileLanguage(selected.path)} · 읽기 전용 예제`);
    const java = selected.language === 'java' || selected.path.endsWith('.java');
    if (editorLibrary && java) editorLibrary.highlightJavaCode(code, selected.code);
    else code.textContent = selected.code;
    legend.hidden = !java;
    if (files.length > 1) {
      tabsHost.replaceChildren(fileTabs(files, selected.path, selectFile, 'example-file', pre.id, '예제 파일'));
      pre.setAttribute('role', 'tabpanel');
      pre.setAttribute('aria-labelledby', `example-file-${files.indexOf(selected)}`);
    }
    pre.scrollLeft = 0;
  }
  shell.append(heading, codePreferences(), legend, tabsHost, pre);
  selectFile(selected.path);
  const output = el('div', 'expected-output');
  output.append(el('p', 'small-label', '예상 출력 · 실행 결과가 아닙니다'), el('pre', '', example.output || '(표준 출력 없음)'));
  dom['lesson-panel'].append(shell, el('p', 'inline-note syntax-note', editorLibrary ? '색상은 코드의 구문을 구분하며, 컴파일 결과를 대신하지 않습니다.' : '문법 강조를 불러오지 못해 원문으로 표시합니다.'), output, el('p', 'explanation', example.explanation), nextStepButton('quiz', '문제로 이해 확인하기'));
}

function renderQuiz(lesson) {
  const questions = lesson.quiz || [];
  dom['lesson-panel'].append(sectionTitle('이해한 개념을 확인해 보세요'), el('p', 'section-caption', `총 ${questions.length}문항입니다. 모든 문항에 정답을 제출하면 객관식 성취가 기록됩니다.`));
  if (!questions.length) {
    dom['lesson-panel'].append(el('p', 'inline-note', '이 수업의 문제를 준비하고 있습니다.'));
    return;
  }
  if (!state.quizAnswers.has(lesson.id)) state.quizAnswers.set(lesson.id, new Map());
  const answers = state.quizAnswers.get(lesson.id);
  const result = state.quizResults.get(lesson.id);
  if (result) {
    const allCorrect = result.correct === questions.length;
    const summary = el('div', `result-summary${allCorrect ? '' : ' is-incomplete'}`);
    summary.id = 'quiz-result';
    summary.tabIndex = -1;
    summary.dataset.correct = String(result.correct);
    summary.append(el('strong', '', allCorrect ? '모든 개념을 정확히 이해했습니다.' : `${questions.length}문항 중 ${result.correct}문항 정답`), el('p', '', allCorrect ? '객관식 성취를 기록했습니다. 실무 시나리오를 읽고 코드 실습으로 이어가세요.' : '각 해설을 확인하고 다시 풀어 보세요. 모든 정답을 제출해야 성취가 기록됩니다.'));
    dom['lesson-panel'].append(summary);
  } else if (state.quizPassed.has(lesson.id)) {
    dom['lesson-panel'].append(el('p', 'inline-note', '이미 객관식 성취를 완료한 수업입니다. 다시 풀어도 획득한 성취는 유지됩니다.'));
  }
  const form = el('form', 'quiz-form');
  form.id = 'quiz-form';
  form.noValidate = true;
  questions.forEach((question, index) => {
    const fieldset = el('fieldset', 'quiz-question');
    const legend = el('legend');
    legend.append(el('span', 'question-number', `Q${String(index + 1).padStart(2, '0')}.`), document.createTextNode(question.question));
    fieldset.append(legend);
    const options = el('div', 'quiz-options');
    question.options.forEach((option, optionIndex) => {
      const label = el('label', 'quiz-option');
      const input = el('input');
      input.type = 'radio';
      input.name = `quiz-${question.id}`;
      input.value = String(optionIndex);
      input.checked = answers.get(question.id) === optionIndex;
      input.disabled = Boolean(result);
      input.required = true;
      input.addEventListener('change', () => {
        answers.set(question.id, optionIndex);
        const error = document.getElementById('quiz-error');
        if (error) error.textContent = '';
      });
      label.append(input, el('span', 'option-letter', String.fromCharCode(65 + optionIndex)), el('span', '', option));
      options.append(label);
    });
    fieldset.append(options);
    if (result) {
      const correct = answers.get(question.id) === question.correctIndex;
      const feedback = el('div', `quiz-feedback${correct ? '' : ' is-wrong'}`);
      feedback.append(el('strong', '', correct ? '정답입니다' : `정답: ${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`), el('p', '', question.explanation));
      fieldset.append(feedback);
    }
    form.append(fieldset);
  });
  const error = el('p', 'form-error');
  error.id = 'quiz-error';
  error.setAttribute('role', 'alert');
  form.append(error);
  const actions = el('div', 'quiz-actions');
  if (!result) {
    const submit = el('button', 'button button-primary', '정답 확인하기');
    submit.type = 'submit';
    submit.id = 'quiz-submit';
    submit.dataset.testid = 'quiz-submit';
    actions.append(submit);
  } else {
    actions.append(actionButton('다시 풀기', 'button button-secondary', () => {
      state.quizResults.delete(lesson.id);
      state.quizAnswers.set(lesson.id, new Map());
      renderLesson();
      document.querySelector('#quiz-form input')?.focus();
      announce('답안을 초기화했습니다. 문제를 다시 풀어 보세요.');
    }, 'quiz-retry'));
    if (result.correct === questions.length) actions.append(actionButton('실무 시나리오 살펴보기 →', 'button button-primary', () => selectStep('practice', true)));
  }
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const unanswered = questions.find((question) => !answers.has(question.id));
    if (unanswered) {
      error.textContent = `${questions.indexOf(unanswered) + 1}번 문제의 답을 선택해 주세요.`;
      Array.from(form.querySelectorAll('input')).find((input) => input.name === `quiz-${unanswered.id}`)?.focus();
      return;
    }
    const correct = questions.filter((question) => answers.get(question.id) === question.correctIndex).length;
    state.quizResults.set(lesson.id, { correct });
    if (correct === questions.length) state.quizPassed.add(lesson.id);
    saveStorage();
    renderAll();
    document.getElementById('quiz-result')?.focus();
    announce(`${questions.length}문항 중 ${correct}문항 정답입니다.${correct === questions.length ? ' 객관식 성취를 완료했습니다.' : ' 해설을 확인해 주세요.'}`);
  });
  dom['lesson-panel'].append(form);
}

function renderPractice(lesson) {
  const practice = lesson.practice;
  if (!practice) return;
  dom['lesson-panel'].append(sectionTitle(practice.title || '실무의 제약을 더해 보기'), el('p', 'section-caption', '동작하는 코드에서 한 걸음 더 나아가, 선택의 이유와 실패 조건을 설명해 보세요.'));
  const scenario = el('div', 'scenario-card');
  scenario.append(el('p', 'small-label', 'THE SCENARIO'), el('p', '', practice.scenario));
  dom['lesson-panel'].append(scenario);
  const tasks = el('ol', 'practice-tasks');
  (practice.tasks || []).forEach((task, index) => {
    const item = el('li');
    item.append(el('span', 'task-index', String(index + 1).padStart(2, '0')), el('span', '', task));
    tasks.append(item);
  });
  dom['lesson-panel'].append(tasks);
  if (practice.takeaway) {
    const takeaway = el('div', 'takeaway');
    takeaway.append(el('strong', '', '기억할 설계 기준'), el('p', '', practice.takeaway));
    dom['lesson-panel'].append(takeaway);
  }
  const label = el('label', 'design-notes-label', '나의 설계 판단');
  label.htmlFor = 'design-notes';
  const notes = el('textarea', 'design-notes');
  notes.id = 'design-notes';
  notes.value = state.notes.get(lesson.id) || '';
  notes.maxLength = NOTE_LIMIT;
  notes.placeholder = '어떤 선택을 했나요? 책임의 위치, 실패 조건, 다른 대안과의 차이를 적어 보세요.';
  notes.setAttribute('aria-describedby', 'notes-save-state');
  notes.addEventListener('input', () => { state.notes.set(lesson.id, notes.value); scheduleSave(); });
  const footnote = el('p', 'notes-footnote');
  footnote.id = 'notes-save-state';
  dom['lesson-panel'].append(label, notes, footnote, nextStepButton('lab', '직접 구현해 보기'));
}

function renderLab(lesson) {
  const exercise = exerciseFor(lesson);
  if (!exercise) {
    dom['lesson-panel'].append(sectionTitle('코드 실습 준비 중'), el('p', 'section-caption', '이 수업에 연결할 실습을 준비하고 있습니다.'));
    return;
  }
  const heading = el('div', 'lab-header');
  heading.append(el('h3', '', exercise.title), el('span', 'lab-mode', isProject(exercise) ? 'PROJECT LAB' : exercise.mode === 'class' ? 'CLASS DESIGN' : 'METHOD IMPLEMENTATION'));
  dom['lesson-panel'].append(heading, el('p', 'section-caption', isProject(exercise) ? '파일을 오가며 업무 계약을 구현하세요. 편집 가능한 Java 파일 전체를 함께 검증합니다. POM과 지원 리소스는 읽기 전용입니다.' : exercise.mode === 'class' ? '주어진 계약을 만족하는 클래스를 직접 설계하세요. 클래스 전체를 편집할 수 있습니다.' : '제공된 클래스와 메서드 골격을 완성하세요. 클래스 전체를 편집할 수 있습니다.'));
  const runtime = el('div', 'runtime-card');
  runtime.id = 'runtime-info';
  runtime.setAttribute('aria-live', 'polite');
  dom['lesson-panel'].append(runtime);
  const instructions = el('ol', 'lab-instructions');
  (exercise.instructions || []).forEach((instruction) => instructions.append(el('li', '', instruction)));
  dom['lesson-panel'].append(instructions);
  if (exercise.sampleDescription) {
    const sample = el('div', 'expected-output');
    sample.append(el('p', 'small-label', '공개 예시 · 예상 검증 결과'), el('p', 'section-caption', exercise.sampleDescription), el('pre', '', exercise.sampleOutput || ''));
    dom['lesson-panel'].append(sample);
  }
  if (exercise.rubric?.length) {
    const rubric = el('details', 'lab-rubric');
    rubric.append(el('summary', '', '설계를 설명할 때 확인할 기준'));
    const list = el('ul');
    exercise.rubric.forEach((item) => list.append(el('li', '', item)));
    rubric.append(list, el('p', 'inline-note', '이 기준은 자기 점검용입니다. 테스트 통과가 설계 설명의 자동 승인을 의미하지 않습니다.'));
    dom['lesson-panel'].append(rubric);
  }
  const editorShell = el('div', 'editor-shell');
  editorShell.dataset.editorTheme = state.editorTheme;
  const toolbar = el('div', 'editor-toolbar');
  const filename = el('span', 'editor-filename');
  filename.id = 'editor-filename';
  const editorTools = el('div', 'editor-tools');
  const editor = el('div', 'code-editor');
  editor.id = 'code-editor';
  editor.dataset.testid = 'code-editor';
  const wrapToggle = actionButton('줄바꿈', '', () => {
    state.editorWrap = !state.editorWrap;
    activeEditor?.setWrap(state.editorWrap);
    wrapToggle.setAttribute('aria-pressed', String(state.editorWrap));
    saveEditorPreferences();
  }, 'code-wrap-toggle');
  wrapToggle.setAttribute('aria-pressed', String(state.editorWrap));
  wrapToggle.setAttribute('aria-label', '긴 코드 줄 자동 줄바꿈');
  editorTools.append(
    actionButton('들여쓰기', '', () => {
      activeEditor?.indent();
    }, 'indent-code'),
    wrapToggle,
    actionButton('복사', '', () => copyText(activeEditor?.getValue() ?? sourceFor(exercise), activeEditor), 'copy-code'),
    actionButton('초기 코드', '', () => {
      if (isProject(exercise) && !activeFile(exercise)?.editable) return;
      const previous = activeEditor?.getValue() ?? sourceFor(exercise);
      const template = isProject(exercise) ? activeFile(exercise).source : exercise.template;
      if (previous === template) { toast('이미 초기 코드입니다.'); return; }
      state.undo.set(fileKey(exercise), previous);
      setSource(exercise, template);
      activeEditor?.setValue(template);
      refreshDraftDependentUi(exercise);
      renderUndo(exercise);
      saveStorage();
      announce('초기 코드로 되돌렸습니다. 바로 아래 되돌리기 버튼으로 이전 코드를 복구할 수 있습니다.');
    }, 'lab-reset'),
  );
  toolbar.append(filename, editorTools);
  const editorStatus = el('div', 'editor-status');
  const lines = el('span'); lines.id = 'editor-line-count';
  const save = el('span'); save.id = 'editor-save-state';
  editorStatus.append(lines, save);
  const tabsHost = el('div'); tabsHost.id = 'project-file-tabs';
  const legend = syntaxLegend(); legend.id = 'editor-syntax-legend';
  editorShell.append(toolbar, codePreferences(), legend, tabsHost, editor, editorStatus);
  const hint = el('p', 'editor-hint', `Tab은 다음 항목으로 이동하고 들여쓰기 버튼은 선택 줄에 공백 4칸을 넣습니다. 색상은 구문을 구분하며 컴파일 결과를 대신하지 않습니다. ${isProject(exercise) ? '현재 파일만 초기화합니다. 편집은 파일당 65,536자, 실행은 UTF-8 파일당 64 KiB·전체 256 KiB까지입니다. 한글은 여러 바이트를 사용합니다.' : `class Solution 골격을 유지하고 최상위 public class·package·Main 선언은 추가하지 마세요. 편집은 50,000자까지이며 ${isDesktop ? '실행 소스' : '실행 요청 전체'}는 UTF-8 32 KiB까지입니다. 한글은 여러 바이트를 사용합니다.`}`);
  hint.id = 'editor-hint';
  const undo = el('div', 'reset-undo'); undo.id = 'lab-reset-undo'; undo.hidden = true;
  const disclosure = el('p', 'execution-disclosure', isDesktop ? '실행은 이 PC에서 이루어집니다. 코드는 PC의 사용자 권한으로 파일과 네트워크에 접근할 수 있으며, 격리된 보안 샌드박스가 아닙니다. 설정에서 동의한 뒤 실행하세요.' : isProject(exercise) ? '실무 프로젝트 실행은 Windows 앱에서 지원합니다. 이 웹 화면의 코드는 외부 실행 서비스로 전송하지 않습니다.' : '실행·제출을 누르면 작성 코드가 외부 서비스 Wandbox로 전송됩니다. 운영 로그에 코드가 남을 수 있으니 비밀정보를 입력하지 마세요. ');
  disclosure.id = 'execution-disclosure';
  if (!isDesktop && !isProject(exercise)) disclosure.append(safeLink('Wandbox 서비스 안내 ↗', 'https://github.com/melpon/wandbox#faq'));
  const actions = el('div', 'lab-actions');
  if (isDesktop && isProject(exercise)) actions.append(actionButton('환경 준비', 'button button-secondary', () => executeCode(exercise, 'prepare'), 'prepare-project'));
  const run = actionButton(isProject(exercise) ? '테스트 실행' : '예시 실행', 'button button-secondary', () => executeCode(exercise, 'run'), 'run-code');
  run.prepend(icon('play'));
  run.setAttribute('aria-describedby', 'execution-disclosure');
  const submit = actionButton('제출하고 검증하기', 'button button-primary', () => executeCode(exercise, 'submit'), 'submit-code');
  submit.prepend(icon('check'));
  submit.setAttribute('aria-describedby', 'execution-disclosure');
  const cancel = actionButton(isDesktop ? '실행 취소' : '응답 대기 취소', 'button button-quiet', () => cancelPending('user'), 'cancel-execution');
  cancel.hidden = true;
  const executionState = el('span', 'execution-state'); executionState.id = 'execution-state'; executionState.setAttribute('aria-live', 'polite');
  actions.append(run, submit, cancel, executionState);
  const output = el('section', 'execution-panel');
  output.id = 'execution-output';
  output.dataset.testid = 'execution-output';
  output.setAttribute('aria-label', '실제 Java 실행 결과');
  output.setAttribute('aria-busy', 'false');
  output.tabIndex = -1;
  dom['lesson-panel'].append(editorShell, hint, undo, disclosure, actions, output);
  renderEditorFile(exercise);
  if (!editorLibrary) hint.prepend(document.createTextNode('편집기 확장을 불러오지 못해 기본 텍스트 편집기를 사용합니다. '));
  renderRuntime();
  renderUndo(exercise);
  refreshEditorCounter(exercise);
  renderExecution(exercise);
  updateLabControls();
  if (isDesktop && isProject(exercise)) void loadProject(exercise);
}

function renderEditorFile(exercise) {
  destroyCodeEditor();
  const parent = document.getElementById('code-editor');
  if (!parent) return;
  parent.replaceChildren();
  const file = activeFile(exercise);
  const name = document.getElementById('editor-filename');
  name.replaceChildren(icon('code'), document.createTextNode(file ? file.path : 'Solution · Java'));
  const readonly = Boolean(file && !file.editable);
  if (file && !file.path.endsWith('.java')) name.append(el('span', 'file-readonly-badge', fileLanguage(file.path)));
  if (readonly) name.append(el('span', 'file-readonly-badge', '읽기 전용'));
  document.getElementById('indent-code').disabled = readonly;
  document.getElementById('lab-reset').disabled = readonly;
  document.getElementById('editor-syntax-legend').hidden = Boolean(file && !file.path.endsWith('.java'));
  const host = document.getElementById('project-file-tabs');
  if (file) {
    const files = projectFiles(exercise);
    host.replaceChildren(fileTabs(files, file.path, (path) => {
      if (activeFile(exercise)?.path === path) return;
      saveStorage();
      state.activeFiles.set(exercise.id, path);
      renderEditorFile(exercise);
      announce(`${path}${files.find((item) => item.path === path)?.editable ? ' 편집' : ' 읽기 전용'}`);
    }, 'project-file', parent.id, '실습 프로젝트 파일'));
    parent.setAttribute('role', 'tabpanel');
    parent.setAttribute('aria-labelledby', `project-file-${files.indexOf(file)}`);
  }
  mountCodeEditor(parent, exercise);
  renderUndo(exercise);
  refreshEditorCounter(exercise);
  updateStorageIndicator();
}

function mountCodeEditor(parent, exercise) {
  const file = activeFile(exercise);
  const path = file?.path;
  const readOnly = Boolean(file && !file.editable);
  const onChange = (value) => {
    if (readOnly) return;
    setSource(exercise, value, path);
    state.undo.delete(fileKey(exercise, path));
    renderUndo(exercise);
    refreshDraftDependentUi(exercise);
    scheduleSave();
  };
  const options = {
    parent, source: sourceFor(exercise), theme: state.editorTheme, wrap: state.editorWrap,
    label: `${file?.path || exercise.title} ${file ? fileLanguage(file.path) : 'Java'} ${readOnly ? '읽기 전용 파일' : '코드 편집기'}`, descriptionId: 'editor-hint editor-save-state',
    readOnly, language: file && !file.path.endsWith('.java') ? 'text' : 'java',
    maxLength: sourceLimit(exercise), onChange, onBlur: saveStorage,
    onLimit: () => toast(`코드는 ${sourceLimit(exercise).toLocaleString('ko-KR')}자까지 작성할 수 있습니다. 실행 바이트 제한은 별도로 확인합니다.`),
  };
  if (editorLibrary) {
    activeEditor = editorLibrary.createJavaEditor(options);
    return;
  }
  const textarea = el('textarea', 'code-editor-fallback');
  textarea.value = options.source;
  textarea.maxLength = options.maxLength;
  textarea.readOnly = readOnly;
  textarea.setAttribute('aria-readonly', String(readOnly));
  textarea.spellcheck = false;
  textarea.setAttribute('aria-label', options.label);
  textarea.setAttribute('aria-describedby', options.descriptionId);
  textarea.dataset.testid = 'code-editor-input';
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('wrap', state.editorWrap ? 'soft' : 'off');
  textarea.addEventListener('input', () => onChange(textarea.value));
  textarea.addEventListener('blur', saveStorage);
  parent.dataset.editorEngine = 'textarea-fallback';
  parent.append(textarea);
  activeEditor = {
    getValue: () => textarea.value,
    setValue: (value) => { textarea.value = value; },
    focus: () => textarea.focus(),
    selectAll: () => { textarea.focus(); textarea.select(); },
    indent: () => {
      if (readOnly) return;
      textarea.setRangeText('    ', textarea.selectionStart, textarea.selectionEnd, 'end');
      onChange(textarea.value);
      textarea.focus();
    },
    setTheme: () => {},
    setWrap: (wrap) => textarea.setAttribute('wrap', wrap ? 'soft' : 'off'),
    destroy: () => {},
  };
}

function refreshEditorCounter(exercise) {
  const count = document.getElementById('editor-line-count');
  const source = sourceFor(exercise);
  if (count) count.textContent = `${source.split('\n').length} lines · ${source.length.toLocaleString('ko-KR')} / ${sourceLimit(exercise).toLocaleString('ko-KR')} chars · ${(utf8Size(source) / 1024).toFixed(1)} KiB`;
}

function renderUndo(exercise) {
  const row = document.getElementById('lab-reset-undo');
  if (!row) return;
  row.replaceChildren();
  const key = fileKey(exercise);
  row.hidden = !state.undo.has(key);
  if (row.hidden) return;
  row.append(document.createTextNode('초기 코드로 되돌렸습니다.'), actionButton('되돌리기', '', () => {
    if (!state.undo.has(key)) return;
    const source = state.undo.get(key);
    state.undo.delete(key);
    setSource(exercise, source);
    activeEditor?.setValue(source);
    refreshDraftDependentUi(exercise);
    renderUndo(exercise);
    saveStorage();
    activeEditor?.focus();
    announce('이전 작성 코드를 복구했습니다.');
  }, 'lab-undo'));
}

function refreshDraftDependentUi(exercise) {
  refreshEditorCounter(exercise);
  renderAchievements();
  renderProgress();
  renderSidebar();
  renderExecution(exercise);
}

function localRuntimes(exercise) {
  const minimum = Number(state.projectInfo.get(exercise?.id)?.runtimeRequirements?.minimumJava || exercise?.minVersion || 8);
  return (state.runtime?.runtimes || []).filter((runtime) => runtime.available && VERSIONS.includes(Number(runtime.javaVersion)) && Number(runtime.javaVersion) >= minimum).sort((a, b) => b.javaVersion - a.javaVersion);
}

function hasBundledRuntime() {
  return Boolean(state.runtime?.bundledRuntime || state.runtime?.runtimes?.some((runtime) => runtime.source === 'bundled') || state.runtime?.maven?.source === 'bundled');
}

function runtimeSourceLabel(tool) {
  return tool?.source === 'bundled' ? '앱에 포함' : tool?.available ? '직접 등록' : '등록하지 않음';
}

function runtimeFor(exercise) {
  if (!isDesktop) return 21;
  const available = localRuntimes(exercise);
  return available.some((runtime) => Number(runtime.javaVersion) === state.runtimeVersion) ? state.runtimeVersion : Number(available[0]?.javaVersion) || null;
}

function environmentKey(version) {
  const runtime = state.runtime?.runtimes?.find((item) => Number(item.javaVersion) === version && item.available);
  return JSON.stringify([version, runtime?.path || '', state.runtime?.maven?.path || '', state.runtime?.maven?.version || '']);
}

function projectPrepared(exercise) {
  const version = runtimeFor(exercise);
  const key = environmentKey(version);
  return (state.runtime?.preparedProjects || []).some((item) => item.exerciseId === exercise.id && JSON.stringify([Number(item.runtimeVersion), item.jdkPath || '', item.mavenPath || '', item.mavenVersion || '']) === key);
}

function executionBlockReason(exercise, action = 'run') {
  if (isProject(exercise) && !isDesktop) return '프로젝트 실행은 Windows 앱에서 지원합니다';
  if (state.cancelling) return '이전 실행의 취소를 확인하고 있습니다';
  if (state.settingsBusy) return '실행 설정을 확인하고 있습니다';
  if (state.runtimeStatus === 'checking') return '실행 환경 확인 중';
  if (isDesktop) {
    if (!state.runtime?.consent?.accepted) return '앱 설정에서 로컬 코드 실행에 동의해 주세요';
    if (!runtimeFor(exercise)) return `앱 설정에서 Java ${exercise.minVersion} 이상의 JDK를 등록해 주세요`;
    if (state.runtimeStatus !== 'ready') return state.runtimeMessage || '로컬 실행 환경을 다시 확인해 주세요';
    if (isProject(exercise)) {
      if (!state.runtime.maven?.available) return '앱 설정에서 Maven 3.9 이상을 등록해 주세요';
      const project = state.projectInfo.get(exercise.id);
      if (project?.status !== 'ready') return project?.message || '프로젝트 파일을 확인하고 있습니다';
      if (action !== 'prepare' && !projectPrepared(exercise)) return '선택한 JDK로 환경 준비를 먼저 완료해 주세요';
    }
    return '';
  }
  return state.runtimeStatus === 'ready' && state.runtime?.supportedTargets?.includes(Number(exercise.minVersion)) ? '' : '실행 연결을 확인해 주세요';
}

function renderRuntime() {
  const card = document.getElementById('runtime-info');
  if (!card) return;
  const exercise = exerciseFor(currentLesson());
  card.replaceChildren();
  card.classList.toggle('is-unavailable', state.runtimeStatus === 'unavailable' || (isProject(exercise) && !isDesktop));
  const line = el('div', 'runtime-line');
  const runtimeVersion = runtimeFor(exercise);
  line.append(el('strong', '', isProject(exercise) && !isDesktop ? '실행 위치 · Windows 앱' : runtimeVersion ? `실제 실행 JVM · Java ${runtimeVersion}` : '실제 실행 JVM · JDK 등록 필요'), el('span', '', `컴파일 대상 · Java ${exercise?.minVersion || 8}`));
  card.append(line);
  if (isProject(exercise) && !isDesktop) {
    card.append(el('p', '', '웹에서 이론·문제·다중 파일 코드를 학습하고, Windows 앱에 포함된 Java 21과 Maven으로 테스트를 실행하세요. 웹과 앱의 학습 기록은 각각 저장됩니다.'));
    const actions = el('div', 'project-access-actions');
    actions.append(actionButton('Windows 앱 안내', 'button button-secondary', () => openDialog('install-dialog'), 'project-desktop-guide'));
    if (/^\/downloads\/[a-z0-9-]+\.zip$/.test(exercise.downloadUrl || '')) {
      const download = el('a', 'button button-secondary', '프로젝트 ZIP 다운로드');
      download.id = 'project-download'; download.href = exercise.downloadUrl; download.download = '';
      actions.append(download);
    }
    card.append(actions);
    return;
  }
  if (isDesktop) {
    const row = el('div', 'runtime-controls');
    const label = el('label', '', '실제 실행 JDK'); label.htmlFor = 'runtime-version-select';
    const select = el('select'); select.id = 'runtime-version-select'; select.dataset.testid = select.id;
    const available = localRuntimes(exercise);
    if (!available.length) select.append(el('option', '', '등록된 호환 JDK 없음'));
    available.forEach((runtime) => { const option = el('option', '', `Java ${runtime.javaVersion}${runtime.source ? ` · ${runtimeSourceLabel(runtime)}` : ''}`); option.value = String(runtime.javaVersion); select.append(option); });
    select.value = String(runtimeVersion || '');
    select.disabled = !available.length || Boolean(state.pending) || state.cancelling || state.settingsBusy;
    select.addEventListener('change', () => {
      cancelPending('실행 JDK 변경', false);
      state.runtimeVersion = Number(select.value);
      renderRuntime(); updateLabControls();
      document.getElementById('runtime-version-select')?.focus({ preventScroll: true });
      announce(`실제 실행 JDK를 Java ${state.runtimeVersion}로 변경했습니다. 프로젝트 준비 상태를 확인하세요.`);
    });
    const needsConsent = !state.runtime?.consent?.accepted;
    const selectedRuntime = available.find((runtime) => Number(runtime.javaVersion) === runtimeVersion);
    row.append(label, select, actionButton(needsConsent ? '실행 권한 확인' : '실행 설정', `button ${needsConsent ? 'button-primary' : 'button-secondary'}`, openDesktopSettings, 'runtime-settings-open'));
    card.append(row, el('p', '', state.runtimeMessage || (selectedRuntime?.source === 'bundled' ? '앱에 포함된 JDK를 사용합니다. 컴파일 대상과 실제 실행 JVM은 위에 따로 표시됩니다.' : '이 PC의 등록 JDK로 실행합니다. 학습 기준 버전·컴파일 대상·실제 실행 JVM을 따로 확인하세요.')));
    if (isProject(exercise)) {
      const project = state.projectInfo.get(exercise.id);
      const preparation = el('p', 'project-preparation', projectPrepared(exercise) ? '환경 준비 완료 · 현재 JDK와 Maven으로 테스트할 수 있습니다.' : '처음 환경 준비에는 인터넷 연결이 필요합니다. 고정 기준 답안으로 Maven 라이브러리를 자동으로 내려받고 환경을 검증합니다. 이후 학습자 테스트는 저장된 라이브러리로 실행합니다.');
      preparation.id = 'project-preparation-state'; preparation.dataset.prepared = String(projectPrepared(exercise));
      card.append(preparation);
      if (project?.status === 'error') card.append(el('p', '', project.message), actionButton('프로젝트 다시 확인', 'runtime-retry', () => loadProject(exercise, true), 'project-retry'));
      for (const service of project?.runtimeRequirements?.services || []) card.append(el('p', 'project-service', `${service.label || service.type}: 학습용 ${service.host}:${service.port}가 필요합니다. 포트 확인 후 실제 통합 테스트로 검증합니다.`));
    }
    if (state.runtimeStatus === 'unavailable') card.append(actionButton('설정 다시 확인', 'runtime-retry', loadRuntime, 'runtime-retry'));
    return;
  }
  if (state.runtimeStatus === 'checking') {
    card.append(el('p', '', 'Wandbox 실행 환경의 연결 상태를 확인하고 있습니다.'));
  } else if (state.runtimeStatus === 'unavailable') {
    card.append(el('p', '', state.runtimeMessage || '실행 서버에 연결할 수 없습니다. 수업·문제·코드 작성은 계속 이용할 수 있습니다.'), actionButton('연결 다시 확인', 'runtime-retry', loadRuntime, 'runtime-retry'));
  } else {
    card.append(el('p', '', `Wandbox · 이 실습은 --release ${exercise?.minVersion || 8}로 컴파일하고 Java ${runtimeVersion} JVM에서 실행합니다. 학습 기준 버전과 실제 실행 JVM은 구분됩니다.`));
    if (state.runtime?.notice) card.append(el('p', '', state.runtime.notice));
  }
}

function updateLabControls() {
  const exercise = exerciseFor(currentLesson());
  const run = document.getElementById('run-code');
  const submit = document.getElementById('submit-code');
  const cancel = document.getElementById('cancel-execution');
  const status = document.getElementById('execution-state');
  if (!run || !submit || !cancel || !status || !exercise) return;
  const busy = Boolean(state.pending);
  const reason = executionBlockReason(exercise);
  run.disabled = busy || Boolean(reason);
  submit.disabled = busy || Boolean(reason);
  run.dataset.blocked = reason ? 'true' : 'false'; submit.dataset.blocked = run.dataset.blocked;
  const prepare = document.getElementById('prepare-project');
  if (prepare) { prepare.disabled = busy || Boolean(executionBlockReason(exercise, 'prepare')); prepare.dataset.prepared = String(projectPrepared(exercise)); }
  const runtimeSelect = document.getElementById('runtime-version-select');
  if (runtimeSelect) runtimeSelect.disabled = busy || state.cancelling || state.settingsBusy || !localRuntimes(exercise).length;
  cancel.hidden = !busy || state.pending.exerciseId !== exercise.id;
  status.textContent = busy ? state.pending.action === 'prepare' ? 'Maven 환경 준비 중 · 처음에는 수 분 걸릴 수 있습니다' : '실제 Java 컴파일·실행 중…' : reason || (isDesktop ? '이 PC에서 명시적으로 실행합니다' : '코드는 버튼을 누를 때 전송됩니다');
  document.getElementById('execution-output')?.setAttribute('aria-busy', String(busy));
}

function acceptRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object' || !Array.isArray(runtime.supportedTargets)) throw new Error('실행 환경 응답을 확인할 수 없습니다.');
  if (isDesktop && (runtime.mode !== 'local' || !Array.isArray(runtime.runtimes))) throw new Error('로컬 실행 환경 응답을 확인할 수 없습니다.');
  state.runtime = { ...runtime, supportedTargets: runtime.supportedTargets.map(Number).filter((version) => VERSIONS.includes(version)) };
  const available = runtime.available === true && (isDesktop || Number(runtime.runtime?.javaVersion) === 21);
  state.runtimeStatus = available ? 'ready' : 'unavailable';
  const reasons = { execution_consent_required: '실행 도구를 사용하려면 실행 권한을 확인하고 동의해 주세요.', jdk_required: '실행 설정에서 사용할 JDK를 등록해 주세요.' };
  state.runtimeMessage = available ? '' : Object.hasOwn(reasons, runtime.reason) ? reasons[runtime.reason] : typeof runtime.reason === 'string' ? runtime.reason : typeof runtime.notice === 'string' ? runtime.notice : '실행 환경 설정을 확인해 주세요.';
}

async function loadRuntime() {
  const sequence = ++runtimeSequence;
  state.runtimeStatus = 'checking';
  renderRuntime();
  updateLabControls();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('/api/runtime', { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Runtime unavailable');
    const runtime = await response.json();
    if (sequence !== runtimeSequence) return;
    acceptRuntime(runtime);
  } catch {
    if (sequence !== runtimeSequence) return;
    state.runtimeStatus = 'unavailable';
    state.runtimeMessage = isDesktop ? '로컬 실행 환경을 읽지 못했습니다. 설정을 다시 확인해 주세요.' : '실행 서버에 연결하지 못했습니다. 수업·문제·코드 작성은 계속 이용할 수 있습니다.';
  } finally {
    clearTimeout(timer);
    if (sequence === runtimeSequence) { renderRuntime(); updateLabControls(); renderDesktopSettings(); }
  }
}

async function loadProject(exercise, retry = false) {
  if (!isDesktop || !isProject(exercise)) return;
  if (!retry && state.projectInfo.has(exercise.id)) return;
  const marker = { status: 'loading' };
  state.projectInfo.set(exercise.id, marker);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`/api/local/projects/${encodeURIComponent(exercise.id)}`, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    const payload = await response.json();
    if (state.projectInfo.get(exercise.id) !== marker) return;
    if (!response.ok) throw new Error(payload.error?.message || '프로젝트 파일을 읽지 못했습니다.');
    const files = payload.files;
    if (payload.exerciseId !== exercise.id || !Array.isArray(files) || files.length !== exercise.files.length || !files.every((file) => typeof file.path === 'string' && typeof file.source === 'string' && typeof file.editable === 'boolean' && exercise.files.some((expected) => expected.path === file.path && expected.editable === file.editable)) || new Set(files.map((file) => file.path)).size !== files.length) throw new Error('교재와 실행기의 파일 목록이 다릅니다. 앱의 교재 버전을 확인해 주세요.');
    const changed = files.some((file) => exercise.files.find((item) => item.path === file.path)?.source !== file.source);
    state.projectInfo.set(exercise.id, { status: 'ready', files, runtimeRequirements: payload.runtimeRequirements });
    if (changed && currentLesson()?.id === exercise.lessonId && state.step === 'lab') renderEditorFile(exercise);
  } catch (error) {
    if (state.projectInfo.get(exercise.id) === marker) state.projectInfo.set(exercise.id, { status: 'error', message: error instanceof Error ? error.message : '프로젝트 파일을 읽지 못했습니다.' });
  } finally {
    clearTimeout(timer);
    if (currentLesson()?.id === exercise.lessonId && state.step === 'lab') { renderRuntime(); updateLabControls(); }
  }
}

function renderDesktopSettings() {
  const body = document.getElementById('desktop-settings-body');
  if (!isDesktop || !body) return;
  const bundled = hasBundledRuntime();
  const externalTools = state.runtime?.runtimes?.some((runtime) => runtime.available && runtime.source !== 'bundled') || (state.runtime?.maven?.available && state.runtime.maven.source !== 'bundled');
  const advancedOpen = document.getElementById('desktop-advanced-settings')?.open ?? Boolean(externalTools);
  const description = document.getElementById('desktop-settings-description');
  if (description) description.textContent = !state.runtime ? '실행 도구를 확인하고 있습니다. 코드는 실행·제출 버튼을 눌렀을 때 실행됩니다.' : bundled ? '앱에 포함된 도구로 시작하세요. 동의 후 실행·제출 버튼을 누르면 코드를 실행합니다.' : '설치된 JDK와 Maven의 폴더를 선택하세요. 시스템 PATH를 바꾸지 않으며, 코드는 실행·제출 버튼을 눌렀을 때 실행됩니다.';
  body.replaceChildren();
  if (bundled) {
    const jdk = state.runtime.runtimes.find((runtime) => Number(runtime.javaVersion) === 21);
    const maven = state.runtime.maven;
    const ready = jdk?.available && maven?.available;
    const included = ready && jdk.source === 'bundled' && maven.source === 'bundled';
    const card = el('section', `settings-bundle${ready ? '' : ' is-unavailable'}`);
    card.id = 'desktop-bundle-status'; card.setAttribute('aria-labelledby', 'desktop-bundle-title');
    const heading = el('h3', '', included ? '별도 설치 없이 시작하세요' : ready ? '사용 중인 실행 도구' : '실행 도구를 확인해 주세요');
    heading.id = 'desktop-bundle-title';
    const tools = el('ul', 'settings-bundle-tools');
    for (const [name, tool] of [['Java 21', jdk], [`Maven${maven?.version ? ` ${maven.version}` : ''}`, maven]]) {
      const item = el('li'); item.append(el('strong', '', name), el('span', '', runtimeSourceLabel(tool))); tools.append(item);
    }
    card.append(heading, tools, el('p', '', included ? 'Java 8·11·17·21 대상의 코드를 컴파일할 수 있습니다. 기본 실제 실행 JVM은 Java 21입니다.' : '직접 등록한 도구가 있으면 해당 설정을 유지합니다. 사용할 JDK와 Maven은 아래 고급 설정에서 확인할 수 있습니다.'), el('p', '', 'Spring 등 실무 수업은 처음 환경 준비 시 인터넷으로 필요한 라이브러리를 자동 다운로드합니다.'));
    body.append(card);
  }
  const tools = el('div', 'settings-tools');
  for (const version of VERSIONS) {
    const runtime = state.runtime?.runtimes?.find((item) => Number(item.javaVersion) === version);
    const row = el('div', 'settings-tool-row');
    const copy = el('div');
    copy.append(el('strong', '', `JDK ${version}${bundled && !runtime?.available ? ' · 선택 사항' : ''}`));
    if (runtime?.source) copy.append(el('p', 'settings-tool-source', runtimeSourceLabel(runtime)));
    copy.append(el('p', 'settings-tool-path', runtime?.available ? runtime.path || '등록됨' : '등록하지 않음'));
    const button = actionButton(runtime?.source === 'bundled' ? '다른 폴더 선택' : runtime?.available ? '변경' : '폴더 선택', 'button button-secondary', () => changeDesktopSettings(() => desktop.chooseJdk(version)), `jdk-register-${version}`);
    button.setAttribute('aria-label', `JDK ${version} 설치 폴더 선택`); button.disabled = state.settingsBusy;
    row.append(copy, button); tools.append(row);
  }
  const row = el('div', 'settings-tool-row');
  const copy = el('div');
  copy.append(el('strong', '', `Maven${state.runtime?.maven?.version ? ` ${state.runtime.maven.version}` : ' 3.9+'}`));
  if (state.runtime?.maven?.source) copy.append(el('p', 'settings-tool-source', runtimeSourceLabel(state.runtime.maven)));
  copy.append(el('p', 'settings-tool-path', state.runtime?.maven?.available ? state.runtime.maven.path || '등록됨' : '등록하지 않음'));
  const maven = actionButton(state.runtime?.maven?.source === 'bundled' ? '다른 폴더 선택' : state.runtime?.maven?.available ? '변경' : '폴더 선택', 'button button-secondary', () => changeDesktopSettings(() => desktop.chooseMaven()), 'maven-register');
  maven.setAttribute('aria-label', 'Maven 설치 폴더 선택'); maven.disabled = state.settingsBusy;
  row.append(copy, maven); tools.append(row);
  if (!bundled) body.append(tools);
  const consent = el('div', 'settings-consent');
  consent.append(el('h3', '', '이 PC에서 코드 실행'), el('p', '', 'Java 코드는 현재 PC의 사용자 권한으로 파일과 네트워크에 접근할 수 있습니다. 이 앱은 격리된 보안 샌드박스가 아닙니다. 신뢰하는 코드를 직접 확인한 뒤 실행하세요.'));
  const label = el('label');
  const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.id = 'execution-consent';
  checkbox.checked = state.runtime?.consent?.accepted === true;
  checkbox.disabled = state.settingsBusy;
  checkbox.addEventListener('change', () => changeDesktopSettings(() => desktop.setExecutionConsent(checkbox.checked)));
  label.append(checkbox, el('span', '', '위 실행 권한을 이해했으며 로컬 코드 실행에 동의합니다.'));
  consent.append(label); body.append(consent);
  const status = el('p', 'settings-status', state.settingsBusy ? '설정을 확인하고 있습니다…' : state.settingsMessage);
  status.id = 'desktop-settings-status'; status.setAttribute('role', 'status'); body.append(status);
  if (bundled) {
    const advanced = el('details', 'settings-advanced'); advanced.id = 'desktop-advanced-settings'; advanced.open = advancedOpen;
    const summary = el('summary', '', '고급 설정 · 다른 JDK 또는 Maven 사용'); summary.id = 'desktop-advanced-summary';
    advanced.append(summary, el('p', '', '실제 Java 8·11·17 JVM을 비교하거나 다른 도구를 사용할 때만 직접 등록하세요. 기본 학습에는 추가 설치와 폴더 선택이 필요하지 않습니다.'), tools);
    body.append(advanced);
  }
}

async function changeDesktopSettings(operation, mutation = true) {
  if (!isDesktop || state.settingsBusy) return;
  const focusId = document.activeElement?.id;
  if (mutation) cancelPending('실행 설정 변경', false);
  state.settingsBusy = true; state.settingsMessage = '';
  renderDesktopSettings(); updateLabControls();
  const sequence = ++runtimeSequence;
  try {
    const runtime = await operation();
    if (sequence !== runtimeSequence) return;
    acceptRuntime(runtime);
    state.settingsMessage = mutation ? '실행 설정을 확인했습니다.' : '';
  } catch (error) {
    state.settingsMessage = error instanceof Error ? error.message : '실행 설정을 저장하지 못했습니다.';
  } finally {
    state.settingsBusy = false;
    renderDesktopSettings(); renderRuntime(); updateLabControls();
    if (document.getElementById('desktop-settings-dialog').open && focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }
}

function openDesktopSettings() {
  if (!isDesktop) return;
  renderDesktopSettings();
  openDialog('desktop-settings-dialog');
  void changeDesktopSettings(() => desktop.getSettings(), false);
}

function renderExecution(exercise) {
  const panel = document.getElementById('execution-output');
  if (!panel) return;
  panel.replaceChildren();
  const pending = state.pending?.exerciseId === exercise.id ? state.pending : null;
  const result = state.labResults.get(exercise.id);
  const outdated = Boolean(result && result.action !== 'prepare' && result.sourceSnapshot !== sourceSnapshot(exercise));
  panel.dataset.status = pending ? 'running' : outdated ? 'outdated' : result?.status || 'idle';
  panel.setAttribute('aria-busy', String(Boolean(pending)));
  const heading = el('div', 'execution-panel-heading');
  const title = el('strong'); title.append(icon('terminal'), document.createTextNode('실제 실행 결과'));
  const metadata = result && result.runtimeVersion ? `Java ${result.runtimeVersion} · 컴파일 대상 ${result.targetVersion}` : isDesktop ? '이 PC의 JDK' : isProject(exercise) ? 'Windows 앱에서 실행' : 'Wandbox / Java 21';
  heading.append(title, el('span', '', metadata));
  const body = el('div', 'execution-output-body');
  if (pending) {
    body.append(el('p', 'execution-placeholder', pending.action === 'prepare' ? '고정 기준 답안으로 Maven 의존성을 내려받고 실행 환경을 검증합니다. 처음에는 수 분 걸릴 수 있습니다. 이 단계는 작성 코드의 제출 통과로 기록하지 않습니다.' : '작성 코드를 컴파일하고 실제 JVM에서 실행하고 있습니다. 결과가 도착하면 여기에 표시됩니다.'));
    if (pending.action !== 'prepare' && pending.source !== sourceSnapshot(exercise)) body.append(el('p', 'execution-warning', '요청 후 코드가 변경되었습니다. 도착하는 결과는 요청 당시 코드의 결과이며 현재 코드의 완료 기록에 반영하지 않습니다.'));
  } else if (!result) {
    body.append(el('p', 'execution-placeholder', isProject(exercise) ? '아직 실행하지 않았습니다. Windows 앱에서 환경 준비 후 프로젝트 전체 테스트를 실행하세요. 제출 통과와 객관식 성취를 모두 마치면 수업 완료입니다.' : '아직 실행하지 않았습니다. 예시 실행으로 공개 사례를 확인하고, 제출로 전체 테스트를 검증하세요. 예상 출력은 실제 실행 결과로 사용하지 않습니다.'));
  } else {
    if (outdated) body.append(el('p', 'execution-warning', '요청 후 코드가 변경되었습니다. 현재 코드의 실행 결과가 아닙니다. 현재 코드를 다시 실행·제출해 주세요.'));
    const labels = {
      passed: result.action === 'prepare' ? '환경 준비 완료' : result.action === 'submit' ? '제출 테스트 통과' : isProject(exercise) ? '프로젝트 테스트 통과' : '공개 예시 실행 통과',
      failed: '검증 조건을 충족하지 못했습니다',
      compile_error: '컴파일 오류', runtime_error: '실행 중 오류', timeout: '실행 시간 초과',
      provider_error: '실행 요청을 완료하지 못했습니다', cancelled: isDesktop ? '실행 취소 요청' : '응답 대기를 취소했습니다', validation_error: '실행할 코드의 크기를 확인해 주세요',
    };
    const isError = !['passed', 'cancelled'].includes(result.status);
    body.append(el('p', `execution-result-label${isError ? ' is-error' : ''}`, labels[result.status] || '실행 결과 확인 필요'));
    if (result.message) body.append(el('p', 'inline-note', result.message));
    if (Array.isArray(result.checks) && result.checks.length) {
      const checks = el('ul', 'execution-checks');
      result.checks.forEach((check) => {
        const item = el('li', check.passed ? '' : 'is-failed');
        item.append(el('span', 'check-symbol', check.passed ? '✓' : '×'), el('span', '', check.name));
        checks.append(item);
      });
      body.append(checks);
      body.append(el('p', 'inline-note', `${result.passed} / ${result.total} 검증 통과`));
    }
    for (const [name, text, error] of [
      ['표준 출력 (stdout)', result.stdout, false],
      ['표준 오류 (stderr)', result.stderr, true],
      ['컴파일러 메시지', result.compilerOutput, result.status === 'compile_error'],
    ]) {
      if (!text) continue;
      const section = el('div', `output-section${error ? ' is-error' : ''}`);
      const pre = el('pre', '', text);
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', name);
      section.append(el('h4', '', name), pre);
      body.append(section);
    }
    if (result.action === 'run' && result.status === 'passed') body.append(el('p', 'inline-note', '실행만으로 수업 완료를 기록하지 않습니다. 현재 코드의 성취를 기록하려면 제출하세요.'));
    if (result.action === 'prepare') body.append(el('p', 'inline-note', '환경 준비는 기준 답안의 결과입니다. 작성 코드의 테스트 통과·수업 완료와 별도로 표시합니다.'));
    if (result.action === 'submit' && result.status === 'passed' && !outdated) body.append(el('p', 'inline-note', '현재 코드의 테스트 통과를 기록했습니다. 설계 판단과 설명은 실무 탭에서 직접 점검하세요.'));
    if (Number.isFinite(result.durationMs)) body.append(el('p', 'execution-timing', `${result.provider || 'Wandbox'} · 응답 시간 ${(result.durationMs / 1000).toFixed(2)}초`));
  }
  panel.append(heading, body);
}

function cancelPending(reason = 'user', update = true) {
  const pending = state.pending;
  if (!pending) return;
  state.pending = null;
  clearTimeout(pending.timer);
  pending.controller.abort();
  if (reason === 'user') {
    state.labResults.set(pending.exerciseId, {
      status: 'cancelled', action: pending.action, sourceSnapshot: pending.source,
      message: isDesktop ? '로컬 실행의 취소를 요청하고 있습니다.' : '브라우저의 응답 대기를 중단했습니다. 외부 서비스에서 이미 시작한 실행이 종료되었다는 의미는 아닙니다.',
    });
    announce(isDesktop ? '로컬 실행의 취소를 요청했습니다.' : '응답 대기를 취소했습니다. 외부 실행의 종료를 보장하지 않습니다.');
  }
  if (isDesktop) void cancelLocalRequest(pending, reason === 'user');
  if (update) {
    const exercise = exerciseFor(currentLesson());
    if (exercise) renderExecution(exercise);
    updateLabControls();
  }
}

async function cancelLocalRequest(request, showResult = false) {
  if (!isDesktop) return;
  state.cancelling = true;
  updateLabControls();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  let message;
  try {
    const response = await fetch('/api/local/cancel', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ requestId: request.id }) });
    const payload = await response.json();
    if (!response.ok || typeof payload.cancelled !== 'boolean') throw new Error('취소 응답을 확인하지 못했습니다.');
    message = payload.cancelled ? '로컬 실행기에 취소가 반영되었습니다.' : '취소할 실행이 없습니다. 요청이 이미 종료되었을 수 있습니다.';
  } catch {
    message = '로컬 실행의 취소 여부를 확인하지 못했습니다. 앱의 실행 상태를 다시 확인해 주세요.';
    toast(message);
  } finally {
    clearTimeout(timer);
    state.cancelling = false;
    if (showResult && state.labResults.get(request.exerciseId)?.status === 'cancelled') state.labResults.get(request.exerciseId).message = message;
    const current = exerciseFor(currentLesson());
    if (current) renderExecution(current);
    updateLabControls();
  }
}

function executionResult(payload, request, exercise) {
  if (!payload || typeof payload !== 'object' || payload.requestId !== request.id || !EXECUTION_STATUSES.has(payload.status)) throw new Error('실행 서버의 응답 형식을 확인할 수 없습니다. 다시 시도해 주세요.');
  if (Number(payload.runtimeVersion) !== request.runtimeVersion || Number(payload.targetVersion) !== Number(exercise.minVersion)) throw new Error('응답의 실행 환경이 이 실습의 계약과 일치하지 않습니다. 완료 기록에 반영하지 않았습니다.');
  if (request.action === 'prepare' && payload.status === 'passed' && payload.prepared !== true) throw new Error('환경 준비 성공을 확인하지 못했습니다. 다시 준비해 주세요.');
  const checks = Array.isArray(payload.checks) ? payload.checks.filter((check) => check && typeof check.name === 'string' && typeof check.passed === 'boolean').map((check) => ({ name: check.name, passed: check.passed })) : [];
  const total = Number(payload.total);
  const passed = Number(payload.passed);
  if (payload.status === 'passed' && (!Number.isInteger(total) || total <= 0 || passed !== total || checks.length !== total || checks.some((check) => !check.passed))) throw new Error('통과 결과의 검증 항목이 일치하지 않습니다. 완료 기록에 반영하지 않았습니다.');
  return {
    status: payload.status, action: request.action, sourceSnapshot: request.source,
    runtimeVersion: Number(payload.runtimeVersion), targetVersion: Number(payload.targetVersion),
    stdout: typeof payload.stdout === 'string' ? payload.stdout : '',
    stderr: typeof payload.stderr === 'string' ? payload.stderr : '',
    compilerOutput: typeof payload.compilerOutput === 'string' ? payload.compilerOutput : '',
    message: typeof payload.error?.message === 'string' ? payload.error.message : '',
    checks, passed: Number.isFinite(passed) ? passed : 0, total: Number.isFinite(total) ? total : checks.length,
    provider: typeof payload.provider === 'string' ? payload.provider : isDesktop ? 'Local JDK' : 'Wandbox',
    durationMs: Number.isFinite(payload.durationMs) ? payload.durationMs : undefined,
  };
}

async function executeCode(exercise, action) {
  if (state.pending || executionBlockReason(exercise, action)) return;
  if (action === 'prepare' && (!isDesktop || !isProject(exercise))) return;
  const source = sourceSnapshot(exercise);
  const files = isProject(exercise) ? sourcesFor(exercise) : null;
  if (action !== 'prepare' && (files ? Object.values(files).some((value) => !value.trim()) : !source.trim())) {
    toast('실행할 Java 코드를 입력해 주세요.');
    activeEditor?.focus();
    return;
  }
  saveStorage();
  const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `request_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const runtimeVersion = runtimeFor(exercise);
  const body = { exerciseId: exercise.id, requestId: id };
  if (isDesktop) body.runtimeVersion = runtimeVersion;
  if (action !== 'prepare') { body.action = action; if (files) body.files = files; else body.source = source; }
  const requestBody = JSON.stringify(body);
  let sizeMessage = '';
  if (action !== 'prepare') {
    if (files) {
      const oversized = Object.entries(files).find(([, value]) => utf8Size(value) > 64 * 1024);
      if (oversized) sizeMessage = `${oversized[0]} 파일이 UTF-8 64 KiB를 초과합니다.`;
      else if (Object.values(files).reduce((sum, value) => sum + utf8Size(value), 0) > 256 * 1024) sizeMessage = '편집 파일 전체가 UTF-8 256 KiB를 초과합니다.';
    } else if (isDesktop && utf8Size(source) > 32 * 1024) sizeMessage = 'Java 소스가 UTF-8 32 KiB를 초과합니다.';
    if (!sizeMessage && utf8Size(requestBody) > (isDesktop ? 384 : 32) * 1024) sizeMessage = `요청 전체가 UTF-8 ${isDesktop ? 384 : 32} KiB를 초과합니다.`;
  }
  if (sizeMessage) {
    state.labResults.set(exercise.id, {
      status: 'validation_error', action, sourceSnapshot: source,
      message: `${sizeMessage} 코드를 줄여 다시 시도해 주세요. 한글은 여러 바이트를 사용하며 작성 코드는 유지됩니다.`,
    });
    renderExecution(exercise);
    announce(sizeMessage);
    return;
  }
  const controller = new AbortController();
  const request = { id, source, action, runtimeVersion, environment: environmentKey(runtimeVersion), exerciseId: exercise.id, lessonId: state.lessonId, version: state.version, controller, timedOut: false, timer: null };
  const timeoutMs = isDesktop ? action === 'prepare' ? 360000 : isProject(exercise) ? 180000 : 60000 : 60000;
  request.timer = window.setTimeout(() => { request.timedOut = true; controller.abort(); if (isDesktop) void cancelLocalRequest(request); }, timeoutMs);
  state.pending = request;
  state.labResults.delete(exercise.id);
  updateLabControls();
  renderExecution(exercise);
  announce(action === 'prepare' ? '기준 답안으로 실행 환경을 준비합니다.' : action === 'submit' ? '코드를 제출해 전체 테스트를 검증합니다.' : '실제 Java 환경에서 코드를 실행합니다.');
  try {
    const response = await fetch(action === 'prepare' ? '/api/local/prepare' : '/api/execute', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: requestBody,
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('실행 서버가 읽을 수 없는 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.'); }
    if (state.pending !== request) return;
    if (!response.ok && (!EXECUTION_STATUSES.has(payload.status) || payload.status === 'passed')) {
      throw new Error(typeof payload.error?.message === 'string' ? payload.error.message : `실행 요청을 처리하지 못했습니다. (HTTP ${response.status})`);
    }
    const result = executionResult(payload, request, exercise);
    state.labResults.set(exercise.id, result);
    const fresh = request.source === sourceSnapshot(exercise) && request.lessonId === state.lessonId && request.version === state.version && (!isDesktop || request.environment === environmentKey(runtimeFor(exercise)));
    if (result.status === 'passed' && action === 'submit' && fresh) {
      state.labPassed.set(exercise.id, request.source);
      saveStorage();
      renderAchievements();
      renderSidebar();
      renderProgress();
    } else if (action === 'submit' && fresh && ['failed', 'compile_error', 'runtime_error', 'timeout'].includes(result.status)) {
      state.labPassed.delete(exercise.id);
      saveStorage();
      renderAchievements();
      renderSidebar();
      renderProgress();
    }
    announce(action === 'prepare' ? result.status === 'passed' ? '실행 환경 준비를 완료했습니다. 작성 코드를 제출해 주세요.' : '실행 환경 준비 결과를 확인해 주세요.' : !fresh ? '요청 당시 코드의 결과가 도착했습니다. 현재 코드를 다시 제출해 주세요.' : result.status === 'passed' ? action === 'submit' ? '제출한 코드가 전체 테스트를 통과했습니다.' : '코드 실행을 통과했습니다.' : '실행 결과를 확인해 주세요.');
  } catch (error) {
    if (state.pending !== request) return;
    state.labResults.set(exercise.id, {
      status: request.timedOut ? 'timeout' : 'provider_error', action, sourceSnapshot: source,
      message: request.timedOut ? isDesktop ? '응답 대기 시간을 초과해 로컬 실행 취소를 요청했습니다. 실행 상태를 확인한 뒤 다시 시도해 주세요.' : '60초 안에 응답을 받지 못했습니다. 외부 실행이 계속 중일 수 있습니다. 잠시 후 다시 시도해 주세요.' : error instanceof Error ? error.message : '실행 서비스에 연결할 수 없습니다.',
    });
    announce(request.timedOut ? '실행 응답 대기 시간이 초과되었습니다.' : '실행 요청을 완료하지 못했습니다. 오류 안내를 확인해 주세요.');
  } finally {
    clearTimeout(request.timer);
    if (state.pending === request) {
      state.pending = null;
      renderExecution(exercise);
      updateLabControls();
      if (isDesktop) void loadRuntime();
    }
  }
}

function revealStepTab(step) {
  const tab = document.getElementById(`tab-${step}`);
  const tabs = tab?.parentElement;
  if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;
  const bounds = tabs.getBoundingClientRect();
  const selected = tab.getBoundingClientRect();
  // Keep the tab and its focus ring inside the strip without moving the page.
  const left = bounds.left + tabs.clientLeft + 8;
  const right = bounds.left + tabs.clientLeft + tabs.clientWidth - 8;
  if (selected.left < left) tabs.scrollLeft += selected.left - left;
  else if (selected.right > right) tabs.scrollLeft += selected.right - right;
}

function selectStep(step, focus = false) {
  if (!STEPS.includes(step) || !currentLesson()) return;
  if (state.step === 'lab' && step !== 'lab') cancelPending('단계 변경', false);
  saveStorage();
  state.step = step;
  syncHash('push');
  renderLesson();
  updateStorageIndicator();
  if (focus) {
    document.getElementById(`tab-${step}`)?.focus({ preventScroll: true });
    dom['lesson-panel'].scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
}

function selectLesson(id, step = 'theory', focus = false) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson || lesson.minVersion > state.version) return;
  cancelPending('수업 변경', false);
  state.lessonId = id;
  state.step = STEPS.includes(step) ? step : 'theory';
  closeMenu(false);
  saveStorage();
  syncHash('push');
  renderAll();
  if (focus) {
    dom['lesson-title'].focus({ preventScroll: true });
    dom['lesson-card'].scrollIntoView({ block: 'start', behavior: 'auto' });
  }
}

function applyFilters() {
  ensureSelection();
  saveStorage();
  syncHash();
  renderAll();
  announce(`${visibleLessons().length}개 수업을 표시합니다. 현재 조건에서 ${visibleLessons().filter(lessonComplete).length}개 완료했습니다.`);
}

function setBackgroundInert(value) {
  for (const node of [document.getElementById('site-header'), document.getElementById('intro'), dom['lesson-card'], dom['reference-column'], document.querySelector('.workspace-heading'), document.querySelector('.site-footer')]) {
    if (node) node.inert = value;
  }
}

function openMenu() {
  if (!mobileMedia.matches || dom['workspace-grid'].hidden) return;
  state.menuOpen = true;
  dom['curriculum-sidebar'].classList.add('is-open');
  dom['curriculum-sidebar'].setAttribute('role', 'dialog');
  dom['curriculum-sidebar'].setAttribute('aria-modal', 'true');
  dom['curriculum-sidebar'].removeAttribute('aria-hidden');
  dom['drawer-backdrop'].hidden = false;
  dom['mobile-menu-toggle'].setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
  setBackgroundInert(true);
  document.getElementById('mobile-menu-close').focus();
}

function closeMenu(restoreFocus = true) {
  const wasOpen = state.menuOpen;
  state.menuOpen = false;
  dom['curriculum-sidebar'].classList.remove('is-open');
  dom['curriculum-sidebar'].removeAttribute('role');
  dom['curriculum-sidebar'].removeAttribute('aria-modal');
  if (mobileMedia.matches) dom['curriculum-sidebar'].setAttribute('aria-hidden', 'true');
  else dom['curriculum-sidebar'].removeAttribute('aria-hidden');
  dom['drawer-backdrop'].hidden = true;
  dom['mobile-menu-toggle'].setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  setBackgroundInert(false);
  if (wasOpen && restoreFocus && mobileMedia.matches) dom['mobile-menu-toggle'].focus();
}

function openDialog(id) {
  closeMenu(false);
  const dialog = document.getElementById(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function resetProgress() {
  cancelPending('학습 기록 초기화', false);
  for (const key of ['quizPassed', 'labPassed', 'drafts', 'fileDrafts', 'activeFiles', 'notes', 'quizAnswers', 'quizResults', 'labResults', 'undo']) state[key].clear();
  saveStorage();
  document.getElementById('reset-dialog').close();
  renderAll();
  dom['lesson-title'].focus({ preventScroll: true });
  toast(`${isDesktop ? '이 PC 앱' : '이 브라우저'}의 진도, 작성 코드와 설계 메모를 초기화했습니다.`);
}

function bindEvents() {
  document.getElementById('desktop-settings-open').hidden = !isDesktop;
  document.getElementById('desktop-install-open').hidden = isDesktop;
  document.getElementById('desktop-settings-open').addEventListener('click', openDesktopSettings);
  document.getElementById('desktop-install-open').addEventListener('click', () => openDialog('install-dialog'));
  document.getElementById('reset-records-description').textContent = `${isDesktop ? '이 PC 앱' : '이 브라우저'}의 진도, 파일별 작성 코드와 설계 메모를 모두 지웁니다. 현재 학습 기준 버전은 유지됩니다.`;
  dom['version-select'].addEventListener('change', (event) => {
    const version = Number(event.target.value);
    if (!VERSIONS.includes(version)) return;
    cancelPending('학습 기준 버전 변경', false);
    state.version = version;
    applyFilters();
  });
  dom['lesson-search'].addEventListener('input', (event) => { state.search = event.target.value; applyFilters(); });
  document.querySelectorAll('[data-track]').forEach((button) => button.addEventListener('click', () => {
    state.track = button.dataset.track;
    applyFilters();
  }));
  document.querySelectorAll('[data-step]').forEach((tab) => {
    tab.addEventListener('click', () => selectStep(tab.dataset.step));
    tab.addEventListener('keydown', (event) => {
      const index = STEPS.indexOf(tab.dataset.step);
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % STEPS.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index + STEPS.length - 1) % STEPS.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = STEPS.length - 1;
      else return;
      event.preventDefault();
      selectStep(STEPS[nextIndex]);
      document.getElementById(`tab-${STEPS[nextIndex]}`).focus({ preventScroll: true });
    });
  });
  if (typeof ResizeObserver === 'function') {
    const tabObserver = new ResizeObserver(() => revealStepTab(state.step));
    tabObserver.observe(document.querySelector('.lesson-tabs'));
  } else {
    window.addEventListener('resize', () => revealStepTab(state.step));
  }
  document.getElementById('continue-button').addEventListener('click', () => {
    const lesson = continuationLesson();
    if (!lesson) return;
    state.track = 'all';
    state.search = '';
    selectLesson(lesson.id, state.quizPassed.has(lesson.id) && !labComplete(lesson) ? 'lab' : 'theory', true);
  });
  dom['mobile-menu-toggle'].addEventListener('click', () => state.menuOpen ? closeMenu() : openMenu());
  document.getElementById('mobile-menu-close').addEventListener('click', () => closeMenu());
  dom['drawer-backdrop'].addEventListener('click', () => closeMenu());
  mobileMedia.addEventListener('change', () => closeMenu(false));
  document.addEventListener('keydown', (event) => {
    if (!state.menuOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dom['curriculum-sidebar'].querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter((node) => !node.disabled && node.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  for (const id of ['guide-open', 'footer-guide-open']) document.getElementById(id).addEventListener('click', () => openDialog('guide-dialog'));
  document.getElementById('reset-progress-open').addEventListener('click', () => openDialog('reset-dialog'));
  document.getElementById('confirm-reset-progress').addEventListener('click', resetProgress);
  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close()));
  window.addEventListener('hashchange', () => {
    cancelPending('링크 변경', false);
    readHash();
    ensureSelection();
    saveStorage();
    syncHash();
    renderAll();
  });
  window.addEventListener('beforeunload', () => { if (saveTimer) saveStorage(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) saveStorage(); });
}

async function boot() {
  try {
    const [curriculumModule, exerciseModule, evidenceModule, editorModule, professionalModule, visualModule] = await Promise.all([
      import('./data/curriculum.js'), import('./data/exercises.js'), import('./data/job-evidence.js'),
      import('./assets/editor.bundle.js').catch(() => null),
      import('./data/professional.js'),
      import('./data/lesson-visuals.js').catch(() => null),
    ]);
    if (!Array.isArray(professionalModule.professionalLessons) || !Array.isArray(professionalModule.professionalExercises)) throw new Error('Professional content data unavailable');
    lessons = [...curriculumModule.lessons, ...professionalModule.professionalLessons];
    exercises = [...exerciseModule.exercises, ...professionalModule.professionalExercises];
    jobEvidence = evidenceModule.jobEvidence;
    editorLibrary = editorModule;
    lessonVisuals = visualModule?.lessonVisuals && typeof visualModule.lessonVisuals === 'object' && !Array.isArray(visualModule.lessonVisuals) ? visualModule.lessonVisuals : {};
    if (!Array.isArray(lessons) || !lessons.length || !Array.isArray(exercises) || !Array.isArray(jobEvidence)) throw new Error('Content data unavailable');
    restoreStorage();
    restoreEditorPreferences();
    readHash();
    ensureSelection();
    bindEvents();
    renderAll();
    dom['loading-state'].hidden = true;
    dom['workspace-grid'].hidden = false;
    closeMenu(false);
    syncHash();
    if (state.storage === 'invalid') toast('기존 저장 기록을 읽을 수 없어 새 학습 상태로 시작합니다.');
    else if (state.storage === 'unavailable') toast('학습 기록 저장소가 제한되어 현재 화면 동안만 유지됩니다.');
    void loadRuntime();
  } catch (error) {
    dom['loading-state'].classList.add('is-error');
    dom['loading-state'].textContent = '학습 콘텐츠를 불러오지 못했습니다. 페이지를 새로고침하거나 연결 상태를 확인해 주세요.';
    const retry = actionButton('다시 불러오기', 'button button-secondary', () => window.location.reload());
    dom['loading-state'].append(el('br'), retry);
    console.error('Java Edu initialization failed:', error);
  }
}

void boot();
