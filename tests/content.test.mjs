import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { lessons } from '../dist/data/curriculum.js';
import { exercises } from '../dist/data/exercises.js';
import { exerciseDefinitions } from '../server/exercises.mjs';
import { jobEvidence } from '../dist/data/job-evidence.js';

const versions = [8, 11, 17, 21];
const referenceAnswers = JSON.parse(await readFile(new URL('../examples/solutions.json', import.meta.url), 'utf8'));
const exampleManifest = JSON.parse(await readFile(new URL('../examples/expected-output.json', import.meta.url), 'utf8'));

test('12 published lessons have meaningful five-stage content and two distinct template modes', () => {
  assert.equal(lessons.length, 12);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, lessons.length);
  assert.equal(exercises.length, lessons.length);
  assert.equal(exerciseDefinitions.length, lessons.length);
  assert.deepEqual(new Set(exercises.map((exercise) => exercise.mode)), new Set(['class', 'method']));
  for (const lesson of lessons) {
    assert.ok(lesson.title && lesson.description && lesson.category);
    assert.ok(versions.includes(lesson.minVersion), lesson.id);
    assert.equal(lesson.preview, false, lesson.id);
    assert.ok(['transition', 'advanced', 'both'].includes(lesson.track));
    assert.ok(lesson.goals.length >= 2 && lesson.theory.length >= 2 && lesson.quiz.length >= 2, lesson.id);
    for (const section of lesson.theory) assert.ok(section.heading && section.text.length >= 35, lesson.id);
    assert.ok(lesson.example.code.includes('class Main') && lesson.example.output && lesson.example.explanation, lesson.id);
    assert.ok(lesson.practice.title && lesson.practice.scenario && lesson.practice.tasks.length >= 2 && lesson.practice.takeaway, lesson.id);
    assert.ok(lesson.sources.length >= 1, lesson.id);
    for (const source of lesson.sources) {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(source.title && source.edition && /^2026-10-12$/.test(source.checkedAt));
    }
    for (const question of lesson.quiz) {
      assert.ok(question.id && question.question && question.explanation);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4);
    }
    const exercise = exercises.find((item) => item.id === lesson.exerciseId);
    const definition = exerciseDefinitions.find((item) => item.id === lesson.exerciseId);
    assert.ok(exercise && definition, lesson.id);
    assert.equal(exercise.lessonId, lesson.id);
    assert.equal(definition.lessonId, lesson.id);
    assert.equal(exercise.minVersion, lesson.minVersion);
    assert.equal(definition.minVersion, lesson.minVersion);
    assert.equal(exercise.template, definition.template);
    assert.ok(exercise.instructions.length >= 2 && exercise.rubric.length >= 1);
    assert.ok(typeof referenceAnswers[exercise.id] === 'string', exercise.id);
    assert.ok(definition.sampleChecks.length >= 1 && definition.checks.length > definition.sampleChecks.length);
    assert.equal(new Set(definition.checks.map((check) => check.name)).size, definition.checks.length);
    for (const sample of definition.sampleChecks) assert.ok(definition.checks.some((check) => check.name === sample.name && check.expression === sample.expression));
  }
});

test('authored expected examples exist and match the displayed code at every target version', async () => {
  assert.equal(Object.keys(exampleManifest).length, lessons.length);
  for (const [relativeFile, example] of Object.entries(exampleManifest)) {
    assert.ok(versions.includes(example.minVersion));
    assert.equal(example.mainClass, 'Main');
    assert.ok(relativeFile.startsWith(`java${example.minVersion}/`) && !relativeFile.includes('..'));
    const code = await readFile(new URL(`../examples/${relativeFile}`, import.meta.url), 'utf8');
    const matches = lessons.filter((lesson) => lesson.example.code.trim() === code.trim());
    assert.equal(matches.length, 1, relativeFile);
    assert.equal(matches[0].minVersion, example.minVersion);
    assert.equal(matches[0].example.output.trim(), example.stdout.trim());
  }
  for (const version of versions) assert.ok(lessons.some((lesson) => lesson.minVersion === version));
});

test('Java 8 examples exclude later standard collection APIs and preview syntax', () => {
  for (const lesson of lessons.filter((item) => item.minVersion === 8)) {
    assert.doesNotMatch(lesson.example.code, /List\.of\(|(?<!Collectors)\.toList\(\)|\.isEmpty\(\).*Optional|\brecord\s+\w+\s*\(/, lesson.id);
  }
  const modern = lessons.find((lesson) => lesson.id === 'modern-apis');
  assert.equal(modern.minVersion, 11);
  assert.equal(lessons.find((lesson) => lesson.id === 'java21').minVersion, 21);
});

test('public evidence has real URLs, dated status, and valid lesson associations', () => {
  assert.ok(jobEvidence.length >= 5);
  assert.equal(new Set(jobEvidence.map((item) => item.id)).size, jobEvidence.length);
  const ids = new Set(lessons.map((lesson) => lesson.id));
  for (const item of jobEvidence) {
    assert.ok(item.company && item.title && item.summary && item.status);
    assert.equal(new URL(item.url).protocol, 'https:');
    assert.equal(item.checkedAt, '2026-10-12');
    assert.ok(['full', 'partial'].includes(item.access));
    assert.ok(item.technologies.length && item.lessonIds.every((id) => ids.has(id)));
  }
});

test('public static assets do not contain reference solutions or trusted server tests', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /examples\/solutions\.json|server\/exercises\.mjs/);
  for (const file of ['../dist/app.js', '../dist/styles.css']) await access(new URL(file, import.meta.url));
});
