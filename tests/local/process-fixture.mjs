// Fixed maintenance fixtures, never learner-supplied commands.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (process.argv[2] === 'echo') process.stdout.write(JSON.stringify(process.argv.slice(3)));
else if (process.argv[2] === 'overflow') { for (let index = 0; index < 5_000; index++) process.stdout.write('x'.repeat(100)); }
else if (process.argv[2] === 'sleep') { writeFileSync(process.argv[3], String(process.pid)); setInterval(() => {}, 1000); }
else if (process.argv[2] === 'tree') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'sleep', process.argv[3]], { stdio: 'inherit', shell: false, windowsHide: true });
  process.stdout.write(`CHILD:${child.pid}\n`);
  setInterval(() => {}, 1000);
}
else if (process.argv[2] === 'supervisor-parent') {
  const { runProcess, processEnvironment } = await import('../../server/local/process.mjs');
  await runProcess(process.execPath, [fileURLToPath(import.meta.url), 'tree', process.argv[4]], { cwd: process.argv[3], env: processEnvironment(undefined, process.argv[3]), timeoutMs: 20_000 });
}
