const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const v = await executeMcpSql(`
      SELECT TEXT FROM ALL_VIEWS WHERE VIEW_NAME = 'WWV_FLOW_AUTHORIZED_EXTENSION' AND OWNER = 'APEX_240200'
    `);
    console.log('wwv_flow_authorized_extension:', v[0]?.TEXT || v[0]?.text);
  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

main();
