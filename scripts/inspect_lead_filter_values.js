const db = require('../server/db/pool');

async function checkFilters() {
  try {
    const fields = [
      'name_of_coordinator',
      'account_manager',
      'lead_type',
      'industry',
      'source',
      'country',
      'company_type',
      'status',
      'lost_won',
      'probability',
      'proposal',
      'connection_sent'
    ];

    for (const f of fields) {
      const res = await db.query(`SELECT DISTINCT ${f} FROM leads WHERE ${f} IS NOT NULL AND TRIM(${f}) != '' ORDER BY ${f} LIMIT 10`);
      console.log(`\nDistinct ${f} (sample):`, res.rows.map(r => r[f]));
    }

    const yearRes = await db.query(`SELECT DISTINCT year FROM leads WHERE year IS NOT NULL ORDER BY year`);
    console.log('\nDistinct years:', yearRes.rows.map(r => r.year));

    const llModel = await db.query(`SELECT DISTINCT model FROM lead_lines WHERE model IS NOT NULL AND TRIM(model) != ''`);
    console.log('\nDistinct lead_lines.model:', llModel.rows.map(r => r.model));

    const llReqService = await db.query(`SELECT DISTINCT required_service FROM lead_lines WHERE required_service IS NOT NULL AND TRIM(required_service) != ''`);
    console.log('Distinct lead_lines.required_service:', llReqService.rows.map(r => r.required_service));

    const llCvSent = await db.query(`SELECT DISTINCT cv_sent FROM lead_lines WHERE cv_sent IS NOT NULL AND TRIM(cv_sent) != ''`);
    console.log('Distinct lead_lines.cv_sent:', llCvSent.rows.map(r => r.cv_sent));

    const lostWonCounts = await db.query(`SELECT lost_won, COUNT(*) FROM leads GROUP BY lost_won ORDER BY COUNT(*) DESC`);
    console.log('\nLost/Won breakdown in leads:', lostWonCounts.rows);

    const statusCounts = await db.query(`SELECT status, COUNT(*) FROM leads GROUP BY status ORDER BY COUNT(*) DESC LIMIT 8`);
    console.log('\nTop status breakdown in leads:', statusCounts.rows);

    const reasons = await db.query(`SELECT reason, COUNT(*) FROM leads WHERE reason IS NOT NULL AND TRIM(reason) != '' GROUP BY reason ORDER BY COUNT(*) DESC LIMIT 8`);
    console.log('\nTop lost reasons in leads:', reasons.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFilters();
