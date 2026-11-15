const db = require('../server/db/pool');

async function testLeadLineFilters() {
  try {
    const res = await db.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM lead_lines ll 
          WHERE ll.lead_id = l.lead_id 
            AND LOWER(TRIM(ll.model)) = 'resource based'
        )) as resource_based_leads,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM lead_lines ll 
          WHERE ll.lead_id = l.lead_id 
            AND LOWER(TRIM(ll.cv_sent)) = 'yes'
        )) as cv_sent_leads
      FROM leads l
    `);
    console.log('Result:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testLeadLineFilters();
