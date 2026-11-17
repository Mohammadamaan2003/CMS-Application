const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const list = await executeMcpSql(`
      SELECT DISTINCT TABLE_NAME 
      FROM ALL_TAB_PRIVS 
      WHERE TABLE_SCHEMA = 'APEX_240200' AND TABLE_NAME LIKE '%WORK%'
    `);
    console.log('APEX_240200 WORK tables:', list);

    // Let's also check all tables owned by APEX_240200 that are NOT views
    const baseTables = await executeMcpSql(`
      SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = 'APEX_240200' AND ROWNUM <= 30
    `);
    console.log('APEX_240200 base tables:', baseTables);

    // Let's check SYS tables or views about APEX
    const sysApex = await executeMcpSql(`
      SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = 'SYS' AND TABLE_NAME LIKE '%APEX%'
    `);
    console.log('SYS APEX tables:', sysApex);

  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

main();
