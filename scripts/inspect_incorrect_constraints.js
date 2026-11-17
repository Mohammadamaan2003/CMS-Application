const { pool } = require('../server/db/pool');

async function inspectConstraints() {
  const res = await pool.query(`
    SELECT conname, contype, relname 
    FROM pg_constraint c 
    JOIN pg_class t ON c.conrelid = t.oid 
    WHERE relname IN ('company_incorrect_data', 'contact_incorrect_data')
  `);
  console.log('Constraints on incorrect data tables:', res.rows);
  process.exit(0);
}

inspectConstraints();
