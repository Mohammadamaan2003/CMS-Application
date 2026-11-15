const { pool } = require('../server/db/pool');

(async () => {
  const tech = await pool.query('SELECT * FROM master_technologies LIMIT 10');
  console.log('master_technologies count:', tech.rows.length, tech.rows.map(r => r.technology || r.name));

  const ind = await pool.query('SELECT * FROM master_industries LIMIT 10');
  console.log('master_industries count:', ind.rows.length, ind.rows.map(r => r.industry || r.name));

  const types = await pool.query('SELECT * FROM master_company_types');
  console.log('master_company_types:', types.rows.map(r => r.company_type || r.name));

  const sizes = await pool.query('SELECT * FROM master_company_sizes');
  console.log('master_company_sizes:', sizes.rows.map(r => r.master_company_size || r.employee_size || r.name));

  process.exit(0);
})();

