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
const NOTE_LIMIT = 20000;
const mobileMedia = window.matchMedia('(max-width: 899px)');
let lessons = [];
let exercises = [];
let jobEvidence = [];
let saveTimer;
let toastTimer;
let runtimeSequence = 0;
let editorLibrary = null;
let activeEditor = null;

const state = {
  version: 21, track: 'all', search: '', lessonId: '', step: 'theory',
  quizPassed: new Set(), labPassed: new Map(), drafts: new Map(), notes: new Map(),
  quizAnswers: new Map(), quizResults: new Map(), labResults: new Map(), undo: new Map(),
  storage: 'ready', runtime: null, runtimeStatus: 'checking', runtimeMessage: '',
  pending: null, menuOpen: false,
  editorTheme: 'dark', editorWrap: false,
};

const dom = Object.fromEntries([
  'workspace-grid', 'loading-state', 'lesson-list', 'lesson-card', 'lesson-panel', 'lesson-title',
  'lesson-description', 'lesson-category', 'lesson-position', 'lesson-meta', 'lesson-achievements',
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
function sourceFor(exercise) { return state.drafts.has(exercise.id) ? state.drafts.get(exercise.id) : exercise.template; }
function labComplete(lesson) {
  const exercise = exerciseFor(lesson);
  return Boolean(exercise && state.labPassed.has(exercise.id) && state.labPassed.get(exercise.id) === sourceFor(exercise));
}
function lessonComplete(lesson) { return state.quizPassed.has(lesson.id) && labComplete(lesson); }

function visibleLessons() {
  const query = state.search.trim().toLocaleLowerCase('ko');
  return lessons.filter((lesson) => {
    if (Number(lesson.minVersion) > state.version) return false;
    if (state.track !== 'all') {
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
  try { raw = window.localStorage.getItem(STORAGE_KEY); }
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
      ['labPassed', state.labPassed, 'exerciseId', exercises, SOURCE_LIMIT],
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
  } catch {
    state.storage = 'invalid';
  }
}

function restoreEditorPreferences() {
  try {
    const preferences = JSON.parse(window.localStorage.getItem(EDITOR_PREFERENCES_KEY));
    if (!preferences || typeof preferences !== 'object') return;
    if (EDITOR_THEMES.includes(preferences.theme)) state.editorTheme = preferences.theme;
    if (typeof preferences.wrap === 'boolean') state.editorWrap = preferences.wrap;
  } catch { /* Preferences are optional; the default theme also works without storage. */ }
}

function saveEditorPreferences() {
  try {
    window.localStorage.setItem(EDITOR_PREFERENCES_KEY, JSON.stringify({ theme: state.editorTheme, wrap: state.editorWrap }));
  } catch {
    state.storage = 'unavailable';
    updateStorageIndicator();
    toast('코드 테마는 이번 방문 동안 적용됩니다. 브라우저 저장을 사용할 수 없습니다.');
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

function codePreferences() {
  const settings = el('div', 'code-settings');
  const label = el('label', 'code-theme-label', '코드 테마');
  label.htmlFor = 'editor-theme-select';
  const select = el('select', 'editor-theme-select');
  select.id = 'editor-theme-select';
  select.dataset.testid = 'editor-theme-select';
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
  const label = state.storage === 'unavailable' ? '이번 방문 동안만 기록' : state.storage === 'invalid' ? '기존 기록을 읽지 못했습니다' : '이 브라우저에 저장';
  document.getElementById('storage-label').textContent = label;
  indicator.title = state.storage === 'unavailable' ? '브라우저 저장소를 사용할 수 없습니다. 작성 코드를 별도로 복사해 주세요.' : '진도와 코드는 현재 브라우저에만 저장됩니다.';
  const editorSave = document.getElementById('editor-save-state');
  if (editorSave) editorSave.textContent = state.storage === 'unavailable' ? '저장 불가 · 코드 복사 권장' : '브라우저에 저장';
  const notesSave = document.getElementById('notes-save-state');
  if (notesSave) notesSave.textContent = state.storage === 'unavailable' ? '브라우저 저장을 사용할 수 없어 이번 방문 동안만 유지됩니다.' : '이 브라우저에 저장됩니다. 설계 메모는 자동 평가하지 않습니다.';
}

function saveStorage() {
  clearTimeout(saveTimer);
  const record = {
    schema: 1, version: state.version, lessonId: state.lessonId,
    quizPassed: [...state.quizPassed],
    labPassed: [...state.labPassed].map(([exerciseId, source]) => ({ exerciseId, source })),
    drafts: [...state.drafts].map(([exerciseId, source]) => ({ exerciseId, source })),
    notes: [...state.notes].map(([lessonId, text]) => ({ lessonId, text })),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    state.storage = 'ready';
  } catch {
    if (state.storage !== 'unavailable') toast('브라우저에 저장할 수 없습니다. 작성 코드를 별도로 복사해 주세요.');
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
    meta.append(el('span', '', `Java ${lesson.minVersion}+`), el('span', '', complete ? '완료' : lesson.track === 'advanced' ? '실무 심화' : lesson.track === 'both' ? '공통' : 'Java 전환'));
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
  document.getElementById('lesson-total').textContent = String(lessons.length);
  document.getElementById('overall-completed').textContent = String(count);
  document.getElementById('overall-denominator').textContent = ` / ${lessons.length}`;
  const progress = document.getElementById('overall-progress');
  progress.setAttribute('aria-valuemax', String(lessons.length));
  progress.setAttribute('aria-valuenow', String(count));
  progress.setAttribute('aria-valuetext', `전체 ${lessons.length}개 수업 중 ${count}개 완료`);
  document.getElementById('overall-progress-fill').style.width = `${lessons.length ? (count / lessons.length) * 100 : 0}%`;
  const next = continuationLesson();
  document.getElementById('continue-label').textContent = next && lessonComplete(next) ? '완료한 수업 다시 보기' : state.quizPassed.size || state.drafts.size ? '이어서 학습하기' : '학습 시작하기';
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
  const tabs = document.querySelector('.lesson-tabs');
  destroyCodeEditor();
  dom['lesson-panel'].replaceChildren();
  dom['lesson-meta'].replaceChildren();
  dom['lesson-footer'].replaceChildren();
  dom['lesson-achievements'].replaceChildren();
  tabs.hidden = !lesson;
  dom['lesson-footer'].hidden = !lesson;
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
  if (lesson.featureSince) dom['lesson-meta'].append(el('span', 'meta-chip is-neutral', `기능 도입 ${String(lesson.featureSince)}`));
  const trackLabel = lesson.track === 'both' ? '전환 · 심화 공통' : lesson.track === 'advanced' ? '실무 심화' : 'Java 전환';
  dom['lesson-meta'].append(el('span', 'meta-chip is-neutral', trackLabel));
  if (lesson.duration) {
    const time = el('span', 'meta-chip is-neutral');
    time.append(icon('clock'), document.createTextNode(typeof lesson.duration === 'number' ? `${lesson.duration}분` : lesson.duration));
    dom['lesson-meta'].append(time);
  }
  if (lesson.preview) dom['lesson-meta'].append(el('span', 'meta-chip is-preview', 'Preview 기능 포함'));
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

function renderTheory(lesson) {
  const goals = el('div', 'learning-goals');
  goals.append(el('p', 'small-label', 'AFTER THIS LESSON'));
  const list = el('ul');
  (lesson.goals || []).forEach((goal) => { const item = el('li'); item.append(icon('check'), el('span', '', goal)); list.append(item); });
  goals.append(list);
  dom['lesson-panel'].append(goals);
  (lesson.theory || []).forEach((part, index) => {
    const section = el('section', 'theory-section');
    section.append(sectionTitle(part.heading, String(index + 1).padStart(2, '0')), el('p', '', part.text));
    dom['lesson-panel'].append(section);
  });
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

function renderExample(lesson) {
  const example = lesson.example;
  if (!example) return;
  dom['lesson-panel'].append(sectionTitle(example.title || '코드로 개념 살펴보기'), el('p', 'section-caption', '아래는 학습용 예제와 예상 출력입니다. 실제 실행은 코드 실습에서 확인하세요.'));
  const shell = el('div', 'code-shell');
  shell.dataset.editorTheme = state.editorTheme;
  const heading = el('div', 'code-heading');
  const filename = el('span'); filename.append(icon('code'), document.createTextNode('Main.java'));
  const pre = el('pre', 'code-block');
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', '학습 예제 소스 코드');
  const code = el('code');
  if (editorLibrary) editorLibrary.highlightJavaCode(code, example.code);
  else code.textContent = example.code;
  pre.append(code);
  const copy = actionButton('코드 복사', 'copy-button', () => copyText(example.code, pre), 'copy-example');
  copy.prepend(icon('copy'));
  heading.append(filename, copy);
  shell.append(heading, codePreferences(), syntaxLegend(), pre);
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
  heading.append(el('h3', '', exercise.title), el('span', 'lab-mode', exercise.mode === 'class' ? 'CLASS DESIGN' : 'METHOD IMPLEMENTATION'));
  dom['lesson-panel'].append(heading, el('p', 'section-caption', exercise.mode === 'class' ? '주어진 계약을 만족하는 클래스를 직접 설계하세요. 클래스 전체를 편집할 수 있습니다.' : '제공된 클래스와 메서드 골격을 완성하세요. 클래스 전체를 편집할 수 있습니다.'));
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
  filename.append(icon('code'), document.createTextNode('Solution · Java'));
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
      const previous = activeEditor?.getValue() ?? sourceFor(exercise);
      if (previous === exercise.template) { toast('이미 초기 코드입니다.'); return; }
      state.undo.set(exercise.id, previous);
      state.drafts.set(exercise.id, exercise.template);
      activeEditor?.setValue(exercise.template);
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
  editorShell.append(toolbar, codePreferences(), syntaxLegend(), editor, editorStatus);
  const hint = el('p', 'editor-hint', '문법 강조 · 줄 번호 · 괄호 짝 표시 · Tab은 다음 항목으로 이동합니다. 들여쓰기 버튼은 선택한 줄에 공백 4칸을 넣습니다. 색상은 구문을 구분하며 컴파일 결과를 대신하지 않습니다. class Solution 골격을 유지하고 최상위 public class·package·Main 선언은 추가하지 마세요. 실행 요청은 UTF-8 32 KiB까지 전송할 수 있습니다.');
  hint.id = 'editor-hint';
  const undo = el('div', 'reset-undo'); undo.id = 'lab-reset-undo'; undo.hidden = true;
  const disclosure = el('p', 'execution-disclosure', '실행·제출을 누르면 작성 코드가 외부 서비스 Wandbox로 전송됩니다. 운영 로그에 코드가 남을 수 있으니 비밀정보를 입력하지 마세요. ');
  disclosure.id = 'execution-disclosure';
  disclosure.append(safeLink('Wandbox 서비스 안내 ↗', 'https://github.com/melpon/wandbox#faq'));
  const actions = el('div', 'lab-actions');
  const run = actionButton('예시 실행', 'button button-secondary', () => executeCode(exercise, 'run'), 'run-code');
  run.prepend(icon('play'));
  run.setAttribute('aria-describedby', 'execution-disclosure');
  const submit = actionButton('제출하고 검증하기', 'button button-primary', () => executeCode(exercise, 'submit'), 'submit-code');
  submit.prepend(icon('check'));
  submit.setAttribute('aria-describedby', 'execution-disclosure');
  const cancel = actionButton('응답 대기 취소', 'button button-quiet', () => cancelPending('user'), 'cancel-execution');
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
  mountCodeEditor(editor, exercise);
  if (!editorLibrary) hint.prepend(document.createTextNode('편집기 확장을 불러오지 못해 기본 텍스트 편집기를 사용합니다. '));
  renderRuntime();
  renderUndo(exercise);
  refreshEditorCounter(exercise);
  renderExecution(exercise);
  updateLabControls();
}

function mountCodeEditor(parent, exercise) {
  const onChange = (value) => {
    state.drafts.set(exercise.id, value);
    state.undo.delete(exercise.id);
    renderUndo(exercise);
    refreshDraftDependentUi(exercise);
    scheduleSave();
  };
  const options = {
    parent, source: sourceFor(exercise), theme: state.editorTheme, wrap: state.editorWrap,
    label: `${exercise.title} Java 코드 편집기`, descriptionId: 'editor-hint editor-save-state',
    maxLength: SOURCE_LIMIT, onChange, onBlur: saveStorage,
    onLimit: () => toast(`코드는 ${SOURCE_LIMIT.toLocaleString('ko-KR')}자까지 작성할 수 있습니다.`),
  };
  if (editorLibrary) {
    activeEditor = editorLibrary.createJavaEditor(options);
    return;
  }
  const textarea = el('textarea', 'code-editor-fallback');
  textarea.value = options.source;
  textarea.maxLength = SOURCE_LIMIT;
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
  if (count) count.textContent = `${sourceFor(exercise).split('\n').length} lines · ${sourceFor(exercise).length.toLocaleString('ko-KR')} / ${SOURCE_LIMIT.toLocaleString('ko-KR')} chars`;
}

function renderUndo(exercise) {
  const row = document.getElementById('lab-reset-undo');
  if (!row) return;
  row.replaceChildren();
  row.hidden = !state.undo.has(exercise.id);
  if (row.hidden) return;
  row.append(document.createTextNode('초기 코드로 되돌렸습니다.'), actionButton('되돌리기', '', () => {
    if (!state.undo.has(exercise.id)) return;
    const source = state.undo.get(exercise.id);
    state.undo.delete(exercise.id);
    state.drafts.set(exercise.id, source);
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

function renderRuntime() {
  const card = document.getElementById('runtime-info');
  if (!card) return;
  const exercise = exerciseFor(currentLesson());
  card.replaceChildren();
  card.classList.toggle('is-unavailable', state.runtimeStatus === 'unavailable');
  const line = el('div', 'runtime-line');
  const runtimeVersion = state.runtime?.runtime?.javaVersion || 21;
  line.append(el('strong', '', `실제 실행 JVM · Java ${runtimeVersion}`), el('span', '', `컴파일 대상 · Java ${exercise?.minVersion || 8}`));
  card.append(line);
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
  const busy = Boolean(state.pending && state.pending.exerciseId === exercise.id);
  const available = state.runtimeStatus === 'ready' && state.runtime.supportedTargets.includes(Number(exercise.minVersion));
  run.disabled = busy || !available;
  submit.disabled = busy || !available;
  cancel.hidden = !busy;
  status.textContent = busy ? '실제 Java 컴파일·실행 중…' : state.runtimeStatus === 'checking' ? '실행 환경 확인 중' : !available ? '실행 연결을 확인해 주세요' : '코드는 버튼을 누를 때 전송됩니다';
  document.getElementById('execution-output')?.setAttribute('aria-busy', String(busy));
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
    if (!runtime || typeof runtime !== 'object' || runtime.available !== true || Number(runtime.runtime?.javaVersion) !== 21 || !Array.isArray(runtime.supportedTargets)) {
      state.runtimeStatus = 'unavailable';
      state.runtimeMessage = typeof runtime?.notice === 'string' ? runtime.notice : '현재 Wandbox 실행 환경을 사용할 수 없습니다. 잠시 후 다시 확인해 주세요.';
    } else {
      state.runtime = { ...runtime, supportedTargets: runtime.supportedTargets.map(Number).filter((version) => VERSIONS.includes(version)) };
      state.runtimeStatus = 'ready';
      state.runtimeMessage = '';
    }
  } catch {
    if (sequence !== runtimeSequence) return;
    state.runtimeStatus = 'unavailable';
    state.runtimeMessage = '실행 서버에 연결하지 못했습니다. 수업·문제·코드 작성은 계속 이용할 수 있습니다.';
  } finally {
    clearTimeout(timer);
    if (sequence === runtimeSequence) { renderRuntime(); updateLabControls(); }
  }
}

function renderExecution(exercise) {
  const panel = document.getElementById('execution-output');
  if (!panel) return;
  panel.replaceChildren();
  const pending = state.pending?.exerciseId === exercise.id ? state.pending : null;
  const result = state.labResults.get(exercise.id);
  const outdated = Boolean(result && result.sourceSnapshot !== sourceFor(exercise));
  panel.dataset.status = pending ? 'running' : outdated ? 'outdated' : result?.status || 'idle';
  panel.setAttribute('aria-busy', String(Boolean(pending)));
  const heading = el('div', 'execution-panel-heading');
  const title = el('strong'); title.append(icon('terminal'), document.createTextNode('실제 실행 결과'));
  const metadata = result && result.runtimeVersion ? `Java ${result.runtimeVersion} · --release ${result.targetVersion}` : 'Wandbox / Java 21';
  heading.append(title, el('span', '', metadata));
  const body = el('div', 'execution-output-body');
  if (pending) {
    body.append(el('p', 'execution-placeholder', '작성 코드를 컴파일하고 실제 JVM에서 실행하고 있습니다. 결과가 도착하면 여기에 표시됩니다.'));
    if (pending.source !== sourceFor(exercise)) body.append(el('p', 'execution-warning', '요청 후 코드가 변경되었습니다. 도착하는 결과는 요청 당시 코드의 결과이며 현재 코드의 완료 기록에 반영하지 않습니다.'));
  } else if (!result) {
    body.append(el('p', 'execution-placeholder', '아직 실행하지 않았습니다. 예시 실행으로 공개 사례를 확인하고, 제출로 전체 테스트를 검증하세요. 예상 출력은 실제 실행 결과로 사용하지 않습니다.'));
  } else {
    if (outdated) body.append(el('p', 'execution-warning', '요청 후 코드가 변경되었습니다. 현재 코드의 실행 결과가 아닙니다. 현재 코드를 다시 실행·제출해 주세요.'));
    const labels = {
      passed: result.action === 'submit' ? '제출 테스트 통과' : '공개 예시 실행 통과',
      failed: '검증 조건을 충족하지 못했습니다',
      compile_error: '컴파일 오류', runtime_error: '실행 중 오류', timeout: '실행 시간 초과',
      provider_error: '실행 요청을 완료하지 못했습니다', cancelled: '응답 대기를 취소했습니다', validation_error: '실행할 코드의 크기를 확인해 주세요',
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
    if (result.action === 'run' && result.status === 'passed') body.append(el('p', 'inline-note', '예시 실행은 수업 완료에 포함되지 않습니다. 전체 테스트는 제출로 확인하세요.'));
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
      message: '브라우저의 응답 대기를 중단했습니다. 외부 서비스에서 이미 시작한 실행이 종료되었다는 의미는 아닙니다.',
    });
    announce('응답 대기를 취소했습니다. 외부 실행의 종료를 보장하지 않습니다.');
  }
  if (update) {
    const exercise = exerciseFor(currentLesson());
    if (exercise) renderExecution(exercise);
    updateLabControls();
  }
}

function executionResult(payload, request, exercise) {
  if (!payload || typeof payload !== 'object' || payload.requestId !== request.id || !EXECUTION_STATUSES.has(payload.status)) throw new Error('실행 서버의 응답 형식을 확인할 수 없습니다. 다시 시도해 주세요.');
  if (Number(payload.runtimeVersion) !== 21 || Number(payload.targetVersion) !== Number(exercise.minVersion)) throw new Error('응답의 실행 환경이 이 실습의 계약과 일치하지 않습니다. 완료 기록에 반영하지 않았습니다.');
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
    provider: typeof payload.provider === 'string' ? payload.provider : 'Wandbox',
    durationMs: Number.isFinite(payload.durationMs) ? payload.durationMs : undefined,
  };
}

async function executeCode(exercise, action) {
  if (state.pending || state.runtimeStatus !== 'ready' || !state.runtime.supportedTargets.includes(Number(exercise.minVersion))) return;
  const source = sourceFor(exercise);
  if (!source.trim()) {
    toast('실행할 Java 코드를 입력해 주세요.');
    activeEditor?.focus();
    return;
  }
  saveStorage();
  const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `request_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const requestBody = JSON.stringify({ exerciseId: exercise.id, source, action, requestId: id });
  if (new TextEncoder().encode(requestBody).byteLength > 32 * 1024) {
    state.labResults.set(exercise.id, {
      status: 'validation_error', action, sourceSnapshot: source,
      message: '요청 전체가 UTF-8 32 KiB를 초과합니다. 코드를 줄여 다시 시도해 주세요. 한글은 여러 바이트를 사용하며 작성 코드는 이 브라우저에 유지됩니다.',
    });
    renderExecution(exercise);
    announce('코드가 실행 요청의 32 KiB 제한을 초과했습니다. 코드를 줄여 주세요.');
    return;
  }
  const controller = new AbortController();
  const request = { id, source, action, exerciseId: exercise.id, lessonId: state.lessonId, version: state.version, controller, timedOut: false, timer: null };
  request.timer = window.setTimeout(() => { request.timedOut = true; controller.abort(); }, 60000);
  state.pending = request;
  state.labResults.delete(exercise.id);
  updateLabControls();
  renderExecution(exercise);
  announce(action === 'submit' ? '코드를 제출해 전체 테스트를 검증합니다.' : '공개 예시를 실제 Java 환경에서 실행합니다.');
  try {
    const response = await fetch('/api/execute', {
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
    const fresh = request.source === sourceFor(exercise) && request.lessonId === state.lessonId && request.version === state.version;
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
    announce(!fresh ? '요청 당시 코드의 결과가 도착했습니다. 현재 코드를 다시 제출해 주세요.' : result.status === 'passed' ? action === 'submit' ? '제출한 코드가 전체 테스트를 통과했습니다.' : '공개 예시 실행을 통과했습니다.' : '실행 결과를 확인해 주세요.');
  } catch (error) {
    if (state.pending !== request) return;
    state.labResults.set(exercise.id, {
      status: request.timedOut ? 'timeout' : 'provider_error', action, sourceSnapshot: source,
      message: request.timedOut ? '60초 안에 응답을 받지 못했습니다. 외부 실행이 계속 중일 수 있습니다. 잠시 후 다시 시도해 주세요.' : error instanceof Error ? error.message : '실행 서비스에 연결할 수 없습니다.',
    });
    announce(request.timedOut ? '실행 응답 대기 시간이 초과되었습니다.' : '실행 요청을 완료하지 못했습니다. 오류 안내를 확인해 주세요.');
  } finally {
    clearTimeout(request.timer);
    if (state.pending === request) {
      state.pending = null;
      renderExecution(exercise);
      updateLabControls();
    }
  }
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
  for (const key of ['quizPassed', 'labPassed', 'drafts', 'notes', 'quizAnswers', 'quizResults', 'labResults', 'undo']) state[key].clear();
  saveStorage();
  document.getElementById('reset-dialog').close();
  renderAll();
  dom['lesson-title'].focus({ preventScroll: true });
  toast('이 브라우저의 진도, 작성 코드와 설계 메모를 초기화했습니다.');
}

function bindEvents() {
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
      document.getElementById(`tab-${STEPS[nextIndex]}`).focus();
    });
  });
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
    const [curriculumModule, exerciseModule, evidenceModule, editorModule] = await Promise.all([
      import('./data/curriculum.js'), import('./data/exercises.js'), import('./data/job-evidence.js'),
      import('./assets/editor.bundle.js').catch(() => null),
    ]);
    lessons = curriculumModule.lessons;
    exercises = exerciseModule.exercises;
    jobEvidence = evidenceModule.jobEvidence;
    editorLibrary = editorModule;
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
    else if (state.storage === 'unavailable') toast('브라우저 저장이 제한되어 기록은 이번 방문 동안만 유지됩니다.');
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
