const { executeMcpSql } = require('../server/services/mcpSync');

async function discoverApexTables() {
  try {
    console.log('Querying Oracle APEX ALL_TABLES where OWNER = CRM...');
    const tables = await executeMcpSql(`
      SELECT TABLE_NAME, NUM_ROWS 
      FROM ALL_TABLES 
      WHERE OWNER = 'CRM' 
      ORDER BY TABLE_NAME
    `);
    console.log('Oracle APEX CRM Tables:');
    for (const t of tables) {
      console.log(`- ${t.TABLE_NAME || t.table_name}: ~${t.NUM_ROWS || t.num_rows || 'N/A'} rows`);
    }

    console.log('\nQuerying Oracle APEX ALL_VIEWS where OWNER = CRM...');
    const views = await executeMcpSql(`
      SELECT VIEW_NAME 
      FROM ALL_VIEWS 
      WHERE OWNER = 'CRM' 
      ORDER BY VIEW_NAME
    `);
    console.log('Oracle APEX CRM Views:');
    for (const v of views) {
      console.log(`- ${v.VIEW_NAME || v.view_name}`);
    }

    // Now let's get actual COUNT(*) for key tables
    const checkTables = [
      'CRM.COMPANY',
      'CRM.CONTACT',
      'CRM.LEAD_DETAILS_REPORT',
      'CRM.LEAD_LINES',
      'CRM.LEAD_CONTACTS',
      'CRM.LEAD_PROPOSALS',
      'CRM.LEAD_RESOURCES',
      'CRM.NAUKRI_ADVERTISEMENTS',
      'CRM.COMPANY_TYPE_MASTER',
      'CRM.COMPANY_SIZE_MASTER',
      'CRM.INDUSTRY_MASTER',
      'CRM.COUNTRY_MASTER',
      'CRM.SALESPERSON_MASTER',
      'CRM.TECHNOLOGY_MASTER',
      'CRM.SOURCE_MASTER',
      'CRM.POSITION_TYPE_MASTER',
      'CRM.CONTACT_STATUS_MASTER',
      'CRM.ACCOUNT_MANAGER_MASTER',
      'CRM.COMPANY_CATEGORIES_MASTER'
    ];

    console.log('\nActual SELECT COUNT(*) from key CRM tables/views:');
    for (const tbl of checkTables) {
      try {
        const res = await executeMcpSql(`SELECT COUNT(*) as CNT FROM ${tbl}`);
        console.log(`${tbl}: ${res[0]?.CNT || res[0]?.cnt}`);
      } catch (e) {
        console.log(`${tbl}: Error - ${e.message}`);
      }
    }

  } catch (err) {
    console.error('Discovery error:', err);
  }
  process.exit(0);
}

discoverApexTables();
