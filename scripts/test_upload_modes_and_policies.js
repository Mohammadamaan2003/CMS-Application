const assert = require('assert');
const XLSX = require('../client/node_modules/xlsx');

async function runComprehensiveTests() {
  console.log('--- RUNNING COMPREHENSIVE UPLOAD MODES & POLICIES TEST ---');

  // 1. Generate an Excel workbook buffer with sample companies
  const wb = XLSX.utils.book_new();
  const sampleData = [
    {
      'Company Name': 'Excel Test Alpha ' + Date.now(),
      'Website': 'https://alpha-' + Date.now() + '.example.com',
      'Country': 'United States',
      'City': 'Boston',
      'Industry': 'Software Development',
      'Company Type': 'Direct Client',
      'Existing Company (Y/N)': 'N',
      'Registration Status': 'Active',
      'Company Phone': '+1-617-555-0111',
      'Email': 'alpha@example.com',
    },
    {
      'Company Name': 'Excel Test Beta ' + Date.now(),
      'Website': 'https://beta-' + Date.now() + '.example.com',
      'Country': 'United Arab Emirates',
      'City': 'Dubai',
      'Industry': 'Financial Services',
      'Company Type': 'IT Company',
      'Existing Company (Y/N)': 'Y',
      'Registration Status': 'Active',
      'Company Phone': '+971-4-555-0222',
      'Email': 'beta@example.com',
    },
    {
      'Company Name': '', // Invalid: missing name
      'Website': 'https://noname.example.com',
      'Country': 'India',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log('1. Generated test Excel buffer size:', buffer.length, 'bytes');

  // Parse it back as the client would
  const readWb = XLSX.read(buffer, { type: 'buffer' });
  const parsedRows = XLSX.utils.sheet_to_json(readWb.Sheets[readWb.SheetNames[0]], { defval: '' });
  const rowsWithNumbers = parsedRows.map((r, i) => ({ ...r, __sourceRowNumber: i + 2 }));

  // 2. Validate with backend in 'insert' mode
  const valRes = await fetch('http://localhost:5000/api/companies/upload/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: rowsWithNumbers, mode: 'insert' }),
  }).then(r => r.json());

  assert.strictEqual(valRes.success, true);
  assert.strictEqual(valRes.summary.total, 3);
  assert.strictEqual(valRes.summary.valid, 2);
  assert.strictEqual(valRes.summary.invalid, 1);
  console.log('2. Excel sheet validation passed: 2 valid, 1 invalid.');

  // 3. Test 'all_or_nothing' policy when invalid rows exist -> Should throw error / reject
  const failImport = await fetch('http://localhost:5000/api/companies/upload/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: valRes.results, mode: 'insert', policy: 'all_or_nothing' }),
  });
  assert.strictEqual(failImport.status >= 400 || (await failImport.json()).success === false, true);
  console.log('3. All-or-nothing policy correctly rejected batch with invalid rows.');

  // 4. Test 'skip' policy -> Imports 2 valid rows, skips 1
  const skipImport = await fetch('http://localhost:5000/api/companies/upload/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: valRes.results, mode: 'insert', policy: 'skip' }),
  }).then(r => r.json());

  assert.strictEqual(skipImport.success, true);
  assert.strictEqual(skipImport.importedCount, 2);
  assert.strictEqual(skipImport.skippedCount, 1);
  console.log('4. Skip policy successfully imported 2 rows and skipped 1 invalid row.');

  // 5. Test 'update' mode on the imported companies
  const updateData = [
    {
      __sourceRowNumber: 2,
      'Company Name': sampleData[0]['Company Name'],
      'Website': sampleData[0]['Website'],
      'City': 'Cambridge', // Updated city
      'Company Type': 'Partner',
    }
  ];

  const updateVal = await fetch('http://localhost:5000/api/companies/upload/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: updateData, mode: 'update' }),
  }).then(r => r.json());

  assert.strictEqual(updateVal.success, true);
  assert.strictEqual(updateVal.summary.valid, 1);

  const updateRes = await fetch('http://localhost:5000/api/companies/upload/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: updateVal.results, mode: 'update', policy: 'skip' }),
  }).then(r => r.json());

  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.importedCount, 1);
  console.log('5. Update mode successfully matched and updated company.');

  // Verify updated city
  const checkUpdated = await fetch(`http://localhost:5000/api/companies/${skipImport.importedIds[0]}`).then(r => r.json());
  assert.strictEqual(checkUpdated.data.city, 'Cambridge');
  console.log('   Verified updated city in DB:', checkUpdated.data.city);

  // Clean up test records
  for (const id of skipImport.importedIds) {
    await fetch(`http://localhost:5000/api/companies/${id}`, { method: 'DELETE' });
  }
  console.log('6. Cleaned up all test companies.');

  console.log('--- ALL COMPREHENSIVE TESTS PASSED 100% ---');
}

runComprehensiveTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

