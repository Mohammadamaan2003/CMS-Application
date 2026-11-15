const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const TOKEN_URL = process.env.MCP_TOKEN_URL;
const MCP_URL = process.env.MCP_URL;
const CLIENT_ID = process.env.MCP_CLIENT_ID;
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET;
const USERNAME = process.env.MCP_USERNAME;
const PASSWORD = process.env.MCP_PASSWORD;
const READ_DB = process.env.MCP_DATABASE;

async function checkRawContact() {
  const tokenParams = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: USERNAME,
    password: PASSWORD,
    scope: 'openid urn:oracle:dbtools:ords:mcpserver:all',
  });

  const tRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });
  const tData = await tRes.json();
  const token = tData.access_token;

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'sql_run',
        arguments: {
          database: READ_DB,
          sql: 'SELECT * FROM CRM.CONTACT WHERE ID = 100040',
        },
      },
    }),
  });

  const data = await res.json();
  console.log('--- RAW CONTACT 100040 CONTENT ---');
  console.log(data.result?.content?.[0]?.text);
}

checkRawContact();
