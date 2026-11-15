const db = require('../server/db/pool');
(async () => {
  try {
    const res = await db.query(`
      WITH comp_counts AS (
        SELECT 
          COALESCE(NULLIF(TRIM(technology), ''), '') as company_technology,
          COUNT(*)::int as dynamic_count
        FROM companies
        WHERE technology IS NOT NULL AND TRIM(technology) != ''
        GROUP BY COALESCE(NULLIF(TRIM(technology), ''), '')
      ),
      combined AS (
        SELECT 
          m.id,
          m.technology as master_technology,
          c.company_technology,
          c.dynamic_count,
          CASE 
            WHEN m.technology IS NOT NULL AND c.company_technology IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN m.technology IS NOT NULL AND (c.company_technology IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN COMPANY'
          END as validation_status
        FROM master_technologies m
        FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.technology)) = LOWER(TRIM(c.company_technology))
      )
      SELECT validation_status, COUNT(*)::int as count
      FROM combined
      GROUP BY validation_status
    `);
    console.log('Technology Validation Status breakdown:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

