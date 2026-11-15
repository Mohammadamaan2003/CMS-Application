const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const resCols = await executeMcpSql("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS WHERE OWNER='CRM' AND COLUMN_NAME LIKE '%RESOURCE%'");
    console.log('Columns with RESOURCE:', resCols);

    const userCols = await executeMcpSql("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE OWNER='CRM' AND TABLE_NAME='USERS'");
    console.log('CRM.USERS cols:', userCols.map(c => c.COLUMN_NAME));

    const sampleUsers = await executeMcpSql("SELECT * FROM CRM.USERS WHERE ROWNUM <= 3");
    console.log('CRM.USERS sample:', sampleUsers);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

