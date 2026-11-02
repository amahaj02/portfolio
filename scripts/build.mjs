import { mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { siteFiles } from './site-files.mjs';
import { renderProjects } from './render-projects.mjs';

await renderProjects();

const root = resolve(import.meta.dirname, '..');
await rm(resolve(root, 'dist'), { recursive: true, force: true });
for (const file of siteFiles) {
  const target = resolve(root, 'dist', file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, file), target);
}
console.log('Static site ready in dist/. Desktop map uses Three.js r128 from cdnjs.');
