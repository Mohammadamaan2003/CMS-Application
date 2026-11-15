const { pool } = require('../server/db/pool');

(async () => {
  const res = await pool.query("SELECT DISTINCT country FROM companies WHERE LOWER(country) IN ('muscat', 'new cairo city', 'oregan')");
  console.log('Unmatched in PG companies:', res.rows);
  process.exit(0);
})();

