const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 5500;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function serve404(res) {
  // Redirect so the browser resolves 404.html's relative assets from root
  res.writeHead(302, { Location: '/404.html' });
  res.end();
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Redirect trailing slash (except root)
  if (urlPath.length > 1 && urlPath.endsWith('/')) {
    res.writeHead(301, { Location: urlPath.slice(0, -1) });
    return res.end();
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Block path traversal
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return serve404(res);
  }

  fs.stat(filePath, (err, stat) => {
    // If it's a directory, go straight to 404 (no listing)
    if (!err && stat.isDirectory()) return serve404(res);

    // File not found — try appending .html before giving up
    if (err) {
      const withHtml = filePath + '.html';
      if (fs.existsSync(withHtml)) {
        res.writeHead(301, { Location: urlPath + '.html' });
        return res.end();
      }
      return serve404(res);
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Running at http://127.0.0.1:${PORT}/`);
});
