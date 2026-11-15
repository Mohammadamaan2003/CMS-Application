const { pool } = require('../server/db/pool');

(async () => {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('PG Tables:', tables.rows.map(r => r.table_name));
  
  if (tables.rows.some(r => r.table_name === 'master_company_categories')) {
    const res = await pool.query('SELECT * FROM master_company_categories');
    console.log('master_company_categories:', res.rows);
  }
  process.exit(0);
})();

