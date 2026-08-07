/**
 * Production entry for AlwaysData / any host.
 * Working directory must be the repo root (cash_society).
 * Start command: node scripts/start-production.js
 *   OR: npm start
 */
const path = require('path');
const fs = require('fs');

// Load env from backend/.env if present (optional; site env vars still win)
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Prefer prebuilt UI from last git pull
const publicIndex = path.join(__dirname, '..', 'backend', 'public', 'index.html');
if (!fs.existsSync(publicIndex)) {
  console.error('FATAL: backend/public/index.html not found. Run host-update / ship prebuilt UI.');
  process.exit(1);
}

// Start the API + static app
require(path.join(__dirname, '..', 'backend', 'server.js'));
