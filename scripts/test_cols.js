const { executeMcpSql } = require('../server/services/mcpSync');

(async () => {
  const cols = [
    'ID', 'COMP_NAME', 'TECHNOLOGY', 'COUNTRY', 'EXISTINGCOMP', 
    'COMPANYPHONE', 'COMPANY_CATEGORIES', 'COMPANY_TYPE', 'REGISTERED_URL', 
    'REGISTRATION_STATUS', 'SUPPLIER_NUMBER', 'REGISTRATION_DATE', 'INDUSTRY', 
    'CITY', 'WEBSITE', 'DA', 'COM_EMAIL', 'REMARK', 'EMPLOYEE_SIZE', 
    'CREATED_BY', "TO_CHAR(CREATED_DATE, 'MM/DD/YYYY') as CREATED_DATE", 
    'MODIFIED_BY', "TO_CHAR(MODIFIED_DATE, 'MM/DD/YYYY') as MODIFIED_DATE", 
    'SALESPERSON', 'PREV_SALESPERSON', 'JOGET_ID', 'CONTACTS_COUNT', 
    'LEAD_COUNT', 'CONTACT_COUNT', 'SOURCE', 'NORMALIZED_WEBSITE'
  ];

  const subset = cols;
  const sql = `SELECT ${subset.join(', ')} FROM CRM.COMPANY ORDER BY ID DESC NULLS LAST OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`;
  const res = await executeMcpSql(sql);
  console.log(`With all ${cols.length} cols: rows = ${res.length}`);
  process.exit(0);
})();
