const { fetchMcpCompanies } = require('../server/services/mcpSync');

(async () => {
  try {
    const t0 = Date.now();
    const res = await fetchMcpCompanies({ limit: 10, offset: 0 });
    console.log(`Fetched ${res.data.length} companies out of ${res.total} in ${Date.now() - t0}ms`);
    console.log('First company:', res.data[0]?.id, res.data[0]?.comp_name);
  } catch (e) {
    console.error('fetchMcpCompanies error:', e.message);
  }
  process.exit(0);
})();
