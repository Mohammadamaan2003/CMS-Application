const { syncCompanies, syncContacts } = require('./services/mcpSync');
const { pool } = require('./db/pool');

async function runSync() {
  const limit = parseInt(process.argv[2], 10) || 1000;
  console.log(`=======================================================`);
  console.log(`Starting repeatable MCP Sync -> PostgreSQL (Limit: ${limit})`);
  console.log(`=======================================================`);

  try {
    const compCount = await syncCompanies(limit);
    const contCount = await syncContacts(limit);
    console.log(`\n=======================================================`);
    console.log(`Sync Completed Successfully!`);
    console.log(`- Companies synced into PostgreSQL: ${compCount}`);
    console.log(`- Contacts synced into PostgreSQL:  ${contCount}`);
    console.log(`=======================================================`);
  } catch (error) {
    console.error(`\nSync Failed:`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSync();

