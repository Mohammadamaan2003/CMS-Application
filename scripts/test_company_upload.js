const assert = require('assert');

async function testUploadEndpoints() {
  console.log('--- TESTING COMPANY UPLOAD ENDPOINTS ---');

  // 1. Test GET /api/companies/upload/meta
  const metaRes = await fetch('http://localhost:5000/api/companies/upload/meta').then(r => r.json());
  assert.strictEqual(metaRes.success, true, 'metaRes.success should be true');
  console.log('1. GET /api/companies/upload/meta success: true');
  console.log('   Countries:', metaRes.data.countries.length, 'Industries:', metaRes.data.industries.length);

  // 2. Test GET /api/companies/upload/template
  const tplRes = await fetch('http://localhost:5000/api/companies/upload/template');
  assert.strictEqual(tplRes.status, 200, 'Template status 200');
  const tplText = await tplRes.text();
  assert(tplText.includes('Company Name'), 'Template contains Company Name');
  console.log('2. GET /api/companies/upload/template success: true, length:', tplText.length);

  // 3. Test POST /api/companies/upload/validate
  const testRows = [
    {
      __sourceRowNumber: 2,
      'Company Name': 'Test Brand New Company ' + Date.now(),
      'Website': 'https://brandnew-' + Date.now() + '.example.com',
      'Country': 'United States',
      'City': 'New York',
      'Industry': 'Financial Services',
      'Company Type': 'Direct Client',
      'Existing Company (Y/N)': 'N',
      'Registration Status': 'Active',
      'Email': 'test@brandnew.com',
    },
    {
      __sourceRowNumber: 3,
      'Company Name': '', // Missing name -> should fail
      'Country': 'India',
    },
    {
      __sourceRowNumber: 4,
      'Company Name': 'Codex MCP Validation 20261113', // Exists in DB -> duplicate check in insert mode
      'Existing Company (Y/N)': 'InvalidExistingVal', // Invalid check
      'Registration Status': 'SuperActive', // Invalid status
    },
    {
      __sourceRowNumber: 5,
      'Company Name': 'Test Brand New Company ' + Date.now(), // In-file duplicate of row 2
      'Country': 'UnknownCountryName123', // Warning
    }
  ];

  const valRes = await fetch('http://localhost:5000/api/companies/upload/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: testRows, mode: 'insert' }),
  }).then(r => r.json());

  assert.strictEqual(valRes.success, true, 'Validation success');
  console.log('3. POST /api/companies/upload/validate summary:', valRes.summary);
  assert.strictEqual(valRes.summary.total, 4);
  assert.strictEqual(valRes.summary.valid, 1);
  assert.strictEqual(valRes.summary.invalid, 3);

  console.log('   Row 2 errors:', valRes.results[0].errors.length, 'warnings:', valRes.results[0].warnings.length);
  console.log('   Row 3 errors:', valRes.results[1].errors.map(e => e.message));
  console.log('   Row 4 errors:', valRes.results[2].errors.map(e => e.message));
  console.log('   Row 5 errors:', valRes.results[3].errors.map(e => e.message), 'warnings:', valRes.results[3].warnings.map(w => w.message));

  // 4. Test POST /api/companies/upload/import (policy = 'skip')
  const importRes = await fetch('http://localhost:5000/api/companies/upload/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: valRes.results, mode: 'insert', policy: 'skip' }),
  }).then(r => r.json());

  assert.strictEqual(importRes.success, true, 'Import success');
  console.log('4. POST /api/companies/upload/import result:', importRes.message, 'imported:', importRes.importedCount, 'skipped:', importRes.skippedCount);
  assert.strictEqual(importRes.importedCount, 1, 'Should have imported exactly 1 valid row');
  assert.strictEqual(importRes.skippedCount, 3, 'Should have skipped 3 invalid rows');

  // Verify created company exists and clean it up
  const createdId = importRes.importedIds[0];
  const compRes = await fetch(`http://localhost:5000/api/companies/${createdId}`).then(r => r.json());
  assert.strictEqual(compRes.success, true);
  console.log('   Verified imported company ID:', createdId, 'Name:', compRes.data.comp_name);

  // Clean up
  const delRes = await fetch(`http://localhost:5000/api/companies/${createdId}`, { method: 'DELETE' }).then(r => r.json());
  console.log('   Cleaned up test company:', delRes.message);

  console.log('--- ALL COMPANY UPLOAD TESTS PASSED 100% ---');
}

testUploadEndpoints().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

