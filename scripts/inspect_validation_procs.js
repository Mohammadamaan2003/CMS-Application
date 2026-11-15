const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const procs = await executeMcpSql(`
      SELECT object_name, object_type FROM all_objects WHERE owner = 'CRM' AND (object_name LIKE '%UPLOAD%' OR object_name LIKE '%VALIDAT%' OR object_name LIKE '%IMPORT%')
    `);
    console.log('CRM upload/validation objects:', procs);

    // Let's also check package source if there are packages
    const pkgs = await executeMcpSql(`
      SELECT object_name, object_type FROM all_objects WHERE owner = 'CRM' AND object_type IN ('PACKAGE', 'PACKAGE BODY')
    `);
    console.log('CRM packages:', pkgs);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

