const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const models = await executeMcpSql("SELECT DISTINCT MODEL FROM CRM.LEAD_LINE WHERE MODEL IS NOT NULL ORDER BY MODEL");
    console.log('Models in LEAD_LINE:', models.map(m => m.MODEL));

    const reqServices = await executeMcpSql("SELECT DISTINCT REQUIRED_SERVICE FROM CRM.LEAD_LINE WHERE REQUIRED_SERVICE IS NOT NULL ORDER BY REQUIRED_SERVICE");
    console.log('Required Services in LEAD_LINE:', reqServices.map(r => r.REQUIRED_SERVICE));

    const currencies = await executeMcpSql("SELECT ID, CURRENCY_CODE, CURRENCY_NAME, SYMBOL FROM CRM.CURRENCY ORDER BY ID");
    console.log('Currencies in CRM.CURRENCY:', currencies);

    const interviewStatuses = await executeMcpSql("SELECT DISTINCT INTERVIEW_STATUS FROM CRM.LEAD_CONTACT WHERE INTERVIEW_STATUS IS NOT NULL ORDER BY INTERVIEW_STATUS");
    console.log('Interview statuses in CRM.LEAD_CONTACT:', interviewStatuses.map(i => i.INTERVIEW_STATUS));

    const cvMadeBy = await executeMcpSql("SELECT DISTINCT CV_MADE_BY FROM CRM.LEAD_LINE WHERE CV_MADE_BY IS NOT NULL ORDER BY CV_MADE_BY");
    console.log('CV Made By in LEAD_LINE:', cvMadeBy.map(c => c.CV_MADE_BY));

    const coordinators = await executeMcpSql("SELECT DISTINCT NAME_OF_COORDINATOR FROM CRM.LEAD WHERE NAME_OF_COORDINATOR IS NOT NULL ORDER BY NAME_OF_COORDINATOR");
    console.log('Coordinators count:', coordinators.length);
    console.log('Sample Coordinators:', coordinators.map(c => c.NAME_OF_COORDINATOR).slice(0, 15));

    const accountManagers = await executeMcpSql("SELECT DISTINCT ACCOUNT_MANAGER FROM CRM.LEAD WHERE ACCOUNT_MANAGER IS NOT NULL ORDER BY ACCOUNT_MANAGER");
    console.log('Account Managers count:', accountManagers.length);
    console.log('Sample Account Managers:', accountManagers.map(a => a.ACCOUNT_MANAGER).slice(0, 15));

    // Also check foreign key constraints or rules in Oracle CRM schema
    const constraints = await executeMcpSql(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, TABLE_NAME, R_CONSTRAINT_NAME 
      FROM ALL_CONSTRAINTS 
      WHERE OWNER = 'CRM' AND TABLE_NAME IN ('LEAD', 'LEAD_LINE', 'LEAD_CONTACT', 'NAUKRI_ADVERTISEMENT', 'PROPOSALS')
    `);
    console.log('Constraints:', constraints);

    // Let's check EMP / Resource table
    const empSample = await executeMcpSql("SELECT * FROM CRM.EMP WHERE ROWNUM <= 2");
    console.log('CRM.EMP Sample:', empSample);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

