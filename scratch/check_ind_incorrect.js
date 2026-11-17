const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  const vals = await executeMcpSql(`
    SELECT DISTINCT INDUSTRY_INCORRECT FROM CRM.COMPANY_INCORRECT_DATA WHERE INDUSTRY_INCORRECT IS NOT NULL
  `);
  console.log('Distinct INDUSTRY_INCORRECT in Oracle APEX:', vals);

  const sample = await executeMcpSql(`
    SELECT ERROR_ID, INDUSTRY, INDUSTRY_INCORRECT, ERROR_MESSAGE 
    FROM CRM.COMPANY_INCORRECT_DATA 
    WHERE INDUSTRY_INCORRECT IS NOT NULL AND ROWNUM <= 5
  `);
  console.log('Sample rows with INDUSTRY_INCORRECT:', sample);

  process.exit(0);
}

main();
