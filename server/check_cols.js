const { pool } = require('./db/pool');

async function checkCols() {
  const comp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'");
  const cont = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts'");
  console.log('EXISTING COMPANIES COLUMNS in Postgres:');
  console.log(comp.rows.map(r => r.column_name).sort());
  console.log('EXISTING CONTACTS COLUMNS in Postgres:');
  console.log(cont.rows.map(r => r.column_name).sort());
}

checkCols().finally(() => pool.end());
