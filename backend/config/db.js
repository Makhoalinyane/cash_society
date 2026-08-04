const mysql = require('mysql2/promise');
require('dotenv').config();

const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === '1' ||
  process.env.DB_SSL === 'required';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cash_society',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Keep DATE values as YYYY-MM-DD so due-day / late checks are not shifted by timezone
  dateStrings: true,
  // AlwaysData (and most free cloud MySQL) require TLS for remote connections
  ...(useSsl
    ? {
        ssl: {
          // Free hosts often use certs Node doesn't trust by default
          rejectUnauthorized: process.env.DB_SSL_STRICT === 'true',
        },
      }
    : {}),
});

pool.on('connection', () => {
  // no-op: ensures pool event wiring works
});

module.exports = pool;
