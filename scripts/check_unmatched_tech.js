const db = require('../server/db/pool');
(async () => {
  try {
    const res = await db.query(`
      SELECT DISTINCT TRIM(c.technology) as comp_tech
      FROM companies c
      WHERE c.technology IS NOT NULL AND TRIM(c.technology) != ''
        AND NOT EXISTS (
          SELECT 1 FROM master_technologies m
          WHERE LOWER(TRIM(m.technology)) = LOWER(TRIM(c.technology))
        )
      LIMIT 10
    `);
    console.log('Technologies in companies not in master_technologies:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

