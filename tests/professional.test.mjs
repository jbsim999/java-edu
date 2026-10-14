import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { lessons as coreLessons } from '../dist/data/curriculum.js';
import { professionalLessons, professionalExercises } from '../dist/data/professional.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const course = path.join(root, 'curriculum/professional');
const catalog = JSON.parse(await readFile(path.join(course, 'catalog.json'), 'utf8'));
const profiles = JSON.parse(await readFile(path.join(course, 'profiles.json'), 'utf8')).profiles;

function safeRelative(value) {
  assert.equal(typeof value, 'string');
  assert.ok(value && !path.isAbsolute(value) && !value.includes('\\'));
  assert.ok(value.split('/').every(segment => segment && segment !== '.' && segment !== '..'), `safe relative path: ${value}`);
  return value;
}

test('Published course contains 12 core and 22 distinct professional lessons with resolvable learning contracts', () => {
  assert.equal(coreLessons.length, 12);
  assert.equal(professionalLessons.length, 22);
  assert.equal(professionalExercises.length, 22);
  assert.equal(catalog.lessons.length, 22);
  const allLessons = [...coreLessons, ...professionalLessons];
  assert.equal(new Set(allLessons.map(lesson => lesson.id)).size, 34);
  assert.equal(new Set(allLessons.map(lesson => lesson.exerciseId)).size, 34);
  const questionIds = [];
  for (const lesson of professionalLessons) {
    const authored = catalog.lessons.find(item => item.id === lesson.id);
    const exercise = professionalExercises.find(item => item.id === lesson.exerciseId);
    const profile = profiles.find(item => item.id === exercise?.profileId);
    assert.ok(authored && exercise && profile, lesson.id);
    assert.equal(exercise.lessonId, lesson.id);
    assert.equal(lesson.minVersion, profile.compilerTarget);
    assert.equal(exercise.minVersion, lesson.minVersion);
    assert.ok(lesson.minVersion >= 17 && [17, 21].includes(lesson.minVersion));
    assert.equal(lesson.preview, false);
    assert.equal(exercise.mode, 'project');
    assert.equal(exercise.requiresDesktop, true);
    assert.ok(lesson.theory.length >= 2 && lesson.goals.length >= 2 && lesson.quiz.length >= 2);
    assert.ok(lesson.example.files.length >= 2 && lesson.practice.tasks.length >= 2);
    assert.ok(lesson.sources.length > 0 && lesson.sources.every(source => new URL(source.url).protocol === 'https:' && source.title && source.checkedAt));
    for (const question of lesson.quiz) {
      questionIds.push(question.id);
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4);
      assert.ok(question.question && question.explanation);
    }
  }
  assert.equal(new Set(questionIds).size, questionIds.length, 'professional quiz answers cannot collide by id');
});

test('Professional prerequisite graph resolves against the combined course and has no cycles', () => {
  const coreIds = new Set(coreLessons.map(lesson => lesson.id));
  const lessons = new Map(professionalLessons.map(lesson => [lesson.id, lesson]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    assert.equal(visiting.has(id), false, `cyclic prerequisite at ${id}`);
    visiting.add(id);
    for (const prerequisite of lessons.get(id).prerequisites) {
      if (prerequisite.startsWith('core:')) assert.ok(coreIds.has(prerequisite.slice(5)), `${id}: ${prerequisite}`);
      else { assert.ok(lessons.has(prerequisite), `${id}: ${prerequisite}`); visit(prerequisite); }
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of lessons.keys()) visit(id);
});

test('Published editable files and readonly POM match authored templates and example reference sources', async () => {
  for (const lesson of professionalLessons) {
    const exercise = professionalExercises.find(item => item.id === lesson.exerciseId);
    const contract = lesson.professionalExercise;
    assert.equal(new Set(exercise.files.map(file => file.path)).size, exercise.files.length);
    assert.ok(exercise.files.some(file => file.editable), lesson.id);
    assert.equal(exercise.files.find(file => file.path === 'pom.xml')?.editable, false, `${lesson.id} build file is immutable`);
    assert.deepEqual(exercise.files.map(file => file.path).sort(), contract.files.map(file => file.path).sort());
    for (const file of exercise.files) {
      safeRelative(file.path);
      const authored = contract.files.find(item => item.path === file.path);
      assert.equal(file.editable, authored.editable === true);
      assert.equal(file.source, await readFile(path.join(course, safeRelative(authored.templatePath)), 'utf8'), `${lesson.id}/${file.path} template`);
      const example = lesson.example.files.find(item => item.path === file.path);
      assert.ok(example, `${lesson.id}/${file.path} has a visible reference`);
      assert.equal(example.code, await readFile(path.join(course, safeRelative(authored.referencePath)), 'utf8'), `${lesson.id}/${file.path} reference`);
    }
  }
});

test('Every downloadable ZIP is readable and contains the exact parent POM, starter, reference, and trusted tests', async () => {
  const parentPom = await readFile(path.join(course, 'pom.xml'), 'utf8');
  for (const lesson of professionalLessons) {
    const exercise = professionalExercises.find(item => item.id === lesson.exerciseId);
    assert.equal(exercise.downloadUrl, `/downloads/${lesson.id}.zip`);
    const archive = unzipSync(await readFile(path.join(root, 'dist', exercise.downloadUrl.slice(1))));
    for (const name of Object.keys(archive)) {
      safeRelative(name);
      assert.doesNotMatch(name, /(?:^|\/)(?:target|node_modules)\//, 'downloads exclude generated directories');
      assert.doesNotMatch(name, /\.(?:exe|dll|cmd|bat|ps1)$/i, 'downloads contain learning source, not executables');
    }
    assert.equal(strFromU8(archive['pom.xml']), parentPom);
    assert.match(strFromU8(archive['README.txt']), /Maven/);
    for (const file of lesson.professionalExercise.files) {
      for (const [kind, relative] of [['starter', file.templatePath], ['reference', file.referencePath]]) {
        const name = `lessons/${lesson.id}/${kind}/${file.path}`;
        assert.ok(archive[name], name);
        assert.equal(strFromU8(archive[name]), await readFile(path.join(course, safeRelative(relative)), 'utf8'), name);
      }
    }
    for (const file of lesson.professionalExercise.testFiles) {
      const name = `lessons/${lesson.id}/grader/${file.path}`;
      assert.ok(archive[name], name);
      assert.equal(strFromU8(archive[name]), await readFile(path.join(course, safeRelative(file.sourcePath)), 'utf8'), name);
    }
  }
});
