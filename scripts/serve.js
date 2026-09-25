// Serves the built site (./public) to every device on the local network.
// Works with no internet connection. Usage: node scripts/serve.js [port]

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('The site is not built yet. Run "npm run build" first.');
  process.exit(1);
}

// Same URL rules as on Vercel (cleanUrls): /q/001 -> public/q/001.html
function resolve(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const base = path.normalize(path.join(ROOT, p));
  if (base !== ROOT && !base.startsWith(ROOT + path.sep)) return null;
  for (const candidate of [base, base + '.html', path.join(base, 'index.html')]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolve(req.url);
  const status = file ? 200 : 404;
  const target = file || path.join(ROOT, '404.html');
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(target).pipe(res);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Try: node scripts/serve.js ${PORT + 1}`);
  else console.error(e.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
  console.log('\nThe site is running.\n');
  console.log(`  On this computer:      http://localhost:${PORT}`);
  if (addresses.length) {
    for (const a of addresses) console.log(`  On the local network:  http://${a}:${PORT}`);
  } else {
    console.log('  (Not connected to a network - only this computer can open the site.)');
  }
  console.log('\nKeep this window open. Press Ctrl+C to stop.\n');
});
