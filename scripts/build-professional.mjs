import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const course = path.join(root, 'curriculum/professional');
const catalog = JSON.parse(await readFile(path.join(course, 'catalog.json'), 'utf8'));
const lessons = [], exercises = [];
const partial = process.argv.includes('--partial');
const safePath = (base, relative) => {
  if (!relative || relative.includes('\\') || relative.split('/').some((v) => !v || v === '.' || v === '..') || path.isAbsolute(relative)) throw new Error(`Unsafe course path: ${relative}`);
  const resolved = path.resolve(base, relative);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) throw new Error(`Course path escape: ${relative}`);
  return resolved;
};
const collect = async (directory, prefix, files) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'target' || entry.name === 'node_modules') continue;
    if (entry.isSymbolicLink()) throw new Error('Course symlinks are not allowed');
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file, `${prefix}${entry.name}/`, files);
    else files[`${prefix}${entry.name}`] = new Uint8Array(await readFile(file));
  }
};
await mkdir(path.join(root, 'dist/downloads'), { recursive: true });
for (const entry of catalog.lessons) {
  let lesson;
  try { lesson = JSON.parse(await readFile(safePath(course, entry.lessonPath), 'utf8')); }
  catch (error) { if (partial && error.code === 'ENOENT') continue; throw error; }
  if (lesson.id !== entry.id || !lesson.professionalExercise || !Array.isArray(lesson.quiz) || lesson.quiz.length < 2) throw new Error(`Incomplete lesson ${entry.id}`);
  const contract = lesson.professionalExercise;
  const files = [];
  for (const file of contract.files) files.push({ path: file.path, source: await readFile(safePath(course, file.templatePath), 'utf8'), editable: file.editable === true });
  const zipFiles = { 'pom.xml': new Uint8Array(await readFile(path.join(course, 'pom.xml'))) };
  const lessonDirectory = path.join(course, 'lessons', entry.id);
  for (const kind of ['reference', 'starter', 'grader']) await collect(path.join(lessonDirectory, kind), `lessons/${entry.id}/${kind}/`, zipFiles);
  zipFiles['README.txt'] = strToU8(`${lesson.title}\n\nJava 17+ 및 Maven 3.9+가 필요합니다.\n실습: lessons/${entry.id}/starter 폴더에서 mvn test\n기준 예제: lessons/${entry.id}/reference 폴더에서 mvn test\n부모 pom.xml과 grader의 상대 위치를 유지하세요.\n처음 실행 시 Maven 의존성을 내려받습니다. 테스트 판정은 교육 피드백입니다.\nRedis/Kafka 실제 연동 수업은 해당 단원의 선택 환경을 먼저 준비하세요.\n공식 출처: ${lesson.sources.map((s) => s.url).join('\n')}\n`);
  await writeFile(path.join(root, 'dist/downloads', `${entry.id}.zip`), zipSync(zipFiles, { level: 6, mtime: new Date('2000-01-01T00:00:00Z') }));
  const executionVerified = lesson.executionVerified === true && contract.executionVerified === true;
  lessons.push(lesson);
  exercises.push({ id: contract.id, lessonId: lesson.id, title: lesson.title, mode: 'project', minVersion: lesson.minVersion, profileId: contract.profileId, instructions: contract.instructions, template: contract.template, files, rubric: contract.rubric, goals: contract.behaviorCriteria, sampleDescription: '고정된 기준 구현과 공개 테스트로 업무 계약을 확인합니다.', sampleOutput: executionVerified ? '기준 테스트 실행 검증 완료' : '실제 실행 검증 전', requiresDesktop: true, executionVerified, downloadUrl: `/downloads/${entry.id}.zip` });
}
await mkdir(path.join(root, 'dist/data'), { recursive: true });
await writeFile(path.join(root, 'dist/data/professional.js'), `// Generated from reviewed curriculum/professional. Reference material is intentionally public.\nexport const professionalLessons = ${JSON.stringify(lessons, null, 2)};\nexport const professionalExercises = ${JSON.stringify(exercises, null, 2)};\n`);
console.log(`Professional curriculum: ${lessons.length}/${catalog.lessons.length} lessons and ZIP projects`);
