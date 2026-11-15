const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const tables = ['LEAD', 'LEAD_LINE', 'LEAD_CONTACT', 'NAUKRI_ADVERTISEMENT', 'PROPOSALS'];
    for (const t of tables) {
      console.log(`\n=================== COLUMNS FOR CRM.${t} ===================`);
      const cols = await executeMcpSql(`SELECT COLUMN_ID, COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM ALL_TAB_COLUMNS WHERE OWNER = 'CRM' AND TABLE_NAME = '${t}' ORDER BY COLUMN_ID`);
      for (const c of cols) {
        console.log(`  ${c.COLUMN_ID || c.column_id}: ${c.COLUMN_NAME || c.column_name} (${c.DATA_TYPE || c.data_type}) NULLABLE=${c.NULLABLE || c.nullable}`);
      }
      
      console.log(`\nSample row from CRM.${t}:`);
      const sample = await executeMcpSql(`SELECT * FROM CRM.${t} WHERE ROWNUM <= 1`);
      console.log(JSON.stringify(sample[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

