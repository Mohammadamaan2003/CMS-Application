const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    const single = await get('http://localhost:5000/api/masters/technology/29');
    console.log('Single Technology Power BI:', {
      technology: single.data?.master_technology,
      total_count: single.data?.total_count,
      contact_technology_count: single.data?.contact_technology_count,
      validation_status: single.data?.validation_status
    });

    const companies = await get('http://localhost:5000/api/masters/technology/29/companies?technology=Power%20BI&limit=10');
    console.log('Child Companies for Power BI:', {
      total: companies.total,
      rowsReturned: companies.data?.length,
      sampleTechnologies: companies.data?.slice(0, 3).map(r => r.technology)
    });

    if (single.data?.total_count === companies.total && companies.total === 375) {
      console.log('SUCCESS: Form total_count (375) matches Child Report total (375) with exact match!');
    } else {
      console.error('MISMATCH: total_count =', single.data?.total_count, 'companies total =', companies.total);
    }

    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
})();

