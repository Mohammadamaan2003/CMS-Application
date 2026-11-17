const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  const candidates = ['CRM', 'CMS', 'IQRA', 'IQS', 'IQRAIT', 'ADMIN', 'DEV', 'PROD', 'SALES'];
  for (const name of candidates) {
    try {
      const res = await executeMcpSql(`
        SELECT apex_util.find_security_group_id('${name}') as SGID FROM DUAL
      `);
      console.log(`Workspace '${name}':`, res[0]?.SGID || res[0]?.sgid);
    } catch(e) {
      console.log(`Workspace '${name}' error:`, e.message);
    }
  }
  process.exit(0);
}

main();
