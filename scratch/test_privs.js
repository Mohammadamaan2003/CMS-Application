const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const privs = await executeMcpSql(`
      SELECT TABLE_SCHEMA, TABLE_NAME, PRIVILEGE 
      FROM ALL_TAB_PRIVS 
      WHERE (TABLE_NAME LIKE '%PAGE%' OR TABLE_NAME LIKE '%APPL%' OR TABLE_NAME LIKE '%VAL%' OR TABLE_NAME LIKE '%UPLOAD%')
      ORDER BY TABLE_NAME
    `);
    console.log('Privileges:', privs);
  } catch(e) {
    console.log('Privs error:', e.message);
  }
  process.exit(0);
}

main();
