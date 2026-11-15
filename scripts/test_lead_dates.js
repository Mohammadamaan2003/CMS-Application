const db = require('../server/db/pool');

async function testDates() {
  try {
    const datesRes = await db.query(`
      SELECT lead_date, created_date, modified_date, lost_won, amount_in_inr
      FROM leads
      WHERE lost_won IN ('Won', 'Lost')
      LIMIT 10
    `);
    console.log('Sample Won/Lost rows:', datesRes.rows);

    // Let's test parsing lead_date and modified_date in Postgres
    const testCalc = await db.query(`
      SELECT 
        lead_date,
        modified_date,
        TO_DATE(lead_date, 'DD/MM/YYYY') as parsed_lead_date,
        TO_DATE(modified_date, 'DD-MON-YYYY') as parsed_modified_date,
        (TO_DATE(modified_date, 'DD-MON-YYYY') - TO_DATE(lead_date, 'DD/MM/YYYY')) as diff_days
      FROM leads
      WHERE lost_won IN ('Won', 'Lost')
        AND lead_date IS NOT NULL AND lead_date != ''
        AND modified_date IS NOT NULL AND modified_date != ''
      LIMIT 5
    `);
    console.log('Parsed date diffs:', testCalc.rows);

    const avgRes = await db.query(`
      SELECT 
        ROUND(AVG(TO_DATE(modified_date, 'DD-MON-YYYY') - TO_DATE(lead_date, 'DD/MM/YYYY')), 1) as avg_days_to_close
      FROM leads
      WHERE lost_won IN ('Won', 'Lost')
        AND lead_date ~ '^\\d{2}/\\d{2}/\\d{4}$'
        AND modified_date ~ '^\\d{2}-[A-Za-z]{3}-\\d{4}$'
    `);
    console.log('Average Days to Close across valid records:', avgRes.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('Date test error:', err);
    process.exit(1);
  }
}

testDates();
