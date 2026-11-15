const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    // Check if there are duplicate SR_NO in CRM.LEAD
    const dupSr = await executeMcpSql("SELECT SR_NO, COUNT(*) as CNT FROM CRM.LEAD GROUP BY SR_NO HAVING COUNT(*) > 1");
    console.log('Duplicate SR_NO in CRM.LEAD:', dupSr);

    // Check if MAX(SR_NO) matches LEAD_COUNT
    const maxSr = await executeMcpSql("SELECT MAX(SR_NO) as MAX_SR, MIN(SR_NO) as MIN_SR, MAX(LEAD_ID) as MAX_ID FROM CRM.LEAD");
    console.log('Lead ID / SR_NO range:', maxSr[0]);

    // Check duplicate company names in CRM.LEAD
    const dupComp = await executeMcpSql("SELECT COMPANY_NAME, COUNT(*) as CNT FROM CRM.LEAD GROUP BY COMPANY_NAME HAVING COUNT(*) > 1 ORDER BY CNT DESC FETCH FIRST 5 ROWS ONLY");
    console.log('Top repeated company names in CRM.LEAD (a company can have multiple leads over time):', dupComp);

    // Check lead contact duplicates: can a contact be added twice to the same lead?
    const dupLeadContact = await executeMcpSql("SELECT LEAD_ID, CONTACT_ID, COUNT(*) as CNT FROM CRM.LEAD_CONTACT WHERE CONTACT_ID IS NOT NULL GROUP BY LEAD_ID, CONTACT_ID HAVING COUNT(*) > 1");
    console.log('Duplicate (LEAD_ID, CONTACT_ID) in CRM.LEAD_CONTACT:', dupLeadContact);

    // Check proposal number duplicates
    const dupProp = await executeMcpSql("SELECT LOWER(PROPOSAL_NUMBER), COUNT(*) as CNT FROM CRM.PROPOSALS GROUP BY LOWER(PROPOSAL_NUMBER) HAVING COUNT(*) > 1");
    console.log('Duplicate PROPOSAL_NUMBER:', dupProp);
  } catch (err) {
    console.error(err);
  }
}

run();

