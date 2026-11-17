const path = require('path');
const dotenv = require('../server/node_modules/dotenv');
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const TOKEN_URL = process.env.MCP_TOKEN_URL || 'https://cms-auth.iqraitacademy.com/realms/cms-mcp/protocol/openid-connect/token';
const MCP_URL = process.env.MCP_URL || 'https://cms-mcp.iqraitacademy.com/mcp';
const CLIENT_ID = process.env.MCP_CLIENT_ID || 'builder-mcp';
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || 'H9lON4kKQ4oOkakrthnyZTfVFp3C8B42iVKTIhSSJsu0kfpBHKM07UTwJ9woehvIc4pQrfmJvbCvBHk0gAQW9n';
const USERNAME = process.env.MCP_USERNAME || 'cms-builder';
const PASSWORD = process.env.MCP_PASSWORD || 'Iqra#321';

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

async function main() {
  const token = await getAccessToken();

  const resTools = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }),
  });
  console.log('Status:', resTools.status);
  const text = await resTools.text();
  console.log('Body:', text);

  process.exit(0);
}

main();
