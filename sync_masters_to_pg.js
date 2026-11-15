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

async function syncAllMasters() {
  console.log('=== STARTING COMPLETE MASTER SYNC FROM MCP TO POSTGRESQL ===\n');

  // 1. Create Tables
  console.log('[Schema] Ensuring all Master tables exist in PostgreSQL...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_company_sizes (
      id INT PRIMARY KEY,
      master_company_size VARCHAR(255) UNIQUE NOT NULL,
      master_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'AMAAN',
      modified_date VARCHAR(100) DEFAULT '10-NOV-2026'
    );

    CREATE TABLE IF NOT EXISTS master_company_types (
      id INT PRIMARY KEY,
      master_company_type VARCHAR(255) UNIQUE NOT NULL,
      master_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ZAIN_DATEY',
      modified_date VARCHAR(100) DEFAULT '07-NOV-2026'
    );

    CREATE TABLE IF NOT EXISTS master_countries (
      id INT PRIMARY KEY,
      country VARCHAR(255) UNIQUE,
      master_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'AMAAN',
      modified_date VARCHAR(100) DEFAULT '10-NOV-2026'
    );

    CREATE TABLE IF NOT EXISTS country_city_mapping (
      id INT PRIMARY KEY,
      country VARCHAR(255),
      city VARCHAR(255),
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '08-SEP-2026',
      modified_by VARCHAR(100) DEFAULT 'ZAIN_DATEY',
      modified_date VARCHAR(100) DEFAULT '06-NOV-2026'
    );

    CREATE TABLE IF NOT EXISTS master_technologies (
      id INT PRIMARY KEY,
      technology VARCHAR(255) UNIQUE,
      technology_category VARCHAR(255),
      master_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ADMIN',
      modified_date VARCHAR(100) DEFAULT '28-SEP-2026'
    );

    CREATE TABLE IF NOT EXISTS master_sources (
      id INT PRIMARY KEY,
      source VARCHAR(255) UNIQUE,
      master_count INTEGER DEFAULT 0,
      contact_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ADMIN',
      modified_date VARCHAR(100) DEFAULT '28-SEP-2026'
    );

    CREATE TABLE IF NOT EXISTS master_contact_statuses (
      id INT PRIMARY KEY,
      contact_status VARCHAR(255) UNIQUE,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ADMIN',
      modified_date VARCHAR(100) DEFAULT '28-SEP-2026'
    );

    CREATE TABLE IF NOT EXISTS master_industries (
      id INT PRIMARY KEY,
      industry VARCHAR(255),
      company_type VARCHAR(255),
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ADMIN',
      modified_date VARCHAR(100) DEFAULT '28-SEP-2026'
    );

    CREATE TABLE IF NOT EXISTS master_account_managers (
      id INT PRIMARY KEY,
      account_manager VARCHAR(255) UNIQUE,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '28-AUG-2026',
      modified_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      modified_date VARCHAR(100) DEFAULT '28-AUG-2026'
    );

    CREATE TABLE IF NOT EXISTS master_company_categories (
      id INT PRIMARY KEY,
      company_categories VARCHAR(255) UNIQUE,
      master_count INTEGER DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
      created_date VARCHAR(100) DEFAULT '20-JUL-2026',
      modified_by VARCHAR(100) DEFAULT 'ADMIN',
      modified_date VARCHAR(100) DEFAULT '09-OCT-2026'
    );
  `);
  console.log('[Schema] Tables verified successfully.\n');

  // 2. Sync Company Sizes
  console.log('[Sync 1/8] Syncing CRM.COMPANY_SIZE from MCP...');
  const sizeRows = await executeMcpSql(`
    SELECT ID, COMPANY_SIZE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT
    FROM CRM.COMPANY_SIZE
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_company_sizes');
  for (const r of sizeRows) {
    if (!r.COMPANY_SIZE) continue;
    await pool.query(`
      INSERT INTO master_company_sizes (id, master_company_size, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      parseInt(r.ID, 10),
      r.COMPANY_SIZE,
      parseInt(r.COMPANY_COUNT || 0, 10),
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'AMAAN',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 1/8] Synced ${sizeRows.length} company sizes.`);

  // 3. Sync Company Types
  console.log('[Sync 2/8] Syncing CRM.COMPANY_TYPE from MCP...');
  const typeRows = await executeMcpSql(`
    SELECT ID, COMPANY_TYPE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_TYPE_COUNT
    FROM CRM.COMPANY_TYPE
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_company_types');
  for (const r of typeRows) {
    if (!r.COMPANY_TYPE) continue;
    await pool.query(`
      INSERT INTO master_company_types (id, master_company_type, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      parseInt(r.ID, 10),
      r.COMPANY_TYPE,
      parseInt(r.COMPANY_TYPE_COUNT || 0, 10),
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'ZAIN_DATEY',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 2/8] Synced ${typeRows.length} company types.`);

  // 4. Sync Countries
  console.log('[Sync 3/8] Syncing CRM.COUNTRY from MCP...');
  const countryRows = await executeMcpSql(`
    SELECT ID, COUNTRY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT
    FROM CRM.COUNTRY
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_countries');
  for (const r of countryRows) {
    const countryVal = r.COUNTRY !== undefined ? r.COUNTRY : '';
    await pool.query(`
      INSERT INTO master_countries (id, country, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      parseInt(r.ID, 10),
      countryVal,
      parseInt(r.COMPANY_COUNT || 0, 10),
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'AMAAN',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 3/8] Synced ${countryRows.length} countries.`);

  // 5. Sync Country & City Mapping (ALL 4,334 authentic records!)
  console.log('[Sync 4/8] Syncing CRM.COUNTRY_CITY_MAPPING from MCP (4,334 records)...');
  const mappingRows = await executeMcpSql(`
    SELECT ID, COUNTRY, CITY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT
    FROM CRM.COUNTRY_CITY_MAPPING
    ORDER BY ID ASC
  `);

  await pool.query('DELETE FROM country_city_mapping');
  let mappingSynced = 0;
  for (const r of mappingRows) {
    const id = parseInt(r.ID, 10);
    const country = r.COUNTRY || '';
    const city = r.CITY || '';
    const cby = r.CREATED_BY || 'APEX_PUBLIC_USER';
    const cdate = formatOracleDate(r.CREATED_DATE);
    const mby = r.MODIFIED_BY || 'ZAIN_DATEY';
    const mdate = formatOracleDate(r.MODIFIED_DATE);

    await pool.query(`
      INSERT INTO country_city_mapping (id, country, city, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        country = EXCLUDED.country,
        city = EXCLUDED.city,
        created_by = EXCLUDED.created_by,
        created_date = EXCLUDED.created_date,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date
    `, [id, country, city, cby, cdate, mby, mdate]);
    mappingSynced++;
  }
  console.log(`[Sync 4/8] Successfully synced ${mappingSynced} country-city mappings into PostgreSQL.`);

  // 6. Sync Technologies
  console.log('[Sync 5/8] Syncing CRM.TECHNOLOGY from MCP...');
  const techRows = await executeMcpSql(`
    SELECT ID, TECHNOLOGY, TECHNOLOGY_CATEGORY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT
    FROM CRM.TECHNOLOGY
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_technologies');
  for (const r of techRows) {
    if (!r.TECHNOLOGY) continue;
    await pool.query(`
      INSERT INTO master_technologies (id, technology, technology_category, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      parseInt(r.ID, 10),
      r.TECHNOLOGY,
      r.TECHNOLOGY_CATEGORY || '',
      parseInt(r.COMPANY_COUNT || 0, 10),
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'ADMIN',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 5/8] Synced ${techRows.length} technologies.`);

  // 7. Sync Sources
  console.log('[Sync 6/8] Syncing CRM.SOURCE from MCP...');
  const sourceRows = await executeMcpSql(`
    SELECT ID, SOURCE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT, CONTACT_COUNT
    FROM CRM.SOURCE
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_sources');
  for (const r of sourceRows) {
    if (!r.SOURCE) continue;
    await pool.query(`
      INSERT INTO master_sources (id, source, master_count, contact_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      parseInt(r.ID, 10),
      r.SOURCE,
      parseInt(r.COMPANY_COUNT || 0, 10),
      parseInt(r.CONTACT_COUNT || 0, 10),
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'ADMIN',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 6/8] Synced ${sourceRows.length} sources.`);

  // 8. Sync Contact Status
  console.log('[Sync 7/8] Syncing CRM.CONTACT_STATUS from MCP...');
  const statusRows = await executeMcpSql(`
    SELECT ID, CONTACT_STATUS, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE
    FROM CRM.CONTACT_STATUS
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_contact_statuses');
  for (const r of statusRows) {
    if (!r.CONTACT_STATUS) continue;
    await pool.query(`
      INSERT INTO master_contact_statuses (id, contact_status, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      parseInt(r.ID, 10),
      r.CONTACT_STATUS,
      r.CREATED_BY || 'APEX_PUBLIC_USER',
      formatOracleDate(r.CREATED_DATE),
      r.MODIFIED_BY || 'ADMIN',
      formatOracleDate(r.MODIFIED_DATE)
    ]);
  }
  console.log(`[Sync 7/8] Synced ${statusRows.length} contact statuses.`);

  // 9. Sync Account Managers & Company Categories
  console.log('[Sync 8/8] Syncing Account Managers and Categories...');
  const mgrRows = await executeMcpSql(`
    SELECT ID, ACCOUNT_MANAGER, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE
    FROM CRM.ACCOUNT_MANAGER
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_account_managers');
  for (const r of mgrRows) {
    if (!r.ACCOUNT_MANAGER) continue;
    await pool.query(`
      INSERT INTO master_account_managers (id, account_manager, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [parseInt(r.ID, 10), r.ACCOUNT_MANAGER, r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.MODIFIED_DATE)]);
  }

  const catRows = await executeMcpSql(`
    SELECT ID, COMPANY_CATEGORIES, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT
    FROM CRM.COMPANY_CATEGORIES
    ORDER BY ID ASC
  `);
  await pool.query('DELETE FROM master_company_categories');
  for (const r of catRows) {
    if (!r.COMPANY_CATEGORIES) continue;
    await pool.query(`
      INSERT INTO master_company_categories (id, company_categories, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [parseInt(r.ID, 10), r.COMPANY_CATEGORIES, parseInt(r.COMPANY_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ADMIN', formatOracleDate(r.MODIFIED_DATE)]);
  }

  // 10. Align all sequences to MAX(id)
  console.log('\n[Sequences] Aligning auto-increment sequences in PostgreSQL...');
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_company_sizes_id_seq`);
  await pool.query(`SELECT setval('master_company_sizes_id_seq', COALESCE((SELECT MAX(id) FROM master_company_sizes), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_company_types_id_seq`);
  await pool.query(`SELECT setval('master_company_types_id_seq', COALESCE((SELECT MAX(id) FROM master_company_types), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_countries_id_seq`);
  await pool.query(`SELECT setval('master_countries_id_seq', COALESCE((SELECT MAX(id) FROM master_countries), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS country_city_mapping_id_seq`);
  await pool.query(`SELECT setval('country_city_mapping_id_seq', COALESCE((SELECT MAX(id) FROM country_city_mapping), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_technologies_id_seq`);
  await pool.query(`SELECT setval('master_technologies_id_seq', COALESCE((SELECT MAX(id) FROM master_technologies), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_sources_id_seq`);
  await pool.query(`SELECT setval('master_sources_id_seq', COALESCE((SELECT MAX(id) FROM master_sources), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_contact_statuses_id_seq`);
  await pool.query(`SELECT setval('master_contact_statuses_id_seq', COALESCE((SELECT MAX(id) FROM master_contact_statuses), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_account_managers_id_seq`);
  await pool.query(`SELECT setval('master_account_managers_id_seq', COALESCE((SELECT MAX(id) FROM master_account_managers), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_company_categories_id_seq`);
  await pool.query(`SELECT setval('master_company_categories_id_seq', COALESCE((SELECT MAX(id) FROM master_company_categories), 1))`).catch(() => {});

  console.log('=== MASTER SYNC COMPLETED SUCCESSFULLY ===');
}

syncAllMasters()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Sync Error:', err);
    process.exit(1);
  });
