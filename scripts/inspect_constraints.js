const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const cons = await executeMcpSql(`
      SELECT c.TABLE_NAME, c.CONSTRAINT_NAME, c.CONSTRAINT_TYPE, cc.COLUMN_NAME, c.SEARCH_CONDITION
      FROM ALL_CONSTRAINTS c
      JOIN ALL_CONS_COLUMNS cc ON c.OWNER = cc.OWNER AND c.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE c.OWNER = 'CRM' AND c.TABLE_NAME IN ('LEAD', 'LEAD_LINE', 'LEAD_CONTACT', 'NAUKRI_ADVERTISEMENT', 'PROPOSALS')
      ORDER BY c.TABLE_NAME, c.CONSTRAINT_NAME, cc.POSITION
    `);
    console.table(cons);
  } catch (err) {
    console.error(err);
  }
}

run();

