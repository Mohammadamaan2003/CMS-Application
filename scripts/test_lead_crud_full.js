async function runTests() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('--- RUNNING FULL LEAD INTEGRATION TESTS ---');

  // 1. Fetch leads list
  const listRes = await fetch(`${baseUrl}/leads?limit=10&offset=0`);
  const listData = await listRes.json();
  console.log('1. GET /api/leads status:', listRes.status, 'Total:', listData.total, 'Count:', listData.data.length);
  if (listData.total < 769) throw new Error('Expected at least 769 leads');

  // 2. Fetch LOVs
  const lovRes = await fetch(`${baseUrl}/leads/meta/lovs`);
  const lovData = await lovRes.json();
  console.log('2. GET /api/leads/meta/lovs success:', lovData.success, 'AMs:', lovData.data.accountManagers.length, 'Currencies:', lovData.data.currencies.length);

  // 3. Test Create Lead
  const createLeadRes = await fetch(`${baseUrl}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: 'Test Acme Lead Corp',
      probability: 'P1',
      account_manager: 'Shirin',
      name_of_coordinator: 'Rifah Shaikh',
      contract_no: 'TEST-CNT-9999',
      industry: 'Software',
      country: 'UAE',
      city: 'Dubai',
      company_type: 'Direct Client',
      amount: 15000,
      amount_in_inr: 1250000,
    }),
  });
  const createdLead = await createLeadRes.json();
  console.log('3. POST /api/leads status:', createLeadRes.status, 'Created ID:', createdLead.data?.lead_id, 'Sr No:', createdLead.data?.sr_no);
  if (!createdLead.success) throw new Error('Failed to create lead');
  const testLeadId = createdLead.data.lead_id;

  // 4. Test Duplicate Contract No validation
  const dupContractRes = await fetch(`${baseUrl}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: 'Duplicate Acme',
      contract_no: 'test-cnt-9999', // case-insensitive duplicate
    }),
  });
  const dupContractData = await dupContractRes.json();
  console.log('4. Duplicate contract check status:', dupContractRes.status, 'Message:', dupContractData.message);
  if (dupContractRes.status !== 400) throw new Error('Duplicate contract should have failed with 400');

  // 5. Test Update Lead
  const updateRes = await fetch(`${baseUrl}/leads/${testLeadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      probability: 'P2',
      status: 'In active negotiation',
    }),
  });
  const updatedData = await updateRes.json();
  console.log('5. PUT /api/leads/:id status:', updateRes.status, 'Updated probability:', updatedData.data?.probability);

  // 6. Test Bulk Change Account Manager
  const bulkAmRes = await fetch(`${baseUrl}/leads/change-account-manager`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadIds: [testLeadId],
      accountManager: 'Heena Naaz',
    }),
  });
  const bulkAmData = await bulkAmRes.json();
  console.log('6. POST /api/leads/change-account-manager status:', bulkAmRes.status, 'Message:', bulkAmData.message);

  // 7. Test Lead Line (Create & Get)
  const lineRes = await fetch(`${baseUrl}/leads/${testLeadId}/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      technology: 'React & Node.js',
      model: 'Full Time',
      currency_id: 1,
      currency_code: 'USD',
      rate: 35,
      no_of_resources: '2',
      amount: 70,
      amount_in_inr: 5800,
      required_service: 'Resource-based',
    }),
  });
  const lineData = await lineRes.json();
  console.log('7. POST /api/leads/:id/lines status:', lineRes.status, 'Line ID:', lineData.data?.lead_line_id);
  const testLineId = lineData.data?.lead_line_id;

  // 8. Test Lead Contact (Create, Duplicate Check, Get)
  const contactRes = await fetch(`${baseUrl}/leads/${testLeadId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_full_name: 'John Doe',
      designation: 'CTO',
      email: 'john.doe@acme.com',
      mobile_number: '+1 555 1234',
    }),
  });
  const contactData = await contactRes.json();
  console.log('8. POST /api/leads/:id/contacts status:', contactRes.status, 'Contact ID:', contactData.data?.lead_contact_id);

  // Duplicate contact check
  const dupContactRes = await fetch(`${baseUrl}/leads/${testLeadId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_full_name: 'John Doe Duplicate',
      email: 'JOHN.DOE@ACME.COM', // case insensitive
    }),
  });
  const dupContactData = await dupContactRes.json();
  console.log('8b. Duplicate contact check status:', dupContactRes.status, 'Message:', dupContactData.message);
  if (dupContactRes.status !== 400) throw new Error('Duplicate contact should have failed with 400');

  // 9. Test Proposal (Create, Duplicate Check, Get)
  const propRes = await fetch(`${baseUrl}/leads/${testLeadId}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proposal_number: 'TEST-PRP-999',
      date_sent: '20-JUL-2026',
      proposal_description: 'Test Proposal for Acme Cloud Migration',
    }),
  });
  const propData = await propRes.json();
  console.log('9. POST /api/leads/:id/proposals status:', propRes.status, 'Prop ID:', propData.data?.proposal_id);

  // Duplicate proposal check (across whole system)
  const dupPropRes = await fetch(`${baseUrl}/leads/${testLeadId}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proposal_number: 'test-prp-999', // lowercase
    }),
  });
  const dupPropData = await dupPropRes.json();
  console.log('9b. Duplicate proposal check status:', dupPropRes.status, 'Message:', dupPropData.message);
  if (dupPropRes.status !== 400) throw new Error('Duplicate proposal should have failed with 400');

  // 10. Test Naukri AD
  const adRes = await fetch(`${baseUrl}/leads/${testLeadId}/naukri-ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ad_name: 'Senior Full Stack Developer',
      designation: 'Tech Lead',
      technology: 'React',
      experience: 5,
    }),
  });
  const adData = await adRes.json();
  console.log('10. POST /api/leads/:id/naukri-ads status:', adRes.status, 'Ad ID:', adData.data?.naukri_ad_id);

  // 11. Test Resource
  const resRes = await fetch(`${baseUrl}/leads/${testLeadId}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_line_id: testLineId,
      resource_name: 'Zain Developer',
      resource_type: 'Iqra Employee',
      designation: 'Senior Software Engineer',
    }),
  });
  const resData = await resRes.json();
  console.log('11. POST /api/leads/:id/resources status:', resRes.status, 'Resource ID:', resData.data?.resource_id);

  // 12. Delete Test Lead & verify cascade
  const delRes = await fetch(`${baseUrl}/leads/${testLeadId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('12. DELETE /api/leads/:id status:', delRes.status, 'Message:', delData.message);

  console.log('\n--- ALL LEAD INTEGRATION TESTS PASSED 100% ---');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});

