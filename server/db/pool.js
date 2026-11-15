const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || '127.0.0.1',
      port: parseInt(process.env.PGPORT, 10) || 5432,
      database: process.env.PGDATABASE || 'crm_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
    };

const pool = new Pool(poolConfig);

let isPostgresAvailable = false;
let lastDbError = null;

// Initial connection verification
pool.query('SELECT 1')
  .then(() => {
    isPostgresAvailable = true;
    lastDbError = null;
    console.log('[PostgreSQL] Connected successfully to ' + (process.env.PGDATABASE || 'crm_db'));
  })
  .catch((err) => {
    isPostgresAvailable = false;
    lastDbError = err.message;
    console.warn('[PostgreSQL Note] Could not connect to local database: ' + err.message);
    console.warn('[PostgreSQL Note] The application will use live ORDS MCP gateway fallback for seamless data viewing.');
  });

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
  isPostgresAvailable = false;
  lastDbError = err.message;
});

module.exports = {
  pool,
  connect: () => pool.connect(),
  query: (text, params) => pool.query(text, params),
  isAvailable: () => isPostgresAvailable,
  getLastError: () => lastDbError,
};
