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

function redirect(res, location) {
  res.writeHead(301, { Location: location });
  res.end();
}

function isInsideRoot(filePath) {
  return filePath.startsWith(ROOT + path.sep) || filePath === ROOT;
}

function serveFile(filePath, res) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Hide explicit index.html in browser URLs.
  if (urlPath.endsWith('/index.html')) {
    return redirect(res, urlPath.slice(0, -'index.html'.length));
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Block path traversal
  if (!isInsideRoot(filePath)) {
    return serve404(res);
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (!urlPath.endsWith('/')) return redirect(res, urlPath + '/');
      if (fs.existsSync(indexFile)) return serveFile(indexFile, res);
      return serve404(res);
    }

    if (err) {
      if (urlPath.endsWith('.html')) {
        const directoryIndex = path.join(ROOT, urlPath.replace(/\.html$/, '/index.html'));
        if (fs.existsSync(directoryIndex)) {
          return redirect(res, urlPath.replace(/\.html$/, '/'));
        }
      }

      const extensionlessIndex = path.join(filePath, 'index.html');
      if (fs.existsSync(extensionlessIndex)) {
        return redirect(res, urlPath.endsWith('/') ? urlPath : urlPath + '/');
      }

      return serve404(res);
    }

    serveFile(filePath, res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Running at http://127.0.0.1:${PORT}/`);
});
