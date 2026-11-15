const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const triggers = await executeMcpSql(`
      SELECT TRIGGER_NAME, TABLE_NAME, TRIGGERING_EVENT, STATUS 
      FROM ALL_TRIGGERS 
      WHERE OWNER = 'CRM' AND TABLE_NAME IN ('LEAD', 'LEAD_LINE', 'LEAD_CONTACT', 'NAUKRI_ADVERTISEMENT', 'PROPOSALS')
    `);
    console.log('Triggers:', triggers);

    for (const trg of triggers) {
      const name = trg.TRIGGER_NAME || trg.trigger_name;
      console.log(`\n--- Source of ${name} ---`);
      const src = await executeMcpSql(`
        SELECT TEXT FROM ALL_SOURCE 
        WHERE OWNER = 'CRM' AND NAME = '${name}' AND TYPE = 'TRIGGER' 
        ORDER BY LINE
      `);
      console.log(src.map(s => s.TEXT || s.text).join(''));
    }
  } catch (err) {
    console.error(err);
  }
}

run();

