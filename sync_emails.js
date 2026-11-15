const { executeMcpSql } = require('./server/services/mcpSync');
const pool = require('./server/db/pool');

async function syncEmails() {
  try {
    const rows = await executeMcpSql('SELECT * FROM CRM.SALES_PERSON_EMAILS');
    console.log(`Fetched ${rows.length} rows from CRM.SALES_PERSON_EMAILS in Oracle MCP`);

    await pool.query(`CREATE SEQUENCE IF NOT EXISTS master_salesperson_emails_id_seq;`);

    for (const r of rows) {
      await pool.query(
        `INSERT INTO master_salesperson_emails (
          email_id, sales_person_id, email_address, smtp_password,
          email_daily_limit, is_active, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email_id) DO UPDATE SET
          sales_person_id = EXCLUDED.sales_person_id,
          email_address = EXCLUDED.email_address,
          smtp_password = EXCLUDED.smtp_password,
          email_daily_limit = EXCLUDED.email_daily_limit,
          is_active = EXCLUDED.is_active,
          created_by = EXCLUDED.created_by,
          created_date = EXCLUDED.created_date`,
        [
          parseInt(r.email_id, 10),
          parseInt(r.sales_person_id, 10),
          r.email_address || '',
          r.smtp_password || '',
          parseInt(r.email_daily_limit, 10) || 10,
          r.is_active || 'Y',
          r.created_by || '',
          r.created_date || '',
        ]
      );
    }

    await pool.query(`SELECT setval('master_salesperson_emails_id_seq', COALESCE((SELECT MAX(email_id) FROM master_salesperson_emails), 1));`);

    const cnt = (await pool.query('SELECT count(*) FROM master_salesperson_emails')).rows[0].count;
    console.log(`Successfully synced master_salesperson_emails in PostgreSQL! Total records: ${cnt}`);
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncEmails();

