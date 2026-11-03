import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { siteFiles } from './site-files.mjs';
import { renderProjects } from './render-projects.mjs';

await renderProjects();

const root = resolve(import.meta.dirname, '..');
const types = { '.png': 'image/png', '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const allowed = new Set(siteFiles.map(file => `/${file}`));
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = path === '/' ? '/index.html' : path;
  if (!allowed.has(file)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
    return;
  }
  try {
    const content = await readFile(resolve(root, `.${file}`));
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Portfolio: http://localhost:${port}`));
