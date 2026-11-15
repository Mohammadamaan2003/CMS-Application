const { executeMcpSql } = require('./server/services/mcpSync');
const pool = require('./server/db/pool');

async function syncCountriesFull() {
  try {
    const rows = await executeMcpSql(
      `SELECT ID, COUNTRY, COMPANY_COUNT, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE FROM CRM.COUNTRY ORDER BY ID ASC`
    );
    console.log(`Fetched ${rows.length} countries from Oracle CRM.COUNTRY`);

    for (const r of rows) {
      await pool.query(
        `INSERT INTO master_countries (id, country, master_count, created_by, created_date, modified_by, modified_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           country = EXCLUDED.country,
           master_count = EXCLUDED.master_count,
           created_by = EXCLUDED.created_by,
           created_date = EXCLUDED.created_date,
           modified_by = EXCLUDED.modified_by,
           modified_date = EXCLUDED.modified_date`,
        [
          parseInt(r.ID, 10),
          r.COUNTRY !== undefined ? r.COUNTRY : '',
          parseInt(r.COMPANY_COUNT || 0, 10),
          r.CREATED_BY || 'APEX_PUBLIC_USER',
          r.CREATED_DATE || '20-JUL-2026',
          r.MODIFIED_BY || 'AMAAN',
          r.MODIFIED_DATE || '10-NOV-2026',
        ]
      );
    }

    await pool.query(
      `SELECT setval('master_countries_id_seq', COALESCE((SELECT MAX(id) FROM master_countries), 1))`
    );

    const countRes = await pool.query('SELECT count(*) FROM master_countries');
    console.log(`Successfully synced master_countries in PostgreSQL! Total records: ${countRes.rows[0].count}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync countries:', err);
    process.exit(1);
  }
}

syncCountriesFull();

