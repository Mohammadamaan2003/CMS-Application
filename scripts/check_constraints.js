const { pool } = require('../server/db/pool');

(async () => {
  const constraints = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'companies'::regclass
  `);
  console.log('Postgres companies constraints:', constraints.rows);
  process.exit(0);
})();

