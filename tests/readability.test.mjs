import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { exercises as coreExercises } from '../dist/data/exercises.js';
import { exerciseDefinitions } from '../server/exercises.mjs';
import { professionalLessons } from '../dist/data/professional.js';

const course = new URL('../curriculum/professional/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', course), 'utf8'));
const authoredProfessional = await Promise.all(catalog.lessons.map(async entry =>
  JSON.parse(await readFile(new URL(entry.lessonPath, course), 'utf8'))));
const exampleManifest = JSON.parse(await readFile(new URL('../examples/expected-output.json', import.meta.url), 'utf8'));
const lessons = [...coreLessons, ...authoredProfessional];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const kafkaFixtureWording = {
  before: '테스트는 java-edu-<UUID> 토픽 한 개와 동일 이름 consumer group을 생성하고 자신이 만든 토픽만 삭제합니다.',
  after: '테스트는 java-edu-<UUID> 토픽 한 개와 동일한 이름의 consumer group을 생성하고 자신이 만든 토픽만 삭제합니다.',
};
// Approved documentation-only correction, 2026-10-21. Reverse this exact sentence
// only for comparison with the historical hash; every other byte stays protected.
function historicalExampleFiles(id, files) {
  if (id !== 'kafka-idempotency') return files;
  assert.equal(files.filter(file => file.path === 'FIXTURE.md').length, 1, 'one Kafka fixture example');
  return files.map(file => {
    if (file.path !== 'FIXTURE.md') return file;
    assert.equal(file.language, 'markdown');
    assert.equal(file.code.split(kafkaFixtureWording.after).length - 1, 1, 'reviewed Kafka fixture sentence occurs exactly once');
    assert.equal(file.code.includes(kafkaFixtureWording.before), false, 'Kafka fixture uses the reviewed wording');
    return { ...file, code: file.code.replace(kafkaFixtureWording.after, kafkaFixtureWording.before) };
  });
}
const contracts = values => values.map(({ id, minVersion, preview, exerciseId, example, quiz, professionalExercise, executionVerified }) =>
  ({ id, minVersion, preview, exerciseId, example: { code: example.code, output: example.output, files: historicalExampleFiles(id, example.files) },
    quiz: quiz.map(({ explanation, ...question }) => question), professionalExercise, executionVerified }));

// Captured independently before learningGuide was added, 2026-10-13, and
// checked against Git b2dda6d4f2225e5f2d9b31a5287539bd1b0685b6.
// Executable examples, grading, target versions, starter code, and trusted checks
// remain frozen under already-earned achievement IDs; the exact documentation
// correction above is normalized only for this historical comparison.
const originalContracts = {
  core: 'fd73ccfc033780f4419e59f4c1dd84abc64a8d0c1d4c8235c4bd4b132e43a509',
  professional: '0a9ab6fadae8aa061705168a8f898c49eb91b2a3e1cd9b97dfb7fbaf13e2dcfb',
  exercises: '88d31bde3c83d8f82d5b95b6cbdf88426d8db637339daf104766483f55bdd5e6',
  definitions: '2550a87d02ad27c2a274df56bc36fc5d132e4ee3420a2073ec29064cee460a0e',
};

test('all 34 lessons have a concrete situation, defined terms, code trace, prediction, and practical takeaway', () => {
  assert.equal(coreLessons.length, 12);
  assert.equal(authoredProfessional.length, 22);
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 34);
  for (const lesson of lessons) {
    const guide = lesson.learningGuide;
    assert.ok(guide && !Array.isArray(guide), `${lesson.id}: learningGuide is required`);
    for (const field of ['scenario', 'question', 'takeaway']) {
      assert.ok(nonempty(guide[field]), `${lesson.id}: ${field}`);
      assert.match(guide[field], /[가-힣]/u, `${lesson.id}: ${field} must explain the lesson in Korean`);
    }
    assert.ok(Array.isArray(guide.terms) && guide.terms.length >= 2, `${lesson.id}: terms are unpacked before use`);
    assert.equal(new Set(guide.terms.map(item => item.term)).size, guide.terms.length, `${lesson.id}: unique term definitions`);
    for (const item of guide.terms) {
      assert.ok(nonempty(item.term) && nonempty(item.meaning), `${lesson.id}: complete term definition`);
      assert.notEqual(item.term.trim(), item.meaning.trim(), `${lesson.id}: definition does not merely repeat the term`);
      assert.match(item.meaning, /[가-힣]/u, `${lesson.id}/${item.term}: plain-language definition`);
    }
    assert.ok(guide.code && nonempty(guide.code.file) && nonempty(guide.code.source), `${lesson.id}: source and file name`);
    assert.ok(Array.isArray(guide.walkthrough) && guide.walkthrough.length >= 2 && guide.walkthrough.every(nonempty), `${lesson.id}: an ordered explanation of the code`);
    assert.ok(guide.prediction && ['question', 'answer', 'explanation'].every(field => nonempty(guide.prediction[field])), `${lesson.id}: predict, answer, and explain why`);
    assert.notEqual(guide.prediction.answer.trim(), guide.prediction.explanation.trim(), `${lesson.id}: explanation adds a reason to the answer`);
    assert.ok(lesson.theory.length >= 2 && lesson.quiz.length >= 2 && lesson.practice.tasks.length >= 2, `${lesson.id}: the original five-stage lesson remains present`);
  }
  for (const field of ['scenario', 'question']) {
    assert.equal(new Set(lessons.map(lesson => lesson.learningGuide[field].trim())).size, 34, `${field} is specific to each lesson`);
  }
});

test('every guide code block is one contiguous verbatim excerpt of its named existing example', async () => {
  for (const lesson of lessons) {
    const guide = lesson.learningGuide;
    assert.ok(guide?.code, `${lesson.id}: guide code exists`);
    let files = lesson.example.files;
    if (!files?.length) {
      const relative = guide.code.file.replace(/^examples\//, '');
      assert.ok(Object.hasOwn(exampleManifest, relative), `${lesson.id}: file exists in the original executable example manifest`);
      const original = await readFile(new URL(`../examples/${relative}`, import.meta.url), 'utf8');
      assert.equal(original.trim(), lesson.example.code.trim(), `${lesson.id}: named source is this lesson's published example`);
      files = [{ path: guide.code.file, code: lesson.example.code }];
    }
    const file = files.find(item => item.path === guide.code.file);
    assert.ok(file, `${lesson.id}: ${guide.code.file} is a published example file`);
    assert.ok(guide.code.source.trim().length > 0, `${lesson.id}: excerpt is not empty`);
    assert.ok(file.code.includes(guide.code.source), `${lesson.id}: excerpt is exact, consecutive original source; no omitted/reordered/rewritten lines`);
    assert.ok(guide.code.source.split('\n').length >= 2, `${lesson.id}: excerpt contains a traceable code sequence`);
  }
});

test('published professional guides exactly match all 22 authored lessons', () => {
  assert.equal(professionalLessons.length, 22);
  for (const lesson of authoredProfessional) {
    assert.deepEqual(professionalLessons.find(item => item.id === lesson.id)?.learningGuide, lesson.learningGuide, `${lesson.id}: regenerate the professional distribution before verification`);
    assert.ok(lesson.learningGuide, `${lesson.id}: authored guide is not missing`);
  }
});

test('readability additions preserve the pre-change examples, quiz answers, execution targets, and exercise contracts', () => {
  assert.equal(digest(contracts(coreLessons)), originalContracts.core, 'core examples, quiz, minimum versions, and exercise IDs');
  assert.equal(digest(contracts(authoredProfessional)), originalContracts.professional, 'professional examples, quiz, and local project execution contracts');
  assert.equal(digest(coreExercises), originalContracts.exercises, 'published core templates and criteria');
  assert.equal(digest(exerciseDefinitions), originalContracts.definitions, 'trusted runtime/grading checks');
});

test('the approved fixture wording correction cannot hide other documentation or Java changes', () => {
  const changedFixture = structuredClone(authoredProfessional);
  const fixture = changedFixture.find(lesson => lesson.id === 'kafka-idempotency').example.files.find(file => file.path === 'FIXTURE.md');
  fixture.code += '\nAn unreviewed fixture instruction.\n';
  assert.notEqual(digest(contracts(changedFixture)), originalContracts.professional, 'the rest of the fixture remains protected');

  const changedJava = structuredClone(authoredProfessional);
  changedJava.find(lesson => lesson.id === 'kafka-idempotency').example.files.find(file => file.path.endsWith('.java')).code += '\n// unreviewed Java change\n';
  assert.notEqual(digest(contracts(changedJava)), originalContracts.professional, 'Java example files remain protected');

  for (const code of [kafkaFixtureWording.before, `${kafkaFixtureWording.after}\n${kafkaFixtureWording.after}`]) {
    const unapproved = structuredClone(authoredProfessional);
    unapproved.find(lesson => lesson.id === 'kafka-idempotency').example.files.find(file => file.path === 'FIXTURE.md').code = code;
    assert.throws(() => contracts(unapproved), /reviewed Kafka fixture sentence occurs exactly once/);
  }
});

test('README puts installation directly after the introduction with explicit EXE and ZIP asset links', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const sections = [...readme.matchAll(/^##\s+(.+)$/gm)].map(match => ({ title: match[1].trim(), index: match.index }));
  const introduction = sections.findIndex(section => section.title === '소개');
  assert.ok(introduction >= 0, 'introduction is present');
  assert.match(sections[introduction + 1]?.title || '', /설치/, 'installation immediately follows the introduction');
  const installation = readme.slice(sections[introduction + 1].index, sections[introduction + 2]?.index);
  const links = [...installation.matchAll(/\[[^\]]+\]\((https:\/\/[^\s)]+)\)/g)].map(match => new URL(match[1]));
  for (const extension of ['exe', 'zip']) {
    assert.ok(links.some(url => url.hostname === 'github.com' && new RegExp(`^/jbsim999/java-edu/releases/download/v[^/]+/[^/]+\\.${extension}$`, 'i').test(url.pathname)), `${extension}: direct GitHub release asset link`);
  }
  assert.match(installation, /Windows\s*x64/i);
  assert.match(installation, /Java Edu\.exe/);
  assert.match(installation, /압축.*해제/);
  assert.match(installation, /환경 준비/);
});
