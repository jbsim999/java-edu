import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalError } from './errors.mjs';

const windowsRunner = fileURLToPath(new URL('../../desktop/job-runner.ps1', import.meta.url)).replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2');
export const OUTPUT_LIMIT = 128 * 1024;

/** Deliberately excludes inherited Java/Maven options, proxy credentials and app secrets. */
export function processEnvironment(javaHome, temporaryDirectory) {
  const env = {};
  for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'LANG', 'LC_ALL']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  env.TEMP = temporaryDirectory;
  env.TMP = temporaryDirectory;
  env.HOME = temporaryDirectory;
  env.USERPROFILE = temporaryDirectory;
  if (process.platform === 'win32') {
    env.SystemDrive = path.parse(process.env.SystemRoot || 'C:\\Windows').root.replace(/[\\/]+$/, '');
    env.PATHEXT = '.EXE;.COM'; // Surefire's fixed Windows launcher resolves java without an extension.
  }
  if (javaHome) env.JAVA_HOME = javaHome;
  env.PATH = [javaHome && path.join(javaHome, 'bin'), process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32') : '/usr/bin:/bin'].filter(Boolean).join(path.delimiter);
  return env;
}

/** Each Windows command starts suspended inside a kernel Job Object, before Java can create children. */
export async function runProcess(executable, args, {
  cwd, signal, timeoutMs = 15_000, outputLimit = OUTPUT_LIMIT, memoryMiB = 384,
  maxProcesses = 8, env = processEnvironment(undefined, cwd), spawnImpl = spawn,
} = {}) {
  if (!path.isAbsolute(executable) || !path.isAbsolute(cwd) || !Array.isArray(args) || args.some((arg) => typeof arg !== 'string' || arg.includes('\0'))) {
    throw new LocalError('invalid_command', '실행 경로와 인수를 확인할 수 없습니다.', 500);
  }
  if (signal?.aborted) throw new LocalError('request_cancelled', '실행을 취소했습니다.', 499);
  const invocationId = randomUUID();
  const specPath = path.join(cwd, `.command-${invocationId}.json`);
  const resultPath = path.join(cwd, `.command-${invocationId}.result.json`);
  let command = executable;
  let commandArgs = args;
  if (process.platform === 'win32') {
    await writeFile(specPath, JSON.stringify({ executable, args, cwd, timeoutMs, memoryMiB, maxProcesses, parentPid: process.pid, resultPath }), { flag: 'wx' });
    command = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    commandArgs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', windowsRunner, '-SpecPath', specPath];
  }
  try {
    return await new Promise((resolve, reject) => {
      let child;
      let stdout = '';
      let stderr = '';
      let bytes = 0;
      let stopped;
      let settled = false;
      const started = Date.now();
      const stop = (reason) => {
        stopped ||= reason;
        if (!child?.pid) return;
        if (process.platform === 'win32') child.kill(); // Closing the helper closes its Job handle.
        else {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
        }
      };
      const onAbort = () => stop('cancelled');
      const finish = async (exitCode, spawnError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (process.platform !== 'win32' && child?.pid) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already reaped */ }
        }
        let report;
        if (process.platform === 'win32') {
          try { report = JSON.parse(await readFile(resultPath, 'utf8')); } catch { /* Helper can be killed before reporting. */ }
        }
        if (spawnError) return reject(new LocalError('process_start_failed', '실행 파일을 시작할 수 없습니다. 도구 경로와 권한을 확인하세요.', 503));
        const reason = stopped || report?.reason || 'exited';
        resolve({ exitCode: report?.exitCode ?? exitCode ?? -1, reason, stdout, stderr, durationMs: Date.now() - started });
      };
      const timer = setTimeout(() => stop('timeout'), timeoutMs + (process.platform === 'win32' ? 15_000 : 0));
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        child = spawnImpl(command, commandArgs, { cwd, env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) { void finish(-1, error); return; }
      for (const [stream, key] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
        stream.setEncoding('utf8');
        stream.on('data', (chunk) => {
          bytes += Buffer.byteLength(chunk);
          const available = Math.max(0, outputLimit - Buffer.byteLength(stdout) - Buffer.byteLength(stderr));
          const part = new TextDecoder().decode(Buffer.from(chunk).subarray(0, available), { stream: true });
          if (key === 'stdout') stdout += part;
          else stderr += part;
          if (bytes > outputLimit) stop('output_limit');
        });
      }
      child.once('error', (error) => void finish(-1, error));
      child.once('close', (code) => void finish(code));
      if (signal?.aborted) stop('cancelled');
    });
  } finally {
    if (process.platform === 'win32') await Promise.all([rm(specPath, { force: true }), rm(resultPath, { force: true })]);
  }
}
