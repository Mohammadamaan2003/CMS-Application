const { getAccessToken } = require('../server/services/mcpSync');

(async () => {
  const token = await getAccessToken();
  const sql = `
    SELECT ID, COMP_NAME, TECHNOLOGY, COUNTRY, REMARK
    FROM CRM.COMPANY
    ORDER BY ID DESC NULLS LAST
    OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY
  `;

  const payload = {
    jsonrpc: '2.0',
    id: 'test_raw',
    method: 'tools/call',
    params: {
      name: 'sql_run',
      arguments: {
        database: 'mcp_cms_read',
        sql: sql,
      },
    },
  };

  const res = await fetch('https://cms-mcp.iqraitacademy.com/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const rawText = data.result?.content?.[0]?.text;
  console.log('--- RAW TEXT ---');
  console.log(rawText);
  console.log('--- END RAW TEXT ---');
  process.exit(0);
})();

