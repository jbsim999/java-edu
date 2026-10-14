import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(new URL('../dist/editor.js', import.meta.url));
const assets = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const outfile = fileURLToPath(new URL('../dist/assets/editor.bundle.js', import.meta.url));
await mkdir(assets, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: [source], outfile,
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  minify: true, sourcemap: false, legalComments: 'inline', charset: 'utf8',
  write: false, metafile: true,
});

// Keep complete notices for exactly the dependencies included in this bundle.
const packageRoots = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const absoluteInput = resolve(root, input).replaceAll('\\', '/');
  const marker = '/node_modules/';
  const dependencyStart = absoluteInput.lastIndexOf(marker);
  if (dependencyStart === -1) continue;
  const packageParts = absoluteInput.slice(dependencyStart + marker.length).split('/');
  const packageName = packageParts.slice(0, packageParts[0].startsWith('@') ? 2 : 1).join('/');
  packageRoots.add(`${absoluteInput.slice(0, dependencyStart + marker.length)}${packageName}`);
}
const notices = await Promise.all([...packageRoots].map(async (packageRoot) => {
  const metadata = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  let license;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt']) {
    try {
      license = await readFile(resolve(packageRoot, filename), 'utf8');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!license?.trim()) throw new Error(`Missing license notice for ${metadata.name}@${metadata.version}`);
  return { name: `${metadata.name}@${metadata.version}`, license };
}));
notices.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const noticeText = notices.map(({ name, license }) => `${name}\n${license}`).join('\n\n');
const banner = `/*! Third-party license notices\n\n${noticeText.replaceAll('*/', '* /')}\n*/\n`;
const bundle = result.outputFiles.find((file) => resolve(file.path) === resolve(outfile));
if (!bundle) throw new Error('The editor build did not produce its expected JavaScript bundle.');
await writeFile(outfile, banner + bundle.text, 'utf8');
console.log(`Java editor bundle ready: dist/assets/editor.bundle.js (${notices.length} license notices)`);
