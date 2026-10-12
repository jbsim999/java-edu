import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { runProcess, processEnvironment } from '../../server/local/process.mjs';

const fixedFixture = fileURLToPath(new URL('./process-fixture.mjs', import.meta.url));

test('Windows Job supervisor preserves Unicode/metacharacter argv and stops timeout process trees', { skip: process.platform !== 'win32' }, async (t) => {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'java-edu-local-test-공백 & %-'));
  t.after(async () => { const resolved = await realpath(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('java-edu-local-test-')); await rm(resolved, { recursive: true, force: true }); });
  const env = processEnvironment(undefined, root);
  const argv = ['공백 포함', 'a&b%PATH%', 'a"quoted"', 'trailing\\', ''];
  const echo = await runProcess(process.execPath, [fixedFixture, 'echo', ...argv], { cwd: root, env });
  assert.equal(echo.exitCode, 0, echo.stderr);
  assert.deepEqual(JSON.parse(echo.stdout), argv);
  const pidfile = path.join(root, 'child.pid');
  const tree = await runProcess(process.execPath, [fixedFixture, 'tree', pidfile], { cwd: root, env, timeoutMs: 1200 });
  assert.equal(tree.reason, 'timeout', tree.stderr);
  const childPid = Number(await readFile(pidfile, 'utf8'));
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
  const flood = await runProcess(process.execPath, [fixedFixture, 'overflow'], { cwd: root, env, outputLimit: 1024 });
  assert.equal(flood.reason, 'output_limit');
  assert.ok(Buffer.byteLength(flood.stdout) <= 1024);
  const orphanPidfile = path.join(root, 'orphan-child.pid');
  const parentProcess = spawn(process.execPath, [fixedFixture, 'supervisor-parent', root, orphanPidfile], { cwd: root, env, shell: false, windowsHide: true, stdio: 'ignore' });
  t.after(() => { if (parentProcess.exitCode === null) parentProcess.kill(); });
  let orphanPid;
  for (let retry = 0; retry < 60 && !orphanPid; retry++) { await delay(100); orphanPid = Number(await readFile(orphanPidfile, 'utf8').catch(() => '')); }
  assert.ok(orphanPid, 'Supervised descendant must have started.');
  parentProcess.kill();
  let alive = true;
  for (let retry = 0; retry < 30 && alive; retry++) { await delay(100); try { process.kill(orphanPid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; } }
  assert.equal(alive, false, 'Opened parent-process handle must trigger descendant cleanup after app termination.');
  // Instrument only a private test copy to pause exactly after creation and before ResumeThread.
  const supervisorSource = await readFile(new URL('../../desktop/job-runner.ps1', import.meta.url), 'utf8');
  const createdPidfile = path.join(root, 'suspended.pid');
  const escapedPidfile = createdPidfile.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const instrumented = supervisorSource.replace(/(Check\(CreateProcess\(executable,[^\r\n]+\);\r?\n)/, `$1      System.IO.File.WriteAllText("${escapedPidfile}", pi.pid.ToString()); System.Threading.Thread.Sleep(30000);\n`);
  assert.notEqual(instrumented, supervisorSource);
  const helperFile = path.join(root, 'instrumented-helper.ps1');
  const specFile = path.join(root, 'boundary-command.json');
  await writeFile(helperFile, `\ufeff${instrumented}`); // Windows PowerShell 5 must read the injected Unicode fixture path as UTF-8.
  await writeFile(specFile, JSON.stringify({ executable: process.execPath, args: [fixedFixture, 'echo', 'boundary'], cwd: root, timeoutMs: 5000, memoryMiB: 384, maxProcesses: 8, parentPid: process.pid, resultPath: path.join(root, 'boundary-result.json') }));
  const powershell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const helper = spawn(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperFile, '-SpecPath', specFile], { cwd: root, env, shell: false, windowsHide: true, stdio: 'ignore' });
  t.after(() => { if (helper.exitCode === null) helper.kill(); });
  let suspendedPid;
  for (let retry = 0; retry < 60 && !suspendedPid; retry++) { await delay(100); suspendedPid = Number(await readFile(createdPidfile, 'utf8').catch(() => '')); }
  assert.ok(suspendedPid, 'Suspended child must have been created.');
  t.after(() => { try { process.kill(suspendedPid); } catch { /* supervisor already cleaned up */ } });
  helper.kill();
  let suspendedAlive = true;
  for (let retry = 0; retry < 30 && suspendedAlive; retry++) { await delay(100); try { process.kill(suspendedPid, 0); } catch (error) { if (error.code === 'ESRCH') suspendedAlive = false; else throw error; } }
  assert.equal(suspendedAlive, false, 'Atomic Job-list creation must clean up even before ResumeThread.');
});
