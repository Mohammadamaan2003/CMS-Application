const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const v = await executeMcpSql(`
      SELECT TEXT FROM ALL_VIEWS WHERE VIEW_NAME = 'APEX_APPLICATION_PAGES' AND OWNER = 'APEX_240200'
    `);
    console.log('View text:', v[0]?.TEXT || v[0]?.text);
  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

main();
