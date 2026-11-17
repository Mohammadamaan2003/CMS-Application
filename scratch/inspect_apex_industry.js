const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    console.log('=== Checking tables with FIX or INDUSTRY in name ===');
    const fixTables = await executeMcpSql(`
      SELECT TABLE_NAME, OWNER 
      FROM ALL_TABLES 
      WHERE TABLE_NAME LIKE '%FIX%' OR TABLE_NAME LIKE '%INDUSTRY%' OR TABLE_NAME LIKE '%INCORRECT%'
      ORDER BY TABLE_NAME
    `);
    console.log('Tables:', fixTables);

    console.log('\n=== Checking columns of CRM.COMPANY_INCORRECT_DATA ===');
    const cols1 = await executeMcpSql(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM ALL_TAB_COLUMNS 
      WHERE OWNER = 'CRM' AND TABLE_NAME = 'COMPANY_INCORRECT_DATA'
      ORDER BY COLUMN_ID
    `);
    console.log('COMPANY_INCORRECT_DATA columns:', cols1);

    console.log('\n=== Checking columns of CRM.COMPANY_INCORRECT_UPDATE_DATA ===');
    const cols2 = await executeMcpSql(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM ALL_TAB_COLUMNS 
      WHERE OWNER = 'CRM' AND TABLE_NAME = 'COMPANY_INCORRECT_UPDATE_DATA'
      ORDER BY COLUMN_ID
    `);
    console.log('COMPANY_INCORRECT_UPDATE_DATA columns:', cols2);

    console.log('\n=== Checking columns of CRM.INDUSTRY_UPLOAD_STAGE ===');
    const cols3 = await executeMcpSql(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
      FROM ALL_TAB_COLUMNS 
      WHERE OWNER = 'CRM' AND TABLE_NAME = 'INDUSTRY_UPLOAD_STAGE'
      ORDER BY COLUMN_ID
    `);
    console.log('INDUSTRY_UPLOAD_STAGE columns:', cols3);

    console.log('\n=== Sample rows from CRM.INDUSTRY_UPLOAD_STAGE ===');
    try {
      const rows3 = await executeMcpSql(`
        SELECT * FROM CRM.INDUSTRY_UPLOAD_STAGE WHERE ROWNUM <= 5
      `);
      console.log('INDUSTRY_UPLOAD_STAGE rows:', rows3);
    } catch(e) {
      console.log('Error reading INDUSTRY_UPLOAD_STAGE:', e.message);
    }

    console.log('\n=== Sample rows from CRM.COMPANY_INCORRECT_DATA ===');
    const rows1 = await executeMcpSql(`
      SELECT * FROM CRM.COMPANY_INCORRECT_DATA WHERE ROWNUM <= 2
    `);
    console.log('COMPANY_INCORRECT_DATA rows:', rows1);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
