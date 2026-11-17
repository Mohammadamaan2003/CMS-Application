const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  const res = await executeMcpSql("SELECT apex_util.find_security_group_id('CRM') as SGID FROM DUAL");
  console.log('Result:', JSON.stringify(res));

  // Also let's check what schemas exist and what tables in other schemas:
  const allSchemas = await executeMcpSql("SELECT DISTINCT OWNER FROM ALL_TABLES ORDER BY OWNER");
  console.log('All schemas with tables:', allSchemas.map(s => s.OWNER));

  process.exit(0);
}

main();
