const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const counts = await executeMcpSql(`
      SELECT 
        (SELECT COUNT(*) FROM CRM.LEAD) as LEAD_COUNT,
        (SELECT COUNT(*) FROM CRM.LEAD_LINE) as LINE_COUNT,
        (SELECT COUNT(*) FROM CRM.LEAD_CONTACT) as CONTACT_COUNT,
        (SELECT COUNT(*) FROM CRM.NAUKRI_ADVERTISEMENT) as NAUKRI_COUNT,
        (SELECT COUNT(*) FROM CRM.PROPOSALS) as PROPOSAL_COUNT
      FROM DUAL
    `);
    console.log('MCP Record Counts:', counts[0]);

    // Check distinct probabilities, lead types, models, etc.
    const probs = await executeMcpSql("SELECT DISTINCT PROBABILITY FROM CRM.LEAD WHERE PROBABILITY IS NOT NULL ORDER BY PROBABILITY");
    console.log('Probabilities in LEAD:', probs.map(p => p.PROBABILITY));

    const leadTypes = await executeMcpSql("SELECT DISTINCT LEAD_TYPE FROM CRM.LEAD WHERE LEAD_TYPE IS NOT NULL ORDER BY LEAD_TYPE");
    console.log('Lead Types in LEAD:', leadTypes.map(p => p.LEAD_TYPE));

    const statuses = await executeMcpSql("SELECT DISTINCT STATUS FROM CRM.LEAD WHERE ROWNUM <= 10");
    console.log('Sample statuses:', statuses.map(s => s.STATUS));

    const models = await executeMcpSql("SELECT DISTINCT MODEL FROM CRM.LEAD_LINE WHERE MODEL IS NOT NULL ORDER BY MODEL");
    console.log('Models in LEAD_LINE:', models.map(m => m.MODEL));

    const reqServices = await executeMcpSql("SELECT DISTINCT REQUIRED_SERVICE FROM CRM.LEAD_LINE WHERE REQUIRED_SERVICE IS NOT NULL ORDER BY REQUIRED_SERVICE");
    console.log('Required Services in LEAD_LINE:', reqServices.map(r => r.REQUIRED_SERVICE));

    const currencies = await executeMcpSql("SELECT * FROM CRM.CURRENCY ORDER BY ID");
    console.log('Currencies in CRM.CURRENCY:', currencies);

    const interviewStatuses = await executeMcpSql("SELECT DISTINCT INTERVIEW_STATUS FROM CRM.LEAD_CONTACT WHERE INTERVIEW_STATUS IS NOT NULL ORDER BY INTERVIEW_STATUS");
    console.log('Interview statuses in CRM.LEAD_CONTACT:', interviewStatuses.map(i => i.INTERVIEW_STATUS));

    const coordRows = await executeMcpSql("SELECT DISTINCT NAME_OF_COORDINATOR FROM CRM.LEAD WHERE NAME_OF_COORDINATOR IS NOT NULL ORDER BY NAME_OF_COORDINATOR");
    console.log('Coordinators:', coordRows.map(c => c.NAME_OF_COORDINATOR).slice(0, 10));

    const acctMgrRows = await executeMcpSql("SELECT DISTINCT ACCOUNT_MANAGER FROM CRM.LEAD WHERE ACCOUNT_MANAGER IS NOT NULL ORDER BY ACCOUNT_MANAGER");
    console.log('Account Managers in LEAD:', acctMgrRows.map(a => a.ACCOUNT_MANAGER));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

