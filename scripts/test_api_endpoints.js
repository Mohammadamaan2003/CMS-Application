async function testEndpoints() {
  const endpoints = [
    'http://localhost:5000/api/companies?limit=5',
    'http://localhost:5000/api/contacts?limit=5',
    'http://localhost:5000/api/leads?limit=5',
    'http://localhost:5000/api/crm-upload/batches',
    'http://localhost:5000/api/crm-upload/company-invalid-data?limit=5',
    'http://localhost:5000/api/crm-upload/contact-invalid-data?limit=5',
    'http://localhost:5000/api/masters/company-types',
    'http://localhost:5000/api/sync/status'
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      console.log(`[${res.status}] ${url}`);
      if (json) {
        if (json.total !== undefined) console.log(`  -> total: ${json.total}, returned: ${json.data?.length || 0}`);
        else if (json.data) console.log(`  -> data type: ${Array.isArray(json.data) ? `Array(${json.data.length})` : typeof json.data}`);
        else if (json.companyBatches) console.log(`  -> companyBatches: ${json.companyBatches.length}, contactBatches: ${json.contactBatches.length}`);
      } else {
        console.log(`  -> raw output (${text.length} chars)`);
      }
    } catch (e) {
      console.log(`[ERR] ${url}: ${e.message}`);
    }
  }
  process.exit(0);
}

testEndpoints();
