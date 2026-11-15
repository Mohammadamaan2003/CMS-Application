const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const contactErrors = await executeMcpSql(`
      SELECT DISTINCT error_msg FROM CRM.CONTACT_UPLOAD_STG WHERE error_msg IS NOT NULL
    `);
    console.log('Distinct Contact Upload Errors:', contactErrors);

    const compErrors = await executeMcpSql(`
      SELECT DISTINCT error_msg FROM CRM.COMPANY_UPLOAD_STG WHERE error_msg IS NOT NULL
    `);
    console.log('Distinct Company Upload Errors:', compErrors);

    const compReason = await executeMcpSql(`
      SELECT DISTINCT error_reason FROM CRM.COMPANY_UPLOAD_STG WHERE error_reason IS NOT NULL
    `);
    console.log('Distinct Company Upload Error Reasons:', compReason);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

