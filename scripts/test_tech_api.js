const db = require('../server/db/pool');
(async () => {
  try {
    const tech = 'Power BI';
    const res = await db.query(
      `SELECT COUNT(*)::int as total FROM companies c WHERE LOWER(TRIM(COALESCE(c.technology, ''))) = LOWER(TRIM($1))`,
      [tech]
    );
    console.log(`Technology exact count for "${tech}":`, res.rows[0].total);

    const src = 'LinkedIn';
    const res2 = await db.query(
      `SELECT COUNT(*)::int as total FROM contacts c WHERE LOWER(TRIM(COALESCE(c.source, ''))) = LOWER(TRIM($1))`,
      [src]
    );
    console.log(`Source exact count for "${src}":`, res2.rows[0].total);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

