const { executeMcpSql } = require('../server/services/mcpSync');

async function run() {
  try {
    const pages = await executeMcpSql("SELECT APPLICATION_ID, PAGE_ID, PAGE_NAME, PAGE_TITLE FROM APEX_APPLICATION_PAGES WHERE UPPER(PAGE_NAME) LIKE '%LEAD%' OR UPPER(PAGE_TITLE) LIKE '%LEAD%' ORDER BY PAGE_ID");
    console.log('Lead Pages in APEX:');
    for (const p of pages) {
      console.log(`App: ${p.APPLICATION_ID}, Page: ${p.PAGE_ID}, Name: ${p.PAGE_NAME}, Title: ${p.PAGE_TITLE}`);
    }
  } catch (err) {
    console.error(err);
  }
}

run();

