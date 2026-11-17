const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    console.log('=== Checking APEX schemas and views ===');
    const schemas = await executeMcpSql(`
      SELECT USERNAME FROM ALL_USERS WHERE USERNAME LIKE '%APEX%' OR USERNAME LIKE '%FLOWS%'
    `);
    console.log('APEX Users:', schemas);

    const apexViews = await executeMcpSql(`
      SELECT OWNER, VIEW_NAME FROM ALL_VIEWS WHERE VIEW_NAME LIKE 'APEX_APPL%' AND ROWNUM <= 20
    `);
    console.log('Sample APEX views:', apexViews);

    // Let's check if we can query APEX_APPLICATION_PAGES or APEX_APPLICATIONS with ALL_
    try {
      const q = await executeMcpSql(`
        SELECT WORKSPACE, APPLICATION_ID, APPLICATION_NAME FROM APEX_APPLICATIONS
      `);
      console.log('APEX_APPLICATIONS:', q);
    } catch(e) {
      console.log('APEX_APPLICATIONS err:', e.message);
    }

    // Let's check ALL_OBJECTS for APEX or CRM procedures/functions/triggers/packages
    const crmSource = await executeMcpSql(`
      SELECT DISTINCT NAME, TYPE FROM ALL_SOURCE WHERE OWNER = 'CRM'
    `);
    console.log('CRM Source Objects:', crmSource);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
