const { executeMcpSql } = require('./server/services/mcpSync');
const db = require('./server/db/pool');

async function inspectSalesperson() {
  try {
    const oracleTables = await executeMcpSql(`
      SELECT table_name 
      FROM all_tables 
      WHERE owner = 'CRM' AND (table_name LIKE '%SALES%' OR table_name LIKE '%PERSON%')
    `);
    console.log('Oracle salesperson tables:', oracleTables);

    for (const t of oracleTables) {
      const tname = t.TABLE_NAME || t.table_name;
      const cols = await executeMcpSql(`SELECT column_name, data_type FROM all_tab_columns WHERE owner = 'CRM' AND table_name = '${tname}'`);
      console.log(tname, 'cols:', cols.map(c => c.COLUMN_NAME || c.column_name));
      const sample = await executeMcpSql(`SELECT * FROM CRM.${tname} WHERE ROWNUM <= 5`);
      console.log(tname, 'sample:', sample);
      const cnt = await executeMcpSql(`SELECT count(*) as cnt FROM CRM.${tname}`);
      console.log(tname, 'count:', cnt);
    }

    const pgTables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%sales%'");
    console.log('PostgreSQL sales tables:', pgTables.rows);

    const contactSP = await db.query("SELECT salesperson, count(*)::int FROM contacts WHERE salesperson IS NOT NULL AND TRIM(salesperson) != '' GROUP BY salesperson ORDER BY count(*) DESC LIMIT 10");
    console.log('Contacts top salespersons:', contactSP.rows);

    const companySP = await db.query("SELECT salesperson, count(*)::int FROM companies WHERE salesperson IS NOT NULL AND TRIM(salesperson) != '' GROUP BY salesperson ORDER BY count(*) DESC LIMIT 10");
    console.log('Companies top salespersons:', companySP.rows);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
inspectSalesperson();

