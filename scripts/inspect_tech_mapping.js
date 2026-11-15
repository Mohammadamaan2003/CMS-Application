const db = require('../server/db/pool');

async function checkTech() {
  try {
    const techSample = await db.query(`
      SELECT ll.technology, ll.technology_required, mt.technology as master_tech_name
      FROM lead_lines ll
      LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
      LIMIT 10
    `);
    console.log('Lead lines tech sample:', techSample.rows);

    const techCounts = await db.query(`
      SELECT 
        COALESCE(mt.technology, ll.technology_required, ll.technology, 'Other') as tech_name,
        COUNT(DISTINCT ll.lead_id) as lead_count,
        COUNT(*) as line_count
      FROM lead_lines ll
      LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
      GROUP BY tech_name
      ORDER BY lead_count DESC
      LIMIT 15
    `);
    console.log('Top Technologies by distinct lead count:', techCounts.rows);

    const leadTechCounts = await db.query(`
      SELECT technology, COUNT(*) 
      FROM leads 
      WHERE technology IS NOT NULL AND TRIM(technology) != ''
      GROUP BY technology 
      ORDER BY COUNT(*) DESC 
      LIMIT 10
    `);
    console.log('Leads.technology counts:', leadTechCounts.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTech();
