const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const tables = await executeMcpSql(`
      SELECT table_name FROM all_tables WHERE owner = 'CRM' AND (table_name LIKE '%UPLOAD%' OR table_name LIKE '%STG%' OR table_name LIKE '%TEMP%')
    `);
    console.log('CRM upload/staging tables:', tables);

    const triggers = await executeMcpSql(`
      SELECT object_name, object_type FROM all_objects WHERE owner = 'CRM' AND object_name LIKE '%UPLOAD%'
    `);
    console.log('CRM upload objects:', triggers);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

