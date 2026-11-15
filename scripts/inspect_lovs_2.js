const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const currCols = await executeMcpSql("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE OWNER='CRM' AND TABLE_NAME='CURRENCY'");
    console.log('CRM.CURRENCY cols:', currCols.map(c => c.COLUMN_NAME));
    const currencies = await executeMcpSql("SELECT * FROM CRM.CURRENCY");
    console.log('Currencies:', currencies);

    const interviewStatuses = await executeMcpSql("SELECT DISTINCT INTERVIEW_STATUS FROM CRM.LEAD_CONTACT WHERE INTERVIEW_STATUS IS NOT NULL ORDER BY INTERVIEW_STATUS");
    console.log('Interview statuses:', interviewStatuses.map(i => i.INTERVIEW_STATUS));

    const cvMadeBy = await executeMcpSql("SELECT DISTINCT CV_MADE_BY FROM CRM.LEAD_LINE WHERE CV_MADE_BY IS NOT NULL ORDER BY CV_MADE_BY");
    console.log('CV Made By:', cvMadeBy.map(c => c.CV_MADE_BY));

    const acctMgrRows = await executeMcpSql("SELECT DISTINCT ACCOUNT_MANAGER FROM CRM.LEAD WHERE ACCOUNT_MANAGER IS NOT NULL ORDER BY ACCOUNT_MANAGER");
    console.log('Account Managers in LEAD:', acctMgrRows.map(a => a.ACCOUNT_MANAGER));

    const coords = await executeMcpSql("SELECT DISTINCT NAME_OF_COORDINATOR FROM CRM.LEAD WHERE NAME_OF_COORDINATOR IS NOT NULL ORDER BY NAME_OF_COORDINATOR");
    console.log('Coordinators:', coords.map(c => c.NAME_OF_COORDINATOR));

    const connSent = await executeMcpSql("SELECT DISTINCT CONNECTION_SENT FROM CRM.LEAD WHERE CONNECTION_SENT IS NOT NULL ORDER BY CONNECTION_SENT");
    console.log('Lead Connection Sent options:', connSent.map(c => c.CONNECTION_SENT));

    const proposals = await executeMcpSql("SELECT DISTINCT PROPOSAL FROM CRM.LEAD WHERE PROPOSAL IS NOT NULL ORDER BY PROPOSAL");
    console.log('Lead Proposal options:', proposals.map(p => p.PROPOSAL));

    const leadSources = await executeMcpSql("SELECT DISTINCT SOURCE FROM CRM.LEAD WHERE SOURCE IS NOT NULL ORDER BY SOURCE");
    console.log('Lead Sources:', leadSources.map(s => s.SOURCE));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

