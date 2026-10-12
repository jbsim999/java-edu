import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await import('./build-editor.mjs');
await import('./build-professional.mjs');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const files = ['index.html', 'styles.css', 'app.js', 'assets/editor.bundle.js', 'data/curriculum.js', 'data/exercises.js', 'data/job-evidence.js', 'data/professional.js'];
const assets = {};
for (const file of files) assets[`/${file}`] = { body: await readFile(path.join(root, 'dist', file), 'utf8'), type: types[path.extname(file)] };
for (const file of await readdir(path.join(root, 'dist/downloads'))) {
  if (!/^[a-z0-9-]+\.zip$/.test(file)) continue;
  assets[`/downloads/${file}`] = { body: (await readFile(path.join(root, 'dist/downloads', file))).toString('base64'), type: 'application/zip', encoding: 'base64', download: file };
}
await mkdir(path.join(root, 'worker'), { recursive: true });
await writeFile(path.join(root, 'worker/assets.generated.mjs'), `export const assets = ${JSON.stringify(assets)};\n`);
await mkdir(path.join(root, 'dist/server'), { recursive: true });
await build({ entryPoints: [path.join(root, 'worker/index.js')], outfile: path.join(root, 'dist/server/index.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: false });
try {
  const manifest = await readFile(path.join(root, '.openai/hosting.json'), 'utf8');
  await mkdir(path.join(root, 'dist/.openai'), { recursive: true });
  await writeFile(path.join(root, 'dist/.openai/hosting.json'), manifest);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Worker bundle ready: ${path.join(root, 'dist/server/index.js')}`);
