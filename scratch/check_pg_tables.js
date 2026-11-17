const { pool } = require('../server/db/pool');

async function main() {
  const r = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'company_incorrect_data' 
    ORDER BY ordinal_position
  `);
  console.log('company_incorrect_data cols:', r.rows.map(x => x.column_name));

  const r2 = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'contact_incorrect_data' 
    ORDER BY ordinal_position
  `);
  console.log('contact_incorrect_data cols:', r2.rows.map(x => x.column_name));

  process.exit(0);
}

main();
