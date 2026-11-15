const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const src = await executeMcpSql(`
      SELECT name, type, line, text 
      FROM all_source 
      WHERE UPPER(text) LIKE '%COMPANY ID AND COMPANY NAME%'
    `);
    console.log('Source matching error text:', src);

    // Also search for COMPANY_UPLOAD_STG in all_source
    const srcComp = await executeMcpSql(`
      SELECT DISTINCT name, type 
      FROM all_source 
      WHERE UPPER(text) LIKE '%COMPANY_UPLOAD_STG%'
    `);
    console.log('Source referencing COMPANY_UPLOAD_STG:', srcComp);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

