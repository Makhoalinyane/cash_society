require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { requireAdmin } = require('./middleware/requireAdmin');

const membersRouter = require('./routes/members');
const transactionsRouter = require('./routes/transactions');
const societyRouter = require('./routes/society');

const app = express();
const PORT = process.env.PORT || 5000;
const publicDir = path.join(__dirname, 'public');
const hasFrontend = fs.existsSync(path.join(publicDir, 'index.html'));

function readDeployVersion() {
  try {
    const p = path.join(__dirname, '.deploy-version');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  } catch (_) { /* ignore */ }
  try {
    const p = path.join(publicDir, 'deploy-version.txt');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim().split(/\s+/)[0];
  } catch (_) { /* ignore */ }
  return null;
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Do not long-cache HTML so new deploys appear after restart + hard refresh
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      commit: readDeployVersion(),
      frontend: hasFrontend,
    });
  } catch (err) {
    console.error('DB health check failed:', err.code || '', err.message || err);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message || err.code || 'Database connection failed',
      code: err.code || null,
      commit: readDeployVersion(),
      frontend: hasFrontend,
    });
  }
});

app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    commit: readDeployVersion(),
    frontend: hasFrontend,
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

app.post('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.use('/api/members', requireAdmin, membersRouter);
app.use('/api/transactions', requireAdmin, transactionsRouter);
app.use('/api/society', requireAdmin, societyRouter);

if (hasFrontend) {
  app.use(express.static(publicDir, {
    etag: true,
    lastModified: true,
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Cash Society API',
      health: '/api/health',
      version: '/api/version',
      status: 'running (API only — frontend build missing)',
    });
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const HOST = process.env.IP || process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(
    `Cash Society on ${HOST}:${PORT}${hasFrontend ? ' (API + frontend)' : ' (API only)'} commit=${readDeployVersion() || 'unknown'}`
  );
});
