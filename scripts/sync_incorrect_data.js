const { executeMcpSql } = require('../server/services/mcpSync');
const { pool } = require('../server/db/pool');

async function syncIncorrectData() {
  console.log('=== SYNCING INCORRECT DATA TABLES FROM APEX TO POSTGRESQL ===\n');

  // 1. Sync CRM.COMPANY_INCORRECT_DATA
  console.log('[1/2] Fetching total count for CRM.COMPANY_INCORRECT_DATA...');
  const compCountRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.COMPANY_INCORRECT_DATA');
  const compTotal = parseInt(compCountRes[0]?.TOTAL || 0, 10);
  console.log(`Total CRM.COMPANY_INCORRECT_DATA: ${compTotal}`);

  await pool.query('TRUNCATE TABLE company_incorrect_data CASCADE');

  const compChunkSize = 3000;
  let compOffset = 0;
  let compInserted = 0;

  while (compOffset < compTotal) {
    console.log(`Fetching company incorrect chunk: offset ${compOffset}, limit ${compChunkSize}...`);
    const sql = `
      SELECT 
        ERROR_ID, BATCH_ID, EXCEL_ROW_NO, SOURCE_ID, ERROR_MESSAGE,
        TO_CHAR(ERROR_DATE, 'DD-MON-YYYY') as ERROR_DATE,
        COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE,
        COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS,
        SUPPLIER_NUMBER, USERNAME, PASSWORD,
        TO_CHAR(REGISTRATION_DATE, 'DD-MON-YYYY') as REGISTRATION_DATE,
        INDUSTRY, CITY, WEBSITE, DA, COM_EMAIL, REMARK, EMPLOYEE_SIZE,
        SALESPERSON, SOURCE, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE
      FROM CRM.COMPANY_INCORRECT_DATA
      ORDER BY ERROR_ID ASC
      OFFSET ${compOffset} ROWS FETCH NEXT ${compChunkSize} ROWS ONLY
    `;
    const rows = await executeMcpSql(sql);
    if (!rows || rows.length === 0) break;

    // Batch insert 200 rows at a time
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIdx = 1;

      for (const r of slice) {
        placeholders.push(`(
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}
        )`);

        values.push(
          parseInt(r.ERROR_ID, 10),
          r.BATCH_ID ? parseInt(r.BATCH_ID, 10) : null,
          r.EXCEL_ROW_NO ? parseInt(r.EXCEL_ROW_NO, 10) : null,
          r.SOURCE_ID || null,
          r.ERROR_MESSAGE || null,
          r.ERROR_DATE || null,
          r.COMP_NAME || null,
          r.TECHNOLOGY || null,
          r.COUNTRY || null,
          r.EXISTINGCOMP || null,
          r.COMPANYPHONE || null,
          r.COMPANY_CATEGORIES || null,
          r.COMPANY_TYPE || null,
          r.REGISTERED_URL || null,
          r.REGISTRATION_STATUS || null,
          r.SUPPLIER_NUMBER || null,
          r.USERNAME || null,
          r.PASSWORD || null,
          r.REGISTRATION_DATE || null,
          r.INDUSTRY || null,
          r.CITY || null,
          r.WEBSITE || null,
          r.DA || null,
          r.COM_EMAIL || null,
          r.REMARK || null,
          r.EMPLOYEE_SIZE || null,
          r.SALESPERSON || null,
          r.SOURCE || null,
          r.CREATED_BY || null,
          r.CREATED_DATE || null
        );
      }

      await pool.query(`
        INSERT INTO company_incorrect_data (
          error_id, batch_id, excel_row_no, source_id, error_message, error_date,
          comp_name, technology, country, existingcomp, companyphone, company_categories,
          company_type, registered_url, registration_status, supplier_number, username,
          password, registration_date, industry, city, website, da, com_email, remark,
          employee_size, salesperson, source, created_by, created_date
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (error_id) DO NOTHING
      `, values);

      compInserted += slice.length;
    }

    compOffset += rows.length;
    console.log(`Inserted ${compInserted} / ${compTotal} company incorrect rows...`);
  }

  // 2. Sync CRM.CONTACT_INCORRECT_DATA
  console.log('\n[2/2] Fetching total count for CRM.CONTACT_INCORRECT_DATA...');
  const contCountRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.CONTACT_INCORRECT_DATA');
  const contTotal = parseInt(contCountRes[0]?.TOTAL || 0, 10);
  console.log(`Total CRM.CONTACT_INCORRECT_DATA: ${contTotal}`);

  await pool.query('TRUNCATE TABLE contact_incorrect_data CASCADE');

  const contChunkSize = 3000;
  let contOffset = 0;
  let contInserted = 0;

  while (contOffset < contTotal) {
    console.log(`Fetching contact incorrect chunk: offset ${contOffset}, limit ${contChunkSize}...`);
    const sql = `
      SELECT 
        ERROR_ID, BATCH_ID, EXCEL_ROW_NO, SOURCE_ID, COMP_ID, COMP_NAME, CONTACT_NAME,
        DESIGNATION, POS_TYPE, PRIORITY_CONTACT, COUNTRY, COMP_EMAIL, OTHER_EMAIL,
        COMP_EMAIL_VERIFIED, CONTACT_PHONE, CONTACT_MOBILE, LINKEDIN_URL,
        CONTACTSTATUS, SALESPERSON, SOURCE, REMARK, WEBSITE, ERROR_MESSAGE,
        TO_CHAR(ERROR_DATE, 'DD-MON-YYYY') as ERROR_DATE,
        CREATED_BY,
        TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE
      FROM CRM.CONTACT_INCORRECT_DATA
      ORDER BY ERROR_ID ASC
      OFFSET ${contOffset} ROWS FETCH NEXT ${contChunkSize} ROWS ONLY
    `;
    const rows = await executeMcpSql(sql);
    if (!rows || rows.length === 0) break;

    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIdx = 1;

      for (const r of slice) {
        placeholders.push(`(
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}
        )`);

        values.push(
          parseInt(r.ERROR_ID, 10),
          r.BATCH_ID ? parseInt(r.BATCH_ID, 10) : null,
          r.EXCEL_ROW_NO ? parseInt(r.EXCEL_ROW_NO, 10) : null,
          r.SOURCE_ID || null,
          r.COMP_ID || null,
          r.COMP_NAME || null,
          r.CONTACT_NAME || null,
          r.DESIGNATION || null,
          r.POS_TYPE || null,
          r.PRIORITY_CONTACT || null,
          r.COUNTRY || null,
          r.COMP_EMAIL || null,
          r.OTHER_EMAIL || null,
          r.COMP_EMAIL_VERIFIED || null,
          r.CONTACT_PHONE || null,
          r.CONTACT_MOBILE || null,
          r.LINKEDIN_URL || null,
          r.CONTACTSTATUS || null,
          r.SALESPERSON || null,
          r.SOURCE || null,
          r.REMARK || null,
          r.WEBSITE || null,
          r.ERROR_MESSAGE || null,
          r.ERROR_DATE || null,
          r.CREATED_BY || null,
          r.CREATED_DATE || null
        );
      }

      await pool.query(`
        INSERT INTO contact_incorrect_data (
          error_id, batch_id, excel_row_no, source_id, comp_id, comp_name, contact_name,
          designation, pos_type, priority_contact, country, comp_email, other_email,
          comp_email_verified, contact_phone, contact_mobile, linkedin_url,
          contactstatus, salesperson, source, remark, website, error_message,
          error_date, created_by, created_date
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (error_id) DO NOTHING
      `, values);

      contInserted += slice.length;
    }

    contOffset += rows.length;
    console.log(`Inserted ${contInserted} / ${contTotal} contact incorrect rows...`);
  }

  console.log('\n=== INCORRECT DATA SYNC COMPLETE ===');
  const finalComp = await pool.query('SELECT count(*) FROM company_incorrect_data');
  const finalCont = await pool.query('SELECT count(*) FROM contact_incorrect_data');
  console.log(`Final PostgreSQL company_incorrect_data count: ${finalComp.rows[0].count}`);
  console.log(`Final PostgreSQL contact_incorrect_data count: ${finalCont.rows[0].count}`);
  process.exit(0);
}

syncIncorrectData().catch(err => {
  console.error('Sync error:', err);
  process.exit(1);
});
