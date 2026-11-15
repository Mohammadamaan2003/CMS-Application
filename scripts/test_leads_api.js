async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/leads?limit=5');
    const json = await res.json();
    console.log('Leads API response status:', res.status);
    console.log('Total leads:', json.total);
    console.log('Sample lead sr_no:', json.data[0].sr_no, 'Company:', json.data[0].company_name);

    const lovsRes = await fetch('http://localhost:5000/api/leads/meta/lovs');
    const lovsJson = await lovsRes.json();
    console.log('LOVs success:', lovsJson.success);
    console.log('Account managers count:', lovsJson.data.accountManagers.length);
    console.log('Currencies count:', lovsJson.data.currencies.length);
  } catch (e) {
    console.error(e);
  }
}
test();

