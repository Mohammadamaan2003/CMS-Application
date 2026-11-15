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

async function syncDesignationPositions() {
  console.log('=== SYNCING CRM.DESIGNATION_AND_POSITION INTO POSTGRESQL ===');

  // 1. Ensure Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_designation_positions (
      id INT PRIMARY KEY,
      designation VARCHAR(500),
      position_type VARCHAR(255),
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100) DEFAULT '09-SEP-2026',
      modified_by VARCHAR(100),
      modified_date VARCHAR(100),
      designation_count INTEGER DEFAULT 0,
      position_type_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_mdp_desig ON master_designation_positions (LOWER(TRIM(designation)));
    CREATE INDEX IF NOT EXISTS idx_mdp_pos ON master_designation_positions (LOWER(TRIM(position_type)));
  `);

  console.log('Fetching total count from Oracle MCP CRM.DESIGNATION_AND_POSITION...');
  const countRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.DESIGNATION_AND_POSITION');
  const total = parseInt(countRes[0]?.TOTAL || 22691, 10);
  console.log(`Total records to sync: ${total}`);

  const chunkSize = 5000;
  let offset = 0;
  let totalInserted = 0;

  // Truncate to start fresh
  await pool.query('DELETE FROM master_designation_positions');

  while (offset < total) {
    console.log(`Fetching chunk: offset ${offset}, limit ${chunkSize}...`);
    const sql = `
      SELECT ID_NEW as ID, DESIGNATION, POSITION_TYPE, CREATED_BY, 
             TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CDATE, 
             MODIFIED_BY, 
             TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MDATE, 
             DESIGNATION_COUNT, POSITION_TYPE_COUNT 
      FROM CRM.DESIGNATION_AND_POSITION 
      ORDER BY ID_NEW ASC
      OFFSET ${offset} ROWS FETCH NEXT ${chunkSize} ROWS ONLY
    `;
    const rows = await executeMcpSql(sql);
    if (!rows || rows.length === 0) break;

    // Batch insert
    for (const r of rows) {
      const id = parseInt(r.ID, 10);
      const designation = r.DESIGNATION || '';
      const positionType = r.POSITION_TYPE || '';
      const cby = r.CREATED_BY || 'ADMIN';
      const cdate = formatOracleDate(r.CDATE) || '09-SEP-2026';
      const mby = r.MODIFIED_BY || '';
      const mdate = formatOracleDate(r.MDATE) || '';
      const desigCount = parseInt(r.DESIGNATION_COUNT || 0, 10);
      const posCount = parseInt(r.POSITION_TYPE_COUNT || 0, 10);

      await pool.query(`
        INSERT INTO master_designation_positions (id, designation, position_type, created_by, created_date, modified_by, modified_date, designation_count, position_type_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          designation = EXCLUDED.designation,
          position_type = EXCLUDED.position_type,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date,
          designation_count = EXCLUDED.designation_count,
          position_type_count = EXCLUDED.position_type_count
      `, [id, designation, positionType, cby, cdate, mby, mdate, desigCount, posCount]);
      totalInserted++;
    }

    console.log(`Inserted chunk. Cumulative: ${totalInserted}/${total}`);
    offset += chunkSize;
  }

  // Align sequence
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_designation_positions_id_seq`);
  await pool.query(`SELECT setval('master_designation_positions_id_seq', COALESCE((SELECT MAX(id) FROM master_designation_positions), 1))`).catch(() => {});

  console.log(`\n=== SYNC COMPLETE: ${totalInserted} records synced into master_designation_positions ===`);
}

syncDesignationPositions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Sync Error:', err);
    process.exit(1);
  });

