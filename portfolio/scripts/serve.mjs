import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(root, '..');
const build = spawn(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { stdio: 'inherit' });
build.on('exit', (code) => {
  if (code !== 0) {
    process.exitCode = code || 1;
    return;
  }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.csv': 'text/csv' };
  createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = requestPath === '/' ? 'portfolio/index.html' : requestPath.replace(/^\/+/, '');
      let target = path.resolve(projectRoot, relative);
      if (!target.startsWith(projectRoot + path.sep)) throw new Error('Invalid path.');
      try {
        if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      } catch {
        if (!path.extname(target)) target = path.join(target, 'index.html');
      }
      const body = await readFile(target);
      response.writeHead(200, { 'content-type': types[path.extname(target)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  }).listen(4173, '127.0.0.1', () => console.log('Portfolio preview: http://127.0.0.1:4173/portfolio/'));
});
