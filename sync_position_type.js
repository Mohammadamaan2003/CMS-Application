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

async function syncPositionType() {
  console.log('=== SYNCING CRM.POSITION_TYPE FROM ORACLE MCP TO POSTGRESQL ===');
  try {
    // 1. Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_position_types (
        id INT PRIMARY KEY,
        pos_type VARCHAR(255) NOT NULL,
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'MARIYA_BADAR',
        modified_date VARCHAR(100) DEFAULT '12-NOV-2026',
        contact_count INT DEFAULT 0
      );
      CREATE SEQUENCE IF NOT EXISTS master_position_types_id_seq;
      CREATE INDEX IF NOT EXISTS idx_master_position_types_name ON master_position_types(LOWER(TRIM(pos_type)));
    `);

    // 2. Fetch rows from Oracle MCP
    const rows = await executeMcpSql(`
      SELECT 
        ID, 
        POS_TYPE, 
        CREATED_BY, 
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, 
        MODIFIED_BY, 
        TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE,
        CONTACT_COUNT
      FROM CRM.POSITION_TYPE
      ORDER BY ID
    `);

    console.log(`Fetched ${rows.length} rows from Oracle CRM.POSITION_TYPE`);

    // 3. Insert or update rows in PostgreSQL
    for (const r of rows) {
      const id = parseInt(r.ID || r.id, 10);
      const posType = (r.POS_TYPE || r.pos_type || '').trim();
      if (!posType) continue;

      const createdBy = r.CREATED_BY || r.created_by || 'APEX_PUBLIC_USER';
      const createdDate = formatOracleDate(r.CREATED_DATE || r.created_date) || '20-JUL-2026';
      const modifiedBy = r.MODIFIED_BY || r.modified_by || 'MARIYA_BADAR';
      const modifiedDate = formatOracleDate(r.MODIFIED_DATE || r.modified_date) || '12-NOV-2026';
      const contactCount = parseInt(r.CONTACT_COUNT || r.contact_count || '0', 10);

      await pool.query(`
        INSERT INTO master_position_types (id, pos_type, created_by, created_date, modified_by, modified_date, contact_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          pos_type = EXCLUDED.pos_type,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date,
          contact_count = EXCLUDED.contact_count
      `, [id, posType, createdBy, createdDate, modifiedBy, modifiedDate, contactCount]);
    }

    // 4. Align sequence
    await pool.query(`
      SELECT setval('master_position_types_id_seq', COALESCE((SELECT MAX(id) FROM master_position_types), 1));
      ALTER TABLE master_position_types ALTER COLUMN id SET DEFAULT nextval('master_position_types_id_seq');
    `);

    // 5. Update contact counts dynamically from contacts table
    await pool.query(`
      UPDATE master_position_types m
      SET contact_count = (
        SELECT COUNT(*)::int
        FROM contacts c
        WHERE LOWER(TRIM(COALESCE(c.pos_type, ''))) = LOWER(TRIM(m.pos_type))
      );
    `);

    // 6. Check results
    const res = await pool.query(`SELECT * FROM master_position_types ORDER BY contact_count DESC`);
    console.log(`Synced ${res.rows.length} rows in master_position_types:`);
    console.table(res.rows);

  } catch (err) {
    console.error('Error syncing Position Types:', err);
  } finally {
    await pool.end();
  }
}

syncPositionType();

