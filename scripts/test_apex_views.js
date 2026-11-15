const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const apexViews = await executeMcpSql("SELECT VIEW_NAME FROM ALL_VIEWS WHERE VIEW_NAME LIKE 'APEX_APPLICATION_PAGE_%' AND ROWNUM <= 10");
    console.log('Apex views:', apexViews);
  } catch (err) {
    console.error('Cannot query APEX views directly:', err.message);
  }
}

run();

