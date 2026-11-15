const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const apps = await executeMcpSql(`
      SELECT application_id, application_name FROM apex_applications
    `);
    console.log('APEX applications:', apps);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

