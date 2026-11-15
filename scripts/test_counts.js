const { pool } = require('../server/db/pool');

(async () => {
  const sql = `
    SELECT 
      CASE 
        WHEN m.country IS NOT NULL AND c.country IS NOT NULL THEN 'DATA IN BOTH'
        WHEN m.country IS NULL THEN 'DATA IN COMPANY'
        ELSE 'DATA IN MASTER'
      END as status,
      COUNT(*)::int as count
    FROM master_countries m
    FULL OUTER JOIN (
      SELECT DISTINCT country 
      FROM companies 
      WHERE country IS NOT NULL AND TRIM(country) != ''
    ) c ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
    GROUP BY 1
    ORDER BY 1;
  `;
  const res = await pool.query(sql);
  console.log('Reconciliation breakdown:', res.rows);
  
  const mcpTotalRes = await pool.query('SELECT COUNT(*)::int as total FROM master_countries');
  console.log('Total Master Countries:', mcpTotalRes.rows[0].total);

  process.exit(0);
})();

