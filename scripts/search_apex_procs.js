const { executeMcpSql } = require('../server/services/mcpSync');
(async () => {
  try {
    const procs = await executeMcpSql(`
      SELECT application_id, page_id, process_name, process_type 
      FROM apex_application_page_proc 
      WHERE UPPER(process_name) LIKE '%VALIDAT%' OR UPPER(process_name) LIKE '%UPLOAD%' OR UPPER(process_source) LIKE '%COMPANY_UPLOAD_STG%' OR UPPER(process_source) LIKE '%CONTACT_UPLOAD_STG%'
    `);
    console.log('APEX processes:', procs);

    process.exit(0);
  } catch (err) {
    console.error('MCP inspect error:', err);
    process.exit(1);
  }
})();

