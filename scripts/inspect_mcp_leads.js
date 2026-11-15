const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    console.log('Querying MCP Oracle DB for CRM tables...');
    const allCrmTables = await executeMcpSql("SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = 'CRM' ORDER BY TABLE_NAME");
    console.log('All CRM tables count:', allCrmTables.length);
    const tableNames = allCrmTables.map(t => t.TABLE_NAME || t.table_name);
    console.log('All CRM tables:', tableNames.join(', '));

    const leadTables = tableNames.filter(t => 
      t.includes('LEAD') || t.includes('LINE') || t.includes('NAUKRI') || t.includes('PROPOSAL') || t.includes('RESOURCE')
    );
    console.log('\nRelevant tables:', leadTables);

    for (const t of leadTables) {
      console.log(`\n=================== COLUMNS FOR CRM.${t} ===================`);
      const cols = await executeMcpSql(`SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM ALL_TAB_COLUMNS WHERE OWNER = 'CRM' AND TABLE_NAME = '${t}' ORDER BY COLUMN_ID`);
      console.table(cols);
    }
  } catch (err) {
    console.error('Error querying MCP:', err);
  }
}

run();

