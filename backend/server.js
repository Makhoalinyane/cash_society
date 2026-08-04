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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('DB health check failed:', err.code || '', err.message || err);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message || err.code || 'Database connection failed',
      code: err.code || null,
    });
  }
});

app.post('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.use('/api/members', requireAdmin, membersRouter);
app.use('/api/transactions', requireAdmin, transactionsRouter);
app.use('/api/society', requireAdmin, societyRouter);

if (hasFrontend) {
  app.use(express.static(publicDir, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    index: false,
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Cash Society API',
      health: '/api/health',
      status: 'running',
    });
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Cash Society running on port ${PORT}${hasFrontend ? ' (API + frontend)' : ' (API only)'}`);
});
