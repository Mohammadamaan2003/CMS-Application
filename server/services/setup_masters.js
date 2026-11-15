const { query, pool } = require('../db/pool');

async function setupMastersTable() {
  try {
    // 1. Master Company Sizes
    await query(`
      CREATE TABLE IF NOT EXISTS master_company_sizes (
        id INT PRIMARY KEY,
        master_company_size VARCHAR(255) UNIQUE NOT NULL,
        master_count INTEGER DEFAULT 0,
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'AMAAN',
        modified_date VARCHAR(100) DEFAULT '10-NOV-2026'
      )
    `);

    // 2. Master Company Types
    await query(`
      CREATE TABLE IF NOT EXISTS master_company_types (
        id INT PRIMARY KEY,
        master_company_type VARCHAR(255) UNIQUE NOT NULL,
        master_count INTEGER DEFAULT 0,
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'ZAIN_DATEY',
        modified_date VARCHAR(100) DEFAULT '07-NOV-2026'
      )
    `);

    // 3. Master Countries
    await query(`
      CREATE TABLE IF NOT EXISTS master_countries (
        id INT PRIMARY KEY,
        country VARCHAR(255) UNIQUE,
        master_count INTEGER DEFAULT 0,
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'AMAAN',
        modified_date VARCHAR(100) DEFAULT '10-NOV-2026'
      )
    `);

    // 4. Country & City Mapping
    await query(`
      CREATE TABLE IF NOT EXISTS country_city_mapping (
        id INT PRIMARY KEY,
        country VARCHAR(255),
        city VARCHAR(255),
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '08-SEP-2026',
        modified_by VARCHAR(100) DEFAULT 'ZAIN_DATEY',
        modified_date VARCHAR(100) DEFAULT '06-NOV-2026'
      )
    `);

    // 5. Additional CRM Masters
    await query(`
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
      CREATE TABLE IF NOT EXISTS master_position_types (
        id INT PRIMARY KEY,
        pos_type VARCHAR(255) NOT NULL,
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'MARIYA_BADAR',
        modified_date VARCHAR(100) DEFAULT '12-NOV-2026',
        contact_count INT DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS master_salespersons (
        id INT PRIMARY KEY,
        salesperson VARCHAR(255) NOT NULL,
        jobposition VARCHAR(255),
        mobile VARCHAR(100),
        address TEXT,
        is_active VARCHAR(10) DEFAULT 'Y',
        left_date VARCHAR(100),
        replaced_by_id VARCHAR(100),
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '20-JUL-2026',
        modified_by VARCHAR(100) DEFAULT 'ADMIN',
        modified_date VARCHAR(100) DEFAULT '11-NOV-2026',
        contact_count INT DEFAULT 0,
        company_count INT DEFAULT 0,
        emails TEXT
      );
      CREATE TABLE IF NOT EXISTS master_salesperson_emails (
        email_id INT PRIMARY KEY,
        sales_person_id INT,
        email_address VARCHAR(255) NOT NULL,
        smtp_password VARCHAR(255),
        email_daily_limit INT DEFAULT 10,
        is_active VARCHAR(10) DEFAULT 'Y',
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100)
      );
    `);

    // Ensure all sequences exist and are aligned to MAX(id)
    try {
      await query(`CREATE SEQUENCE IF NOT EXISTS master_company_sizes_id_seq`);
      await query(`SELECT setval('master_company_sizes_id_seq', COALESCE((SELECT MAX(id) FROM master_company_sizes), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_company_types_id_seq`);
      await query(`SELECT setval('master_company_types_id_seq', COALESCE((SELECT MAX(id) FROM master_company_types), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_countries_id_seq`);
      await query(`SELECT setval('master_countries_id_seq', COALESCE((SELECT MAX(id) FROM master_countries), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS country_city_mapping_id_seq`);
      await query(`SELECT setval('country_city_mapping_id_seq', COALESCE((SELECT MAX(id) FROM country_city_mapping), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_linkedin_accounts_id_seq`);
      await query(`SELECT setval('master_linkedin_accounts_id_seq', COALESCE((SELECT MAX(id) FROM master_linkedin_accounts), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_position_types_id_seq`);
      await query(`SELECT setval('master_position_types_id_seq', COALESCE((SELECT MAX(id) FROM master_position_types), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_salespersons_id_seq`);
      await query(`SELECT setval('master_salespersons_id_seq', COALESCE((SELECT MAX(id) FROM master_salespersons), 1))`);
      await query(`CREATE SEQUENCE IF NOT EXISTS master_salesperson_emails_id_seq`);
      await query(`SELECT setval('master_salesperson_emails_id_seq', COALESCE((SELECT MAX(email_id) FROM master_salesperson_emails), 1))`);
      console.log('[Sequences Sync] All PostgreSQL ID sequences aligned with MAX(id) successfully.');
    } catch (seqErr) {
      console.warn('[Sequences Sync Warning]:', seqErr.message);
    }

    console.log('[Masters Setup] All master tables verified in PostgreSQL.');
  } catch (err) {
    console.error('[Masters Setup Error]:', err.message);
  }
}

module.exports = { setupMastersTable };

if (require.main === module) {
  setupMastersTable().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
