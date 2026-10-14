import { mkdir, mkdtemp, rm, realpath, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LocalError } from './errors.mjs';

export function safeRelativePath(value) {
  if (typeof value !== 'string' || value.length > 240 || !/^[A-Za-z0-9_.\-/]+$/.test(value)
    || value.startsWith('/') || value.includes('\\') || value.split('/').some((part) => !part || part === '.' || part === '..')
    || value.split('/').some((part) => /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
    || path.isAbsolute(value)) throw new LocalError('invalid_file_path', '교재에 등록된 상대 경로만 사용할 수 있습니다.');
  return value;
}

export async function readTrustedFile(root, relative) {
  safeRelativePath(relative);
  const base = await realpath(root);
  const target = await realpath(path.join(base, relative)).catch(() => null);
  if (!target || !target.startsWith(`${base}${path.sep}`)) throw new LocalError('project_configuration', '교재 파일 경로를 확인할 수 없습니다.', 500);
  const info = await lstat(target);
  if (!info.isFile() || info.size > 256 * 1024) throw new LocalError('project_configuration', '교재 파일 형식이나 크기를 확인할 수 없습니다.', 500);
  return readFile(target, 'utf8');
}

export async function createJobWorkspace(dataRoot) {
  const jobsRoot = path.join(dataRoot, 'jobs');
  await mkdir(jobsRoot, { recursive: true });
  const verifiedRoot = await realpath(jobsRoot);
  const directory = await mkdtemp(path.join(verifiedRoot, 'job-'));
  const files = new Set();
  return {
    directory,
    async write(relative, content) {
      safeRelativePath(relative);
      if (files.has(relative)) throw new LocalError('duplicate_file', '실습 파일 경로가 중복되었습니다.', 500);
      files.add(relative);
      const target = path.resolve(directory, relative);
      if (!target.startsWith(`${directory}${path.sep}`)) throw new Error('Workspace escape.');
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, { flag: 'wx', mode: 0o600 });
      return target;
    },
    async dispose() {
      // Only this invocation's verified, directly owned job-* directory is eligible for recursive cleanup.
      const current = await realpath(directory).catch(() => null);
      if (current === directory && path.dirname(current) === verifiedRoot && path.basename(current).startsWith('job-')) {
        await rm(current, { recursive: true, force: true, maxRetries: 3 });
      }
    },
  };
}
