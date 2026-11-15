const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function initializeDatabase() {
  const host = process.env.PGHOST || '127.0.0.1';
  const port = parseInt(process.env.PGPORT, 10) || 5432;
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const targetDb = process.env.PGDATABASE || 'crm_db';

  console.log(`[DB Init] Connecting to PostgreSQL on ${host}:${port} as user "${user}"...`);

  // Step 1: Connect to maintenance database 'postgres' to check/create target database
  const rootClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    const checkDb = await rootClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (checkDb.rows.length === 0) {
      console.log(`[DB Init] Database "${targetDb}" does not exist yet. Creating it now...`);
      const safeDbName = targetDb.replace(/"/g, '""');
      await rootClient.query(`CREATE DATABASE "${safeDbName}"`);
      console.log(`[DB Init] Database "${targetDb}" created successfully!`);
    } else {
      console.log(`[DB Init] Database "${targetDb}" exists.`);
    }
  } catch (error) {
    console.warn(`[DB Init] Note: Could not create database via root connection (${error.message}). Connecting directly to "${targetDb}"...`);
  } finally {
    await rootClient.end().catch(() => {});
  }

  // Step 2: Connect to target database and execute schema.sql
  const targetClient = new Client({
    host,
    port,
    user,
    password,
    database: targetDb,
  });

  try {
    await targetClient.connect();
    console.log(`[DB Init] Connected to "${targetDb}". Applying schema definitions...`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await targetClient.query(sql);

    // Ensure all additional columns exist if table was previously created with fewer columns
    console.log(`[DB Init] Verifying column definitions for companies and contacts...`);
    const migrations = [
      // companies columns
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS technology TEXT`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(150)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(150)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS existing_comp VARCHAR(10) DEFAULT 'N'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS da VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_categories VARCHAR(200)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(100) DEFAULT 'Direct Client'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_size VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registered_url VARCHAR(500)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_status VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS supplier_number VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS username VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS password VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_date VARCHAR(50)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS source VARCHAR(200)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS remarks TEXT`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS salesperson VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS prev_salesperson VARCHAR(255)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS joget_id VARCHAR(100)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS lead_count INTEGER DEFAULT 0`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS normalized_website VARCHAR(4000)`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'system'`,
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100) DEFAULT 'system'`,
      // contacts columns
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_name VARCHAR(400)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS designation VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS position_type VARCHAR(150)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_type VARCHAR(100) DEFAULT 'Direct Client'`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_status VARCHAR(4000)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS salesperson VARCHAR(4000)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS industry VARCHAR(400)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(150)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website VARCHAR(500)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone2 VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone3 VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile VARCHAR(200)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(200)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile3 VARCHAR(250)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile_verified VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS other_email VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_verified VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_tool_verified VARCHAR(100)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_verified_response VARCHAR(100)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(200)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS comp_linkedin_id VARCHAR(200)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_linkedin_connected VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_conn_send_acc VARCHAR(4000)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS connection_date VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS connection_send_by VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_connected_acc VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS priority_contact VARCHAR(100)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS current_past VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(200)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_details VARCHAR(500)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS data_extracted_date VARCHAR(50)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS remarks TEXT`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'system'`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100) DEFAULT 'system'`,
    ];

    for (const stmt of migrations) {
      await targetClient.query(stmt).catch(() => {});
    }

    // Populate contact_name from first_name + last_name if contact_name is null
    await targetClient.query(`
      UPDATE contacts 
      SET contact_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
      WHERE contact_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL)
    `).catch(() => {});

    // Check if companies table is empty; if so, automatically load the 1,000+ records
    const compCountRes = await targetClient.query('SELECT COUNT(*)::int AS total FROM companies');
    if (compCountRes.rows[0].total === 0) {
      console.log('[DB Init] Companies table is empty. Auto-loading 1,000+ records into PostgreSQL...');
      const companiesFile = path.join(__dirname, '..', 'data', 'companies_1000.json');
      const contactsFile = path.join(__dirname, '..', 'data', 'contacts_1000.json');

      if (fs.existsSync(companiesFile)) {
        const companies = JSON.parse(fs.readFileSync(companiesFile, 'utf8'));
        console.log(`[DB Init] Inserting ${companies.length} companies...`);
        for (const c of companies) {
          await targetClient.query(`
            INSERT INTO companies (
              id, name, technology, industry, city, country, website, existing_comp, da,
              phone, email, company_categories, company_type, employee_size, registered_url,
              registration_status, supplier_number, username, password, registration_date,
              source, remarks, salesperson, prev_salesperson, joget_id, contact_count,
              lead_count, normalized_website, created_by, modified_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26,
              $27, $28, $29, $30
            ) ON CONFLICT (id) DO NOTHING
          `, [
            c.id, c.name, c.technology, c.industry, c.city, c.country, c.website, c.existing_comp || 'N', c.da,
            c.phone, c.email, c.company_categories, c.company_type || 'Direct Client', c.employee_size, c.registered_url,
            c.registration_status, c.supplier_number, c.username, c.password, c.registration_date,
            c.source, c.remarks, c.salesperson, c.prev_salesperson, c.joget_id, c.contact_count || 0,
            c.lead_count || 0, c.normalized_website, c.created_by || 'system', c.modified_by || 'system'
          ]).catch(() => {});
        }
        await targetClient.query(`SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies), true)`).catch(() => {});
        console.log('[DB Init] Companies successfully loaded into PostgreSQL.');
      }

      if (fs.existsSync(contactsFile)) {
        const contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
        const existingCompRes = await targetClient.query('SELECT id FROM companies');
        const compSet = new Set(existingCompRes.rows.map(r => r.id));

        console.log(`[DB Init] Inserting ${contacts.length} contacts...`);
        for (const ct of contacts) {
          const safeCompId = ct.company_id && compSet.has(ct.company_id) ? ct.company_id : null;
          await targetClient.query(`
            INSERT INTO contacts (
              id, company_id, company_name, contact_name, designation, position_type,
              company_type, contact_status, salesperson, industry, country, website,
              phone, phone2, phone3, mobile, mobile2, mobile3, mobile_verified,
              email, other_email, email_verified, email_tool_verified, email_verified_response,
              linkedin_url, linkedin_id, comp_linkedin_id, preferred_linkedin_connected,
              linkedin_conn_send_acc, linkedin_connected_acc, priority_contact, current_past,
              source, source_details, data_extracted_date, remarks, technology, created_by, modified_by
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, $12,
              $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24,
              $25, $26, $27, $28,
              $29, $30, $31, $32,
              $33, $34, $35, $36, $37, $38, $39
            ) ON CONFLICT (id) DO NOTHING
          `, [
            ct.id, safeCompId, ct.company_name, ct.contact_name, ct.designation, ct.position_type,
            ct.company_type || 'Direct Client', ct.contact_status, ct.salesperson, ct.industry, ct.country, ct.website,
            ct.phone, ct.phone2, ct.phone3, ct.mobile, ct.mobile2, ct.mobile3, ct.mobile_verified,
            ct.email, ct.other_email, ct.email_verified, ct.email_tool_verified, ct.email_verified_response,
            ct.linkedin_url, ct.linkedin_id, ct.comp_linkedin_id, ct.preferred_linkedin_connected,
            ct.linkedin_conn_send_acc, ct.linkedin_connected_acc, ct.priority_contact, ct.current_past,
            ct.source, ct.source_details, ct.data_extracted_date, ct.remarks, ct.technology, ct.created_by || 'system', ct.modified_by || 'system'
          ]).catch(() => {});
        }
        await targetClient.query(`SELECT setval('contacts_id_seq', (SELECT MAX(id) FROM contacts), true)`).catch(() => {});
        console.log('[DB Init] Contacts successfully loaded into PostgreSQL.');
      }
    }

    console.log(`[DB Init] Schema successfully initialized and up-to-date in "${targetDb}".`);
  } catch (error) {
    console.error(`[DB Init] Error: ${error.message}`);
    process.exit(1);
  } finally {
    await targetClient.end().catch(() => {});
  }
}

initializeDatabase();
