const { executeMcpSql } = require('../server/services/mcpSync');

(async () => {
  const countSql = `SELECT COUNT(*) as TOTAL FROM CRM.COMPANY`;
  const dataSql = `
    SELECT ID, COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE, COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS, SUPPLIER_NUMBER, REGISTRATION_DATE, INDUSTRY, CITY, WEBSITE, DA, COM_EMAIL, REMARK, EMPLOYEE_SIZE, CREATED_BY, TO_CHAR(CREATED_DATE, 'MM/DD/YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'MM/DD/YYYY') as MODIFIED_DATE, SALESPERSON, PREV_SALESPERSON, JOGET_ID, CONTACTS_COUNT, LEAD_COUNT, CONTACT_COUNT, SOURCE, NORMALIZED_WEBSITE
    FROM CRM.COMPANY
    ORDER BY ID DESC NULLS LAST
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `;

  const countRows = await executeMcpSql(countSql);
  console.log('Count rows result:', countRows);
  const dataRows = await executeMcpSql(dataSql);
  console.log(`Data rows returned: ${dataRows.length}`);
  console.log('First row:', dataRows[0].ID, dataRows[0].COMP_NAME);
  process.exit(0);
})();

