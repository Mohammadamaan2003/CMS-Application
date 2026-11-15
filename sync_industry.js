const { executeMcpSql } = require('./server/services/mcpSync');
const { pool } = require('./server/db/pool');

function formatOracleDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return '20-JUL-2026';
  const clean = dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${parts[0].padStart(2, '0')}-${parts[1].toUpperCase()}-${year}`;
  }
  return clean;
}

async function syncIndustry() {
  console.log('=== SYNCING CRM.INDUSTRY FROM ORACLE MCP TO POSTGRESQL ===');
  try {
    // 1. Ensure table schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_industries (
        id INT PRIMARY KEY,
        industry VARCHAR(500),
        company_type VARCHAR(255),
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'ADMIN',
        modified_date VARCHAR(100) DEFAULT '28-SEP-2026',
        company_count INT DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_master_industries_ind ON master_industries(LOWER(TRIM(industry)));
      CREATE INDEX IF NOT EXISTS idx_master_industries_type ON master_industries(LOWER(TRIM(company_type)));
      CREATE SEQUENCE IF NOT EXISTS master_industries_id_seq;
    `);

    // 2. Query Oracle MCP
    console.log('Fetching rows from CRM.INDUSTRY in Oracle MCP...');
    const rows = await executeMcpSql(`
      SELECT 
        ID, 
        INDUSTRY, 
        COMPANY_TYPE, 
        CREATED_BY, 
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, 
        MODIFIED_BY, 
        TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE
      FROM CRM.INDUSTRY
      ORDER BY ID ASC
    `);

    console.log(`Received ${rows.length} rows from MCP.`);

    // 3. Clear existing and batch insert into PostgreSQL
    await pool.query('DELETE FROM master_industries');

    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const slice = rows.slice(i, i + BATCH_SIZE);
      const valuePlaceholders = [];
      const values = [];

      slice.forEach((r, idx) => {
        const id = parseInt(r.ID || (i + idx + 1), 10);
        const ind = (r.INDUSTRY || '').trim();
        const ctype = (r.COMPANY_TYPE || '').trim();
        const cby = (r.CREATED_BY || 'APEX_PUBLIC_USER').trim();
        const cdate = formatOracleDate(r.CREATED_DATE);
        const mby = (r.MODIFIED_BY || 'ADMIN').trim();
        const mdate = formatOracleDate(r.MODIFIED_DATE);

        const base = idx * 7;
        valuePlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
        values.push(id, ind, ctype, cby, cdate, mby, mdate);
      });

      const sql = `
        INSERT INTO master_industries (id, industry, company_type, created_by, created_date, modified_by, modified_date)
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          industry = EXCLUDED.industry,
          company_type = EXCLUDED.company_type,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date
      `;
      await pool.query(sql, values);
    }

    // Set sequence
    await pool.query(`SELECT setval('master_industries_id_seq', COALESCE((SELECT MAX(id) FROM master_industries), 1))`);

    const countRes = await pool.query('SELECT COUNT(*) FROM master_industries');
    console.log(`Successfully synced ${countRes.rows[0].count} master industries into PostgreSQL.`);

  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    process.exit();
  }
}

syncIndustry();

