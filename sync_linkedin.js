const { executeMcpSql } = require('./server/services/mcpSync');
const { pool } = require('./server/db/pool');

function formatOracleDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${parts[0].padStart(2, '0')}-${parts[1].toUpperCase()}-${year}`;
  }
  return clean;
}

async function syncLinkedin() {
  console.log('=== SYNCING CRM.LINKEDIN_ACCOUNT_AND_COUNTRY FROM ORACLE MCP TO POSTGRESQL ===');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_linkedin_accounts (
        id INT PRIMARY KEY,
        linkedin_conn_acc VARCHAR(255) NOT NULL,
        linked_id VARCHAR(255),
        linked_in_url TEXT,
        country VARCHAR(500),
        linked_in_updated_date VARCHAR(100),
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'MARIYA_BADAR',
        modified_date VARCHAR(100) DEFAULT '12-NOV-2026',
        is_active VARCHAR(10) DEFAULT 'Y',
        contact_count INT DEFAULT 0
      );
      CREATE SEQUENCE IF NOT EXISTS master_linkedin_accounts_id_seq;
      CREATE INDEX IF NOT EXISTS idx_master_linkedin_acc ON master_linkedin_accounts(LOWER(TRIM(linkedin_conn_acc)));
    `);

    const rows = await executeMcpSql(`
      SELECT 
        ID, 
        LINKEDIN_CONN_ACC, 
        LINKED_ID, 
        LINKED_IN_URL, 
        COUNTRY, 
        TO_CHAR(LINKED_IN_UPDATED_DATE, 'DD-MON-YYYY') as LINKED_IN_UPDATED_DATE,
        CREATED_BY, 
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, 
        MODIFIED_BY, 
        TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE,
        IS_ACTIVE,
        CONTACT_COUNT
      FROM CRM.LINKEDIN_ACCOUNT_AND_COUNTRY
      ORDER BY ID ASC
    `);

    console.log(`Fetched ${rows.length} rows from MCP.`);

    await pool.query('DELETE FROM master_linkedin_accounts');

    for (const r of rows) {
      const id = parseInt(r.ID, 10);
      const acc = (r.LINKEDIN_CONN_ACC || '').trim();
      const lid = (r.LINKED_ID || '').trim();
      const url = (r.LINKED_IN_URL || '').trim();
      const country = (r.COUNTRY || '').trim();
      const updatedDate = formatOracleDate(r.LINKED_IN_UPDATED_DATE);
      const cby = (r.CREATED_BY || 'APEX_PUBLIC_USER').trim();
      const cdate = formatOracleDate(r.CREATED_DATE) || '20-JUL-2026';
      const mby = (r.MODIFIED_BY || 'MARIYA_BADAR').trim();
      const mdate = formatOracleDate(r.MODIFIED_DATE) || '12-NOV-2026';
      const isActive = (r.IS_ACTIVE || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N';
      const cnt = parseInt(r.CONTACT_COUNT || 0, 10);

      await pool.query(`
        INSERT INTO master_linkedin_accounts (
          id, linkedin_conn_acc, linked_id, linked_in_url, country,
          linked_in_updated_date, created_by, created_date, modified_by, modified_date,
          is_active, contact_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          linkedin_conn_acc = EXCLUDED.linkedin_conn_acc,
          linked_id = EXCLUDED.linked_id,
          linked_in_url = EXCLUDED.linked_in_url,
          country = EXCLUDED.country,
          linked_in_updated_date = EXCLUDED.linked_in_updated_date,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date,
          is_active = EXCLUDED.is_active,
          contact_count = EXCLUDED.contact_count
      `, [id, acc, lid, url, country, updatedDate, cby, cdate, mby, mdate, isActive, cnt]);
    }

    // Set auto-increment sequence
    await pool.query(`SELECT setval('master_linkedin_accounts_id_seq', COALESCE((SELECT MAX(id) FROM master_linkedin_accounts), 1))`);

    // Let's also update dynamic contact_count from contacts table
    await pool.query(`
      WITH counts AS (
        SELECT 
          LOWER(TRIM(c.acc)) as acc_name,
          COUNT(*)::int as cnt
        FROM (
          SELECT unnest(string_to_array(COALESCE(NULLIF(TRIM(linkedin_cnnctd_acc), ''), NULLIF(TRIM(linkedin_connected_acc), '')), ',')) as acc
          FROM contacts
        ) c
        WHERE c.acc IS NOT NULL AND TRIM(c.acc) != ''
        GROUP BY LOWER(TRIM(c.acc))
      )
      UPDATE master_linkedin_accounts m
      SET contact_count = GREATEST(COALESCE(counts.cnt, 0), m.contact_count)
      FROM counts
      WHERE LOWER(TRIM(m.linkedin_conn_acc)) = counts.acc_name
    `);

    const result = await pool.query('SELECT * FROM master_linkedin_accounts ORDER BY id ASC');
    console.log(`Successfully stored ${result.rows.length} rows in PostgreSQL master_linkedin_accounts:`);
    console.table(result.rows.map(r => ({
      id: r.id,
      account: r.linkedin_conn_acc,
      active: r.is_active,
      count: r.contact_count,
      country: r.country
    })));

  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    process.exit();
  }
}

syncLinkedin();

