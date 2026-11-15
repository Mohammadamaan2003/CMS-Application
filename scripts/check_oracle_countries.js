const { executeMcpSql } = require('../server/services/mcpSync');

(async () => {
  try {
    const res = await executeMcpSql(`
      SELECT DISTINCT COUNTRY 
      FROM CRM.COMPANY 
      WHERE COUNTRY IS NOT NULL AND TRIM(COUNTRY) IS NOT NULL
      ORDER BY COUNTRY ASC
    `);
    console.log('Distinct company countries in Oracle CRM.COMPANY:', res.length);

    const masterRes = await executeMcpSql(`
      SELECT DISTINCT COUNTRY 
      FROM CRM.COUNTRY 
      WHERE COUNTRY IS NOT NULL AND TRIM(COUNTRY) IS NOT NULL
      ORDER BY COUNTRY ASC
    `);
    console.log('Distinct countries in Oracle CRM.COUNTRY:', masterRes.length);

    const masterSet = new Set(masterRes.map(r => (r.COUNTRY || '').trim().toLowerCase()));
    const unMatched = res.filter(r => !masterSet.has((r.COUNTRY || '').trim().toLowerCase()));
    console.log('Company countries not in Master in Oracle:', unMatched.length, unMatched.slice(0, 10));
  } catch (e) {
    console.error('Error checking Oracle countries:', e.message);
  }
  process.exit(0);
})();

