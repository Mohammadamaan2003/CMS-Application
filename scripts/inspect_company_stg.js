const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const cols = await executeMcpSql(`
      SELECT column_name, data_type, data_length, nullable FROM all_tab_columns WHERE owner = 'CRM' AND table_name = 'COMPANY_UPLOAD_STG' ORDER BY column_id
    `);
    console.log('COMPANY_UPLOAD_STG columns:', cols);

    const templateCols = await executeMcpSql(`
      SELECT * FROM CRM.COMPANY_TEMPLATE_COLS
    `);
    console.log('COMPANY_TEMPLATE_COLS:', templateCols);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

