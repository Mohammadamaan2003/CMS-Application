const { executeMcpSql } = require('../server/services/mcpSync');

(async () => {
  console.log('--- Step 1: count query ---');
  const countRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.COMPANY');
  console.log('Count result:', countRes);

  console.log('--- Step 2: data query ---');
  const dataRes = await executeMcpSql(`
    SELECT ID, COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE, COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS, SUPPLIER_NUMBER, REGISTRATION_DATE, INDUSTRY, CITY, WEBSITE, DA, COM_EMAIL, REMARK, EMPLOYEE_SIZE, CREATED_BY, TO_CHAR(CREATED_DATE, 'MM/DD/YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'MM/DD/YYYY') as MODIFIED_DATE, SALESPERSON, PREV_SALESPERSON, JOGET_ID, CONTACTS_COUNT, LEAD_COUNT, CONTACT_COUNT, SOURCE, NORMALIZED_WEBSITE
    FROM CRM.COMPANY
    ORDER BY ID DESC NULLS LAST
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `);
  console.log('Data count:', dataRes.length);
  console.log('First data item:', dataRes[0]);
  process.exit(0);
})();
