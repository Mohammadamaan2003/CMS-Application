const { executeMcpSql } = require('../server/services/mcpSync');
const fs = require('fs');

async function run() {
  try {
    const page = await executeMcpSql(`
      SELECT APPLICATION_ID, PAGE_ID, PAGE_NAME, PAGE_TITLE 
      FROM APEX_APPLICATION_PAGES 
      WHERE APPLICATION_ID = 136 AND PAGE_ID = 77
    `);
    console.log('Page:', JSON.stringify(page, null, 2));

    const regions = await executeMcpSql(`
      SELECT REGION_ID, REGION_NAME, SOURCE_TYPE, PARENT_REGION_ID, DISPLAY_SEQUENCE, TEMPLATE
      FROM APEX_APPLICATION_PAGE_REGIONS 
      WHERE APPLICATION_ID = 136 AND PAGE_ID = 77 
      ORDER BY DISPLAY_SEQUENCE
    `);
    console.log('Total Regions:', regions.length);
    console.log('Regions:', JSON.stringify(regions, null, 2));

    const items = await executeMcpSql(`
      SELECT ITEM_NAME, REGION, ITEM_LABEL, DISPLAY_AS, DISPLAY_SEQUENCE, LOV_DEFINITION
      FROM APEX_APPLICATION_PAGE_ITEMS 
      WHERE APPLICATION_ID = 136 AND PAGE_ID = 77 
      ORDER BY DISPLAY_SEQUENCE
    `);
    console.log('Total Items:', items.length);
    console.log('Items:', JSON.stringify(items, null, 2));

    fs.writeFileSync('scripts/page_77_meta.json', JSON.stringify({ page, regions, items }, null, 2));
  } catch (err) {
    console.error('Error querying APEX metadata:', err);
  }
}

run();
