const { pool } = require('../server/db/pool');

async function main() {
  const r = await pool.query("SELECT COUNT(*) FROM company_incorrect_data WHERE LOWER(error_message) LIKE '%industry%'");
  console.log('Rows with industry error in PG:', r.rows[0].count);

  const sample = await pool.query("SELECT error_id, industry, error_message FROM company_incorrect_data WHERE LOWER(error_message) LIKE '%industry%' LIMIT 3");
  console.log('Sample rows:', sample.rows);

  process.exit(0);
}

main();
