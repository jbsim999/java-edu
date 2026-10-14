import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { runProcess, processEnvironment } from '../../server/local/process.mjs';

const fixedFixture = fileURLToPath(new URL('./process-fixture.mjs', import.meta.url));

test('Windows Job supervisor preserves Unicode/metacharacter argv and stops timeout process trees', { skip: process.platform !== 'win32' }, async (t) => {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'java-edu-local-test-공백 & % 🚀-'));
  t.after(async () => { const resolved = await realpath(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('java-edu-local-test-')); await rm(resolved, { recursive: true, force: true }); });
  const env = processEnvironment(undefined, root);
  // Diagnose cold-host failures without adding logging or test hooks to the product helper.
  const supervisorSource = await readFile(new URL('../../desktop/job-runner.ps1', import.meta.url), 'utf8');
  const diagnosticHelper = path.join(root, 'diagnostic-helper.ps1');
  let diagnosticSource = supervisorSource;
  for (const [needle, stage] of [
    ["$ErrorActionPreference = 'Stop'", 'helper-entered'],
    ['  Import-Module -Name', 'loading-fixed-utility-module'],
    ['  $spec = [System.IO.File]::ReadAllText', 'reading-spec'],
    ['  Add-Type -TypeDefinition', 'compiling-supervisor'],
    ['  $result = [JavaEduJob]::Run', 'supervisor-compiled'],
    ['  $report = @{', 'supervisor-returned'],
  ]) {
    assert.ok(diagnosticSource.includes(needle), `Missing PowerShell diagnostic point: ${stage}`);
    diagnosticSource = diagnosticSource.replace(needle, `[Console]::Error.WriteLine('Java Edu CI stage: ${stage} ' + [DateTime]::UtcNow.ToString('o'))\n${needle}`);
  }
  diagnosticSource = diagnosticSource.replace('  Add-Type -TypeDefinition', `[Console]::Error.WriteLine('Java Edu CI platform: codepage=' + [System.Text.Encoding]::Default.CodePage + '; elevated=' + (New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator))\n  Add-Type -TypeDefinition`);
  diagnosticSource = diagnosticSource.replace(" + $_.Exception.Message)", " + $_.Exception.ToString())");
  for (const [needle, stage] of [
    ['      parent = OpenProcess', 'opening-parent'],
    ['      job = CreateJobObject', 'creating-job'],
    ['      Check(CreateProcess', 'creating-child'],
    ['      if (ResumeThread', 'resuming-child'],
    ['      var reason = "exited";', 'waiting-child'],
    ['      uint code; Check(GetExitCodeProcess', 'child-wait-finished'],
  ]) {
    assert.ok(diagnosticSource.includes(needle), `Missing native diagnostic point: ${stage}`);
    diagnosticSource = diagnosticSource.replace(needle, `      Console.Error.WriteLine("Java Edu CI stage: ${stage} " + DateTime.UtcNow.ToString("o"));\n${needle}`);
  }
  await writeFile(diagnosticHelper, `\ufeff${diagnosticSource}`);
  const argv = ['공백 포함', 'a&b%PATH%', 'a"quoted"', 'trailing\\', ''];
  let compilerTemp;
  const echo = await runProcess(process.execPath, [fixedFixture, 'echo', ...argv], {
    cwd: root, env,
    spawnImpl: (command, args, options) => {
      const fileIndex = args.indexOf('-File');
      assert.ok(fileIndex >= 0, 'Windows supervisor must execute its fixed script.');
      const diagnosticArgs = [...args];
      diagnosticArgs[fileIndex + 1] = diagnosticHelper;
      compilerTemp = options.env.TEMP;
      assert.equal(options.env.TMP, compilerTemp);
      assert.equal(path.dirname(compilerTemp), parent);
      assert.notEqual(compilerTemp, root);
      return spawn(command, diagnosticArgs, options);
    },
  });
  assert.equal(echo.exitCode, 0, `Node ${process.version}; supervisor echo result: ${JSON.stringify(echo)}`);
  t.diagnostic(`Node ${process.version}; supervisor echo completed in ${echo.durationMs}ms`);
  t.diagnostic(echo.stderr.split(/\r?\n/).find((line) => line.startsWith('Java Edu CI platform:')));
  assert.deepEqual(JSON.parse(echo.stdout), argv);
  await assert.rejects(realpath(compilerTemp), { code: 'ENOENT' });
  assert.equal(env.TEMP, root, 'Starting the helper must not mutate the learner environment object.');
  let nextCompilerTemp;
  const childEnvironment = await runProcess(process.execPath, ['-p', 'JSON.stringify([process.env.TEMP,process.env.TMP,process.cwd()])'], { cwd: root, env, spawnImpl: (command, args, options) => { nextCompilerTemp = options.env.TEMP; return spawn(command, args, options); } });
  assert.equal(childEnvironment.exitCode, 0, JSON.stringify(childEnvironment));
  assert.deepEqual(JSON.parse(childEnvironment.stdout), [root, root, root]);
  assert.notEqual(nextCompilerTemp, compilerTemp, 'Supervisor compilation directories must not be shared across invocations.');
  await assert.rejects(realpath(nextCompilerTemp), { code: 'ENOENT' });
  const foreignModules = path.join(root, 'foreign-modules');
  const foreignUtility = path.join(foreignModules, 'Microsoft.PowerShell.Utility');
  await mkdir(foreignUtility, { recursive: true });
  await writeFile(path.join(foreignUtility, 'Microsoft.PowerShell.Utility.psd1'), "@{ RootModule = 'Microsoft.PowerShell.Utility.psm1'; ModuleVersion = '99.0'; FunctionsToExport = @('ConvertFrom-Json', 'Add-Type') }");
  await writeFile(path.join(foreignUtility, 'Microsoft.PowerShell.Utility.psm1'), "function ConvertFrom-Json { throw 'Unexpected third-party module discovery' }; function Add-Type { throw 'Unexpected third-party module discovery' }");
  const fixedModule = await runProcess(process.execPath, [fixedFixture, 'echo', 'fixed-os-module'], { cwd: root, env: { ...env, PSModulePath: foreignModules } });
  assert.equal(fixedModule.exitCode, 0, JSON.stringify(fixedModule));
  assert.deepEqual(JSON.parse(fixedModule.stdout), ['fixed-os-module']);
  const pidfile = path.join(root, 'child.pid');
  const tree = await runProcess(process.execPath, [fixedFixture, 'tree', pidfile], { cwd: root, env, timeoutMs: 1200 });
  assert.equal(tree.reason, 'timeout', tree.stderr);
  const childPid = Number(await readFile(pidfile, 'utf8'));
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
  let overflowCompilerTemp;
  const flood = await runProcess(process.execPath, [fixedFixture, 'overflow'], { cwd: root, env, outputLimit: 1024, spawnImpl: (command, args, options) => { overflowCompilerTemp = options.env.TEMP; return spawn(command, args, options); } });
  assert.equal(flood.reason, 'output_limit');
  assert.ok(Buffer.byteLength(flood.stdout) <= 1024);
  await assert.rejects(realpath(overflowCompilerTemp), { code: 'ENOENT' });
  const orphanPidfile = path.join(root, 'orphan-child.pid');
  const parentProcess = spawn(process.execPath, [fixedFixture, 'supervisor-parent', root, orphanPidfile], { cwd: root, env: { ...env, TEMP: parent, TMP: parent }, shell: false, windowsHide: true, stdio: 'ignore' });
  t.after(() => { if (parentProcess.exitCode === null) parentProcess.kill(); });
  let orphanPid;
  for (let retry = 0; retry < 60 && !orphanPid; retry++) { await delay(100); orphanPid = Number(await readFile(orphanPidfile, 'utf8').catch(() => '')); }
  assert.ok(orphanPid, 'Supervised descendant must have started.');
  parentProcess.kill();
  let alive = true;
  for (let retry = 0; retry < 30 && alive; retry++) { await delay(100); try { process.kill(orphanPid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; } }
  assert.equal(alive, false, 'Opened parent-process handle must trigger descendant cleanup after app termination.');
  // Instrument only a private test copy to pause exactly after creation and before ResumeThread.
  const createdPidfile = path.join(root, 'suspended.pid');
  const escapedPidfile = createdPidfile.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const instrumented = supervisorSource.replace(/(Check\(CreateProcess\(executable,[^\r\n]+\);\r?\n)/, `$1      System.IO.File.WriteAllText("${escapedPidfile}", pi.pid.ToString()); System.Threading.Thread.Sleep(30000);\n`);
  assert.notEqual(instrumented, supervisorSource);
  const helperFile = path.join(root, 'instrumented-helper.ps1');
  const specFile = path.join(root, 'boundary-command.json');
  const boundaryCompilerTemp = await mkdtemp(path.join(parent, 'java-edu-local-helper-test-'));
  t.after(async () => { const verified = await realpath(boundaryCompilerTemp); assert.equal(path.dirname(verified), parent); assert.ok(path.basename(verified).startsWith('java-edu-local-helper-test-')); await rm(verified, { recursive: true, force: true }); });
  await writeFile(helperFile, `\ufeff${instrumented}`); // Windows PowerShell 5 must read the injected Unicode fixture path as UTF-8.
  await writeFile(specFile, JSON.stringify({ executable: process.execPath, args: [fixedFixture, 'echo', 'boundary'], cwd: root, timeoutMs: 5000, memoryMiB: 384, maxProcesses: 8, parentPid: process.pid, resultPath: path.join(root, 'boundary-result.json') }));
  const powershell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const helper = spawn(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperFile, '-SpecPath', specFile], { cwd: root, env: { ...env, TEMP: boundaryCompilerTemp, TMP: boundaryCompilerTemp }, shell: false, windowsHide: true, stdio: 'ignore' });
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
