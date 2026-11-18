// Zero-dependency static server for local development.
//
// PosterBot is plain static files, but it must be served over http:// rather than
// opened as file:// — the PDF.js worker will not load from a file:// origin.
//
//   node serve.mjs [port]
//
// Python's `http.server` is not used here: on Windows it resets the connection
// partway through the larger vendor bundles when the browser requests several of
// them at once, which surfaces as `pdfjsLib is not defined`.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname);
const port = Number(process.argv[2]) || 4178;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  const started = Date.now();
  let status = 200;

  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    // Resolve inside root only — reject any traversal outside it.
    const target = resolve(join(root, normalize(pathname)));
    if (target !== root && !target.startsWith(root + sep)) {
      status = 403;
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Forbidden\n');
      return;
    }

    const info = await stat(target).catch(() => null);
    if (!info || !info.isFile()) {
      status = 404;
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found\n');
      return;
    }

    res.writeHead(200, {
      'content-type': types[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      // Always revalidate, so an edit shows up on reload.
      'cache-control': 'no-cache',
    });
    createReadStream(target).pipe(res);
  } catch (error) {
    status = 500;
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error\n');
    console.error(error);
  } finally {
    res.on('close', () => {
      console.log(`${req.method} ${req.url} ${status} ${Date.now() - started}ms`);
    });
  }
}).listen(port, () => {
  console.log(`PosterBot dev server on http://localhost:${port} (serving ${root})`);
});
