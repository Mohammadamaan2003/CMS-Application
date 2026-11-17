const { executeMcpSql } = require('../server/services/mcpSync');
const { pool } = require('../server/db/pool');

async function checkUsers() {
  const pgUsers = await pool.query('SELECT * FROM users');
  console.log('PostgreSQL users:', pgUsers.rows);

  const apexUsers = await executeMcpSql('SELECT * FROM CRM.USERS');
  console.log('APEX users:', apexUsers);

  process.exit(0);
}

checkUsers();
