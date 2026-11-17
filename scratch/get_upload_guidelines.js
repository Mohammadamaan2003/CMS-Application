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

async function runSql(sql) {
  const token = await getAccessToken();
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
        name: 'sql_run',
        arguments: {
          database: 'mcp_cms_builder',
          sql: sql,
        },
      },
    }),
  });

  const data = await res.json();
  return data.result?.content?.[0]?.text || '';
}

async function main() {
  const script = `
    SET SERVEROUTPUT ON SIZE UNLIMITED;
    DECLARE
      v_clob CLOB;
    BEGIN
      apex_util.set_workspace('IQRA_PROD');

      dbms_output.put_line('=== PAGE 51 - REGION 3193134406804451715 (Before You Upload) CONTENT ===');
      FOR r IN (
        SELECT region_source
        FROM apex_application_page_regions
        WHERE application_id = 136 AND page_id = 51 AND region_name = 'Before You Upload'
      ) LOOP
        dbms_output.put_line(r.region_source);
      END LOOP;

      dbms_output.put_line('=== PAGE 58 - REGION 3193134774934451718 (contact_upload_guidelines) CONTENT ===');
      FOR r IN (
        SELECT region_source
        FROM apex_application_page_regions
        WHERE application_id = 136 AND page_id = 58 AND region_name = 'contact_upload_guidelines'
      ) LOOP
        dbms_output.put_line(r.region_source);
      END LOOP;

    END;
    /
  `;
  const out = await runSql(script);
  console.log(out);

  process.exit(0);
}

main();
