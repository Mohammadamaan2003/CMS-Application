const path = require('path');
const dotenv = require('../server/node_modules/dotenv');
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const TOKEN_URL = process.env.MCP_TOKEN_URL || 'https://cms-auth.iqraitacademy.com/realms/cms-mcp/protocol/openid-connect/token';
const MCP_URL = process.env.MCP_URL || 'https://cms-mcp.iqraitacademy.com/mcp';
const CLIENT_ID = process.env.MCP_CLIENT_ID || 'builder-mcp';
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || 'H9lON4kKQ4oOkakrthnyZTfVFp3C8B42iVKTIhSSJsu0kfpBHKM07UTwJ9woehvIc4pQrfmJvbCvBHk0gAQW9n';
const USERNAME = process.env.MCP_USERNAME || 'cms-builder';
const PASSWORD = process.env.MCP_PASSWORD || 'Iqra#321';
const READ_DB = process.env.MCP_DATABASE || 'mcp_cms_read';

async function getAccessToken() {
  const tokenParams = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: USERNAME,
    password: PASSWORD,
    scope: 'openid urn:oracle:dbtools:ords:mcpserver:all',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: tokenParams.toString(),
  });

  const data = await res.json();
  return data.access_token;
}

async function callTool(token, name, args = {}) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });

  console.log(`Tool ${name} status:`, res.status);
  const text = await res.text();
  return text;
}

async function main() {
  const token = await getAccessToken();

  console.log('=== Calling database_list ===');
  console.log(await callTool(token, 'database_list', { show_details: true }));

  console.log('\n=== Calling report_list ===');
  console.log(await callTool(token, 'report_list', { database: READ_DB }));

  console.log('\n=== Calling schema_information for CRM ===');
  console.log(await callTool(token, 'schema_information', { database: READ_DB, filter: '%INDUSTRY%', level: 'DETAILED' }));

  process.exit(0);
}

main();
