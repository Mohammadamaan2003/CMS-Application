const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const res = await executeMcpSql("SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER='CRM' AND (TABLE_NAME LIKE '%EMP%' OR TABLE_NAME LIKE '%RES%' OR TABLE_NAME LIKE '%USER%')");
    console.log('Tables matching EMP/RES/USER:', res.map(t => t.TABLE_NAME));

    const empCols = await executeMcpSql("SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS WHERE OWNER='CRM' AND TABLE_NAME='EMP'");
    console.log('CRM.EMP cols:', empCols);

    const empCount = await executeMcpSql("SELECT COUNT(*) as CNT FROM CRM.EMP");
    console.log('CRM.EMP count:', empCount);

    const sampleEmp = await executeMcpSql("SELECT * FROM CRM.EMP WHERE ROWNUM <= 3");
    console.log('CRM.EMP sample:', sampleEmp);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

