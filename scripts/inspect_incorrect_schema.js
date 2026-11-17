const { pool } = require('../server/db/pool');

async function inspectIncorrectSchema() {
  for (const t of ['company_incorrect_data', 'contact_incorrect_data']) {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [t]);
    console.log(t, res.rows.map(r => `${r.column_name} (${r.data_type})`));
  }
  process.exit(0);
}

inspectIncorrectSchema();
