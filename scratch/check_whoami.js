const { executeMcpSql } = require('../server/services/mcpSync');

async function main() {
  try {
    const who = await executeMcpSql(`
      SELECT USER, SYS_CONTEXT('USERENV', 'CURRENT_USER') as CURRENT_USR, SYS_CONTEXT('USERENV', 'SESSION_USER') as SESS_USR 
      FROM DUAL
    `);
    console.log('Current Oracle user:', who);

    // Let's check what APEX workspace name could be:
    // Try PL/SQL block:
    const wsTest = await executeMcpSql(`
      DECLARE
        l_ws_id NUMBER;
      BEGIN
        FOR c IN (SELECT DISTINCT WORKSPACE_NAME FROM ALL_TAB_PRIVS WHERE TABLE_NAME LIKE 'APEX%') LOOP
          NULL;
        END LOOP;
      END;
    `);
    console.log('PL/SQL test:', wsTest);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
