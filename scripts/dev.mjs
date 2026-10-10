import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = new Map([['/', 'index.html'], ...['index.html','app.js','engine.js','styles.css'].map(x => ['/' + x, x])]);
const mime = { html:'text/html; charset=utf-8', js:'text/javascript; charset=utf-8', css:'text/css; charset=utf-8' };
export function createServer() {
  return http.createServer(async (request, response) => {
    const file = files.get(new URL(request.url, 'http://localhost').pathname);
    if (!file || !['GET','HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const content = await readFile(resolve(root,file));
      response.writeHead(200, {'Content-Type':mime[file.split('.').pop()], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch { response.writeHead(500); response.end('Unable to read application asset'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log('Embedded Lab: http://127.0.0.1:' + port));
}
