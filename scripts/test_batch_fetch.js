const { executeMcpSql } = require('../server/services/mcpSync');

async function testBatch() {
  console.log('Testing batch size 2000 from CRM.COMPANY...');
  const t0 = Date.now();
  const rows = await executeMcpSql(`
    SELECT ID, COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE, 
           COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS, 
           SUPPLIER_NUMBER, REGISTRATION_DATE, INDUSTRY, CITY, WEBSITE, DA, 
           COM_EMAIL, REMARK, EMPLOYEE_SIZE, CREATED_BY, 
           TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') as CREATED_DATE, 
           MODIFIED_BY, 
           TO_CHAR(MODIFIED_DATE, 'YYYY-MM-DD HH24:MI:SS') as MODIFIED_DATE, 
           SALESPERSON, PREV_SALESPERSON, JOGET_ID, CONTACTS_COUNT, LEAD_COUNT, 
           CONTACT_COUNT, SOURCE, NORMALIZED_WEBSITE 
    FROM CRM.COMPANY 
    ORDER BY ID ASC 
    OFFSET 0 ROWS FETCH NEXT 2000 ROWS ONLY
  `);
  console.log(`Fetched ${rows.length} rows in ${Date.now() - t0}ms`);
  process.exit(0);
}

testBatch().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
