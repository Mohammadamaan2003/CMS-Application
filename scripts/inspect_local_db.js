const { pool } = require('../server/db/pool');

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('PostgreSQL tables in crm_db:');
    console.log(res.rows.map(r => r.table_name).join(', '));

    for (const t of res.rows.map(r => r.table_name)) {
      if (t.includes('lead')) {
        const countRes = await pool.query(`SELECT COUNT(*) FROM ${t}`);
        console.log(`Table ${t}: ${countRes.rows[0].count} rows`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();

