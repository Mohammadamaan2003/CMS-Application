const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const objs = await executeMcpSql(`
      SELECT OWNER, OBJECT_NAME, OBJECT_TYPE 
      FROM ALL_OBJECTS 
      WHERE OBJECT_NAME IN ('WWV_FLOW_STEPS', 'WWV_FLOWS', 'WWV_FLOW_PAGE_PLUGS', 'WWV_FLOW_STEP_PROCESSING', 'WWV_FLOW_STEP_VALIDATIONS')
    `);
    console.log('WWV objects in ALL_OBJECTS:', objs);
  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
}

main();
