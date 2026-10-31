'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { StateStore } = require('./state_store');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const store = new StateStore();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

const sseClients = new Set();

function broadcastUpdate(version, actionType) {
  const payload = JSON.stringify({ version, action: actionType, at: Date.now() });
  const message = `event: update\ndata: ${payload}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Heartbeat for SSE connections
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 25000).unref();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) { // 10MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function resolveStaticFile(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  const root = __dirname;
  const v4Dir = path.join(root, 'MockUI', 'v4');

  // Exact root or index
  if (clean === '/' || clean === '\\' || clean === 'index.html') {
    return path.join(v4Dir, 'index.html');
  }

  // Brand assets
  if (clean.includes('brand')) {
    const brandFile = clean.split(/brand[\/\\]/).pop();
    const candidate = path.join(root, 'Demo', 'frontend', 'brand', brandFile);
    if (fs.existsSync(candidate)) return candidate;
  }

  // Tokens / Design system
  if (clean.includes('tokens.css')) {
    const candidate = path.join(root, 'MockUI', 'v4-plan', 'design-system', 'shehnat', 'tokens.css');
    if (fs.existsSync(candidate)) return candidate;
  }

  // Direct MockUI/v4 files
  const v4Candidate = path.join(v4Dir, clean.replace(/^MockUI[\/\\]v4[\/\\]/, ''));
  if (fs.existsSync(v4Candidate) && fs.statSync(v4Candidate).isFile()) {
    return v4Candidate;
  }

  // General repo fallback
  const directCandidate = path.join(root, clean);
  if (fs.existsSync(directCandidate) && fs.statSync(directCandidate).isFile()) {
    return directCandidate;
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API Endpoints ---
  if (pathname === '/api/state' && method === 'GET') {
    const { state, version } = store.getState();
    sendJson(res, 200, { ok: true, state, version });
    return;
  }

  if (pathname === '/api/dispatch' && method === 'POST') {
    try {
      const action = await readBody(req);
      const result = store.dispatchAction(action);
      if (result.ok) {
        broadcastUpdate(result.version, action.type);
        sendJson(res, 200, result);
      } else {
        sendJson(res, 400, result);
      }
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"ok":true}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (pathname === '/dev/clock' && method === 'POST') {
    try {
      const body = await readBody(req);
      const days = Number(body.days) || 1;
      const result = store.advanceClock(days);
      if (result.ok) {
        broadcastUpdate(result.version, 'clock');
        sendJson(res, 200, result);
      } else {
        sendJson(res, 400, result);
      }
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/dev/reset' && method === 'POST') {
    const result = store.resetState();
    broadcastUpdate(result.version, 'reset');
    sendJson(res, 200, { ok: true, state: result.state, version: result.version });
    return;
  }

  if (pathname === '/health' && method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      uae: true,
      version: store.getState().version,
      activeClients: sseClients.size,
      uptime: process.uptime()
    });
    return;
  }

  // --- Static Files ---
  if (method === 'GET' || method === 'HEAD') {
    const filePath = resolveStaticFile(pathname);
    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      if (method === 'GET') {
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.end();
      }
      return;
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` Shehnat UAE Demo Server Running on http://localhost:${PORT}`);
    console.log(` Serving Paper-Column UI with Multi-User Real-Time Sync `);
    console.log(`=======================================================`);
  });
}

module.exports = { server, store, broadcastUpdate };
