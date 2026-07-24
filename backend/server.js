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

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.post('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.use('/api/members', requireAdmin, membersRouter);
app.use('/api/transactions', requireAdmin, transactionsRouter);
app.use('/api/society', requireAdmin, societyRouter);

if (hasFrontend) {
  app.use(express.static(publicDir));
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
      note: 'Frontend not bundled. Run npm run build from project root.',
    });
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  const message = err.message?.startsWith('CORS') ? err.message : 'Internal server error';
  res.status(err.message?.startsWith('CORS') ? 403 : 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Cash Society running on port ${PORT}${hasFrontend ? ' (API + frontend)' : ' (API only)'}`);
});
