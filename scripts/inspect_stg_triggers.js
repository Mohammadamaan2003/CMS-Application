const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const trigs = await executeMcpSql(`
      SELECT trigger_name, table_name, triggering_event, trigger_type, status 
      FROM all_triggers 
      WHERE table_name IN ('COMPANY_UPLOAD_STG', 'CONTACT_UPLOAD_STG', 'UPLOAD_BATCH', 'COMPANY', 'CONTACT')
    `);
    console.log('Triggers:', trigs);

    // Let's also check sample rows from CONTACT_UPLOAD_STG and COMPANY_UPLOAD_STG
    const stgSample = await executeMcpSql(`
      SELECT * FROM (SELECT * FROM CRM.CONTACT_UPLOAD_STG ORDER BY STG_ID DESC) WHERE ROWNUM <= 3
    `);
    console.log('CONTACT_UPLOAD_STG sample row:', stgSample);

    const compStgSample = await executeMcpSql(`
      SELECT * FROM (SELECT * FROM CRM.COMPANY_UPLOAD_STG ORDER BY STG_ID DESC) WHERE ROWNUM <= 3
    `);
    console.log('COMPANY_UPLOAD_STG sample row:', compStgSample);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

