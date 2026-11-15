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

async function syncSalesperson() {
  console.log('=== SYNCING SALES PERSON MASTER FROM ORACLE MCP TO POSTGRESQL ===');
  try {
    // 1. Create tables
    await pool.query(`
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
      CREATE SEQUENCE IF NOT EXISTS master_salespersons_id_seq;
      CREATE INDEX IF NOT EXISTS idx_master_salespersons_name ON master_salespersons(LOWER(TRIM(salesperson)));

      CREATE TABLE IF NOT EXISTS master_salesperson_emails (
        email_id INT PRIMARY KEY,
        sales_person_id INT,
        email_address VARCHAR(255),
        smtp_password VARCHAR(255),
        email_daily_limit INT DEFAULT 10,
        is_active VARCHAR(10) DEFAULT 'Y',
        created_by VARCHAR(100) DEFAULT 'APEX_PUBLIC_USER',
        created_date VARCHAR(100) DEFAULT '09-NOV-2026'
      );
    `);

    // 2. Fetch all salespersons from Oracle
    const spRows = await executeMcpSql(`
      SELECT 
        ID, 
        SALESPERSON, 
        JOBPOSITION, 
        MOBILE, 
        ADDRESS, 
        IS_ACTIVE, 
        TO_CHAR(LEFT_DATE, 'DD-MON-YYYY') as LEFT_DATE,
        REPLACED_BY_ID,
        CREATED_BY, 
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, 
        MODIFIED_BY, 
        TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE,
        CONTACT_COUNT,
        COMPANY_COUNT
      FROM CRM.SALES_PERSON
      ORDER BY ID
    `);

    // 3. Fetch all salesperson emails from Oracle
    const emailRows = await executeMcpSql(`
      SELECT 
        EMAIL_ID,
        SALES_PERSON_ID,
        EMAIL_ADDRESS,
        SMTP_PASSWORD,
        EMAIL_DAILY_LIMIT,
        IS_ACTIVE,
        CREATED_BY,
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE
      FROM CRM.SALES_PERSON_EMAILS
      ORDER BY SALES_PERSON_ID, EMAIL_ID
    `);

    // Group emails by sales_person_id
    const emailsBySp = {};
    for (const em of emailRows) {
      const spId = parseInt(em.SALES_PERSON_ID || em.sales_person_id, 10);
      const emailAddr = (em.EMAIL_ADDRESS || em.email_address || '').trim();
      if (!emailsBySp[spId]) emailsBySp[spId] = [];
      if (emailAddr) emailsBySp[spId].push(emailAddr);

      // Insert email record
      await pool.query(`
        INSERT INTO master_salesperson_emails (email_id, sales_person_id, email_address, smtp_password, email_daily_limit, is_active, created_by, created_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email_id) DO UPDATE SET
          sales_person_id = EXCLUDED.sales_person_id,
          email_address = EXCLUDED.email_address,
          smtp_password = EXCLUDED.smtp_password,
          email_daily_limit = EXCLUDED.email_daily_limit,
          is_active = EXCLUDED.is_active
      `, [
        parseInt(em.EMAIL_ID || em.email_id, 10),
        spId,
        emailAddr,
        em.SMTP_PASSWORD || em.smtp_password || '',
        parseInt(em.EMAIL_DAILY_LIMIT || em.email_daily_limit || '10', 10),
        em.IS_ACTIVE || em.is_active || 'Y',
        em.CREATED_BY || em.created_by || 'APEX_PUBLIC_USER',
        formatOracleDate(em.CREATED_DATE || em.created_date) || '09-NOV-2026'
      ]);
    }

    // 4. Insert salespersons with formatted emails
    for (const r of spRows) {
      const id = parseInt(r.ID || r.id, 10);
      const spName = (r.SALESPERSON || r.salesperson || '').trim();
      if (!spName) continue;

      const jobPos = r.JOBPOSITION || r.jobposition || '';
      const mobile = r.MOBILE || r.mobile || '';
      const address = r.ADDRESS || r.address || '';
      const isActive = r.IS_ACTIVE || r.is_active || 'Y';
      const leftDate = formatOracleDate(r.LEFT_DATE || r.left_date) || '';
      const replacedById = r.REPLACED_BY_ID || r.replaced_by_id || '';
      const createdBy = r.CREATED_BY || r.created_by || 'APEX_PUBLIC_USER';
      const createdDate = formatOracleDate(r.CREATED_DATE || r.created_date) || '20-JUL-2026';
      const modifiedBy = r.MODIFIED_BY || r.modified_by || 'ADMIN';
      const modifiedDate = formatOracleDate(r.MODIFIED_DATE || r.modified_date) || '11-NOV-2026';
      const contactCount = parseInt(r.CONTACT_COUNT || r.contact_count || '0', 10);
      const companyCount = parseInt(r.COMPANY_COUNT || r.company_count || '0', 10);

      const emailList = emailsBySp[id] || [];
      const formattedEmails = emailList.map((e, idx) => `${idx + 1}. ${e}`).join('\n');

      await pool.query(`
        INSERT INTO master_salespersons (
          id, salesperson, jobposition, mobile, address, is_active, 
          left_date, replaced_by_id, created_by, created_date, modified_by, modified_date, 
          contact_count, company_count, emails
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          salesperson = EXCLUDED.salesperson,
          jobposition = EXCLUDED.jobposition,
          mobile = EXCLUDED.mobile,
          address = EXCLUDED.address,
          is_active = EXCLUDED.is_active,
          left_date = EXCLUDED.left_date,
          replaced_by_id = EXCLUDED.replaced_by_id,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date,
          contact_count = EXCLUDED.contact_count,
          company_count = EXCLUDED.company_count,
          emails = EXCLUDED.emails
      `, [
        id, spName, jobPos, mobile, address, isActive,
        leftDate, replacedById, createdBy, createdDate, modifiedBy, modifiedDate,
        contactCount, companyCount, formattedEmails
      ]);
    }

    // 5. Align sequence
    await pool.query(`
      SELECT setval('master_salespersons_id_seq', COALESCE((SELECT MAX(id) FROM master_salespersons), 1));
      ALTER TABLE master_salespersons ALTER COLUMN id SET DEFAULT nextval('master_salespersons_id_seq');
    `);

    // 6. Update dynamic contact counts from contacts table
    await pool.query(`
      UPDATE master_salespersons m
      SET contact_count = (
        SELECT COUNT(*)::int
        FROM contacts c
        WHERE LOWER(TRIM(COALESCE(c.salesperson, ''))) = LOWER(TRIM(m.salesperson))
           OR LOWER(TRIM(COALESCE(c.salesperson, ''))) LIKE '%' || LOWER(TRIM(m.salesperson)) || '%'
      );
    `);

    const result = await pool.query('SELECT id, salesperson, jobposition, mobile, emails, contact_count FROM master_salespersons ORDER BY id');
    console.log(`Synced ${result.rows.length} salespersons into master_salespersons:`);
    console.table(result.rows);

  } catch (err) {
    console.error('Error syncing salespersons:', err);
  } finally {
    await pool.end();
  }
}

syncSalesperson();

