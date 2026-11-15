const { pool } = require('../server/db/pool');

(async () => {
  const baseCte = `
    WITH comp_counts AS (
      SELECT 
        COALESCE(NULLIF(TRIM(country), ''), '') as country,
        COUNT(*)::int as dynamic_count
      FROM companies
      GROUP BY COALESCE(NULLIF(TRIM(country), ''), '')
    ),
    reconciled AS (
      SELECT 
        COALESCE(m.id, 999000 + ROW_NUMBER() OVER ()) as id,
        COALESCE(m.country, '') as master_country,
        CASE 
          WHEN m.country IS NOT NULL AND c.country IS NOT NULL AND c.country != '' THEN c.dynamic_count
          ELSE 0
        END as master_country_count,
        COALESCE(c.country, '') as company_country,
        COALESCE(c.dynamic_count, 0) as company_country_count,
        CASE 
          WHEN m.country IS NOT NULL AND m.country != '' AND c.country IS NOT NULL AND c.country != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
          WHEN (m.country IS NULL OR m.country = '') AND c.country IS NOT NULL THEN 'DATA IN COMPANY'
          WHEN m.country IS NOT NULL AND (c.country IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
          ELSE 'DATA IN BOTH'
        END as validation_status,
        COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
        COALESCE(m.created_date, '20-JUL-2026') as created_date,
        COALESCE(m.modified_by, 'AMAAN') as modified_by,
        COALESCE(m.modified_date, '10-NOV-2026') as modified_date
      FROM master_countries m
      FULL OUTER JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
    )
  `;

  const countsSql = `
    ${baseCte}
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE validation_status = 'DATA IN BOTH')::int as total_both,
      COUNT(*) FILTER (WHERE validation_status = 'DATA IN MASTER')::int as total_master_only,
      COUNT(*) FILTER (WHERE validation_status = 'DATA IN COMPANY')::int as total_company_only
    FROM reconciled
  `;
  const countsRes = await pool.query(countsSql);
  console.log('Counts:', countsRes.rows[0]);

  const dataSql = `
    ${baseCte}
    SELECT * FROM reconciled
    ORDER BY 
      CASE 
        WHEN validation_status = 'DATA IN BOTH' THEN 1
        WHEN validation_status = 'DATA IN COMPANY' THEN 2
        ELSE 3
      END,
      company_country_count DESC,
      master_country ASC
    LIMIT 5 OFFSET 0
  `;
  const dataRes = await pool.query(dataSql);
  console.log('Sample rows:', dataRes.rows);
  process.exit(0);
})();

