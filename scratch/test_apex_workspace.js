const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    console.log('=== Checking APEX_WORKSPACES ===');
    try {
      const ws = await executeMcpSql(`SELECT * FROM APEX_WORKSPACES`);
      console.log('APEX_WORKSPACES:', ws);
    } catch(e) {
      console.log('APEX_WORKSPACES err:', e.message);
    }

    try {
      const ws2 = await executeMcpSql(`SELECT WORKSPACE_ID, WORKSPACE_NAME FROM APEX_240200.WWV_FLOW_COMPANIES`);
      console.log('WWV_FLOW_COMPANIES:', ws2);
    } catch(e) {
      console.log('WWV_FLOW_COMPANIES err:', e.message);
    }

    try {
      const flows = await executeMcpSql(`SELECT ID, NAME, ALIAS FROM APEX_240200.WWV_FLOWS WHERE ROWNUM <= 20`);
      console.log('WWV_FLOWS:', flows);
    } catch(e) {
      console.log('WWV_FLOWS err:', e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
