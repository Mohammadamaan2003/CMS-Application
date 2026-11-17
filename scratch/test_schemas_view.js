const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const wsSchemas = await executeMcpSql(`SELECT * FROM APEX_WORKSPACE_SCHEMAS`);
    console.log('APEX_WORKSPACE_SCHEMAS:', wsSchemas);
  } catch(e) {
    console.log('APEX_WORKSPACE_SCHEMAS error:', e.message);
  }

  try {
    const wsUsers = await executeMcpSql(`SELECT * FROM APEX_WORKSPACE_APEX_USERS`);
    console.log('APEX_WORKSPACE_APEX_USERS:', wsUsers);
  } catch(e) {
    console.log('APEX_WORKSPACE_APEX_USERS error:', e.message);
  }

  process.exit(0);
}

main();
