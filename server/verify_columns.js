const { pool } = require('./db/pool');

const expectedContactCols = [
  'ID', 'DESIGNATION', 'POS_TYPE', 'PRIORITY_CONTACT', 'COUNTRY',
  'COMP_EMAIL', 'OTHER_EMAIL', 'COMP_EMAIL_VERIFIED', 'CONTACT_PHONE',
  'CONTACT_PHONE2', 'CONTACT_PHONE3', 'CONTACT_MOBILE', 'CONTACT_MOBILE2',
  'CONTACT_MOBILE3', 'MOBILE_VERIFIED', 'LINKEDIN_URL', 'LINKEDLNID',
  'COMP_LINKEDLNID', 'PREFERRED_LINKEDIN_CONNECTED', 'LINKEDIN_CONN_SEND_ACC',
  'CONNECTION_DATE', 'CONTACTSTATUS', 'SALESPERSON', 'SOURCE',
  'DATA_EXTRACTED', 'REMARK', 'LINKEDIN_CNNCTD_ACC', 'CURRENT_PAST',
  'EMAIL_TOOL_VERIFIED', 'EMAIL_VERIFIED_BY_RESPONSE', 'SOURCE_DETAILS',
  'CONNECTION_SEND_BY', 'WEBSITE', 'CREATED_BY', 'CREATED_DATE',
  'MODIFIED_BY', 'MODIFIED_DATE', 'INDUSTRY', 'CONTACT_NAME',
  'COMP_NAME', 'COMP_ID', 'TECHNOLOGY'
];

const expectedCompanyCols = [
  'ID', 'TECHNOLOGY', 'COUNTRY', 'EXISTINGCOMP', 'COMPANYPHONE',
  'COMPANY_CATEGORIES', 'REGISTERED_URL', 'REGISTRATION_STATUS',
  'SUPPLIER_NUMBER', 'USERNAME', 'PASSWORD', 'REGISTRATION_DATE',
  'INDUSTRY', 'CITY', 'WEBSITE', 'DA', 'COM_EMAIL', 'REMARK',
  'EMPLOYEE_SIZE', 'CREATED_BY', 'CREATED_DATE', 'MODIFIED_BY',
  'MODIFIED_DATE', 'SALESPERSON', 'PREV_SALESPERSON', 'JOGET_ID',
  'CONTACTS_COUNT', 'LEAD_COUNT', 'CONTACT_COUNT', 'SOURCE',
  'NORMALIZED_WEBSITE', 'COMP_NAME', 'COMPANY_TYPE'
];

async function verify() {
  const compRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'");
  const compDbCols = new Set(compRes.rows.map(r => r.column_name.toLowerCase()));

  const contRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts'");
  const contDbCols = new Set(contRes.rows.map(r => r.column_name.toLowerCase()));

  console.log('--- COMPANY COLUMNS VERIFICATION (Expected 33) ---');
  let missingComp = [];
  expectedCompanyCols.forEach(col => {
    const present = compDbCols.has(col.toLowerCase());
    if (!present) missingComp.push(col);
  });
  if (missingComp.length === 0) {
    console.log('✅ ALL 33 COMPANY COLUMNS ARE PRESENT IN POSTGRESQL!');
  } else {
    console.log('❌ MISSING COMPANY COLUMNS:', missingComp);
  }

  console.log('\n--- CONTACT COLUMNS VERIFICATION (Expected 42) ---');
  let missingCont = [];
  expectedContactCols.forEach(col => {
    const present = contDbCols.has(col.toLowerCase());
    if (!present) missingCont.push(col);
  });
  if (missingCont.length === 0) {
    console.log('✅ ALL 42 CONTACT COLUMNS ARE PRESENT IN POSTGRESQL!');
  } else {
    console.log('❌ MISSING CONTACT COLUMNS:', missingCont);
  }
}

verify().finally(() => pool.end());

