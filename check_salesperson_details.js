const { executeMcpSql } = require('./server/services/mcpSync');

async function checkAllSalespersons() {
  try {
    const sp = await executeMcpSql(`
      SELECT 
        ID, 
        SALESPERSON, 
        JOBPOSITION, 
        MOBILE, 
        ADDRESS, 
        IS_ACTIVE, 
        TO_CHAR(LEFT_DATE, 'DD-MON-YYYY') as LEFT_DATE,
        REPLACED_BY_ID,
        CREATED_BY, 
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, 
        MODIFIED_BY, 
        TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE,
        CONTACT_COUNT,
        COMPANY_COUNT
      FROM CRM.SALES_PERSON
      ORDER BY ID
    `);
    console.log(`CRM.SALES_PERSON total: ${sp.length}`);
    console.table(sp);

    const emails = await executeMcpSql(`
      SELECT * FROM CRM.SALES_PERSON_EMAILS ORDER BY SALES_PERSON_ID, EMAIL_ID
    `);
    console.log(`CRM.SALES_PERSON_EMAILS total: ${emails.length}`);
    console.table(emails);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
checkAllSalespersons();

