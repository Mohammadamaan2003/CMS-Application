const { executeMcpSql } = require('../server/services/mcpSync');
const { pool } = require('../server/db/pool');

function cleanStr(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function parseIntSafe(val) {
  if (!val) return null;
  const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
  return isNaN(n) ? null : n;
}

async function syncAllCompanies() {
  console.log('\n======================================================');
  console.log('--- STEP 1: SYNCING ALL COMPANIES FROM ORACLE APEX ---');
  console.log('======================================================\n');

  console.log('Fetching total count from CRM.COMPANY...');
  const countRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.COMPANY');
  const total = parseInt(countRes[0]?.TOTAL || 0, 10);
  console.log(`Total Companies in Oracle APEX: ${total}`);

  // Drop FK temporarily if any, or just truncate contacts first to avoid constraint conflicts
  await pool.query('TRUNCATE TABLE contacts CASCADE');
  await pool.query('TRUNCATE TABLE companies CASCADE');
  console.log('Cleaned local companies and contacts tables.');

  const chunkSize = 5000;
  let offset = 0;
  let totalInserted = 0;

  const tStart = Date.now();

  while (offset < total) {
    const fetchStart = Date.now();
    console.log(`\nFetching Companies chunk: offset ${offset}, limit ${chunkSize}...`);
    const sql = `
      SELECT 
        ID, COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE,
        COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS,
        SUPPLIER_NUMBER, USERNAME, PASSWORD, REGISTRATION_DATE, INDUSTRY,
        CITY, WEBSITE, DA, COM_EMAIL, REMARK, EMPLOYEE_SIZE, CREATED_BY,
        CREATED_DATE, MODIFIED_BY, MODIFIED_DATE, SALESPERSON, PREV_SALESPERSON,
        JOGET_ID, CONTACTS_COUNT, LEAD_COUNT, CONTACT_COUNT, SOURCE,
        NORMALIZED_WEBSITE
      FROM CRM.COMPANY
      ORDER BY ID ASC
      OFFSET ${offset} ROWS FETCH NEXT ${chunkSize} ROWS ONLY
    `;
    const rows = await executeMcpSql(sql);
    console.log(`Fetched ${rows.length} company rows from MCP in ${Date.now() - fetchStart}ms.`);
    if (!rows || rows.length === 0) break;

    const insertStart = Date.now();
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const placeholders = [];
      const values = [];
      let pIdx = 1;

      for (const r of slice) {
        placeholders.push(`(
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}
        )`);

        const id = parseInt(r.ID, 10);
        const compName = cleanStr(r.COMP_NAME) || 'Unnamed Company';
        const tech = cleanStr(r.TECHNOLOGY);
        const country = cleanStr(r.COUNTRY);
        const existingcomp = cleanStr(r.EXISTINGCOMP) || 'N';
        const compPhone = cleanStr(r.COMPANYPHONE);
        const compCategories = cleanStr(r.COMPANY_CATEGORIES);
        const compType = cleanStr(r.COMPANY_TYPE) || 'Direct Client';
        const regUrl = cleanStr(r.REGISTERED_URL);
        const regStatus = cleanStr(r.REGISTRATION_STATUS);
        const suppNum = cleanStr(r.SUPPLIER_NUMBER);
        const username = cleanStr(r.USERNAME);
        const password = cleanStr(r.PASSWORD);
        const regDate = cleanStr(r.REGISTRATION_DATE);
        const industry = cleanStr(r.INDUSTRY);
        const city = cleanStr(r.CITY);
        const website = cleanStr(r.WEBSITE);
        const da = cleanStr(r.DA);
        const comEmail = cleanStr(r.COM_EMAIL);
        const remark = cleanStr(r.REMARK);
        const empSize = cleanStr(r.EMPLOYEE_SIZE);
        const createdBy = cleanStr(r.CREATED_BY) || 'system';
        const createdDate = cleanStr(r.CREATED_DATE);
        const modBy = cleanStr(r.MODIFIED_BY) || 'system';
        const modDate = cleanStr(r.MODIFIED_DATE);
        const sp = cleanStr(r.SALESPERSON);
        const prevSp = cleanStr(r.PREV_SALESPERSON);
        const jogetId = cleanStr(r.JOGET_ID);
        const contactsCount = parseIntSafe(r.CONTACTS_COUNT) || 0;
        const leadCount = parseIntSafe(r.LEAD_COUNT) || 0;
        const contactCount = parseIntSafe(r.CONTACT_COUNT) || contactsCount;
        const source = cleanStr(r.SOURCE);
        const normWebsite = cleanStr(r.NORMALIZED_WEBSITE);

        values.push(
          id, compName, tech, country, existingcomp, compPhone, compCategories,
          compType, regUrl, regStatus, suppNum, username, password, regDate,
          industry, city, website, da, comEmail, remark, empSize, createdBy,
          createdDate, modBy, modDate, sp, prevSp, jogetId, contactsCount,
          leadCount, contactCount, source, normWebsite,
          compName, compPhone, comEmail, existingcomp, remark
        );
      }

      await pool.query(`
        INSERT INTO companies (
          id, comp_name, technology, country, existingcomp, companyphone,
          company_categories, company_type, registered_url, registration_status,
          supplier_number, username, password, registration_date, industry,
          city, website, da, com_email, remark, employee_size, created_by,
          created_date, modified_by, modified_date, salesperson, prev_salesperson,
          joget_id, contacts_count, lead_count, contact_count, source,
          normalized_website,
          name, phone, email, existing_comp, remarks
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          comp_name = EXCLUDED.comp_name,
          name = EXCLUDED.name,
          technology = EXCLUDED.technology,
          country = EXCLUDED.country,
          industry = EXCLUDED.industry,
          city = EXCLUDED.city,
          website = EXCLUDED.website,
          company_type = EXCLUDED.company_type,
          company_categories = EXCLUDED.company_categories,
          salesperson = EXCLUDED.salesperson,
          contact_count = EXCLUDED.contact_count,
          contacts_count = EXCLUDED.contacts_count,
          lead_count = EXCLUDED.lead_count,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date
      `, values);

      totalInserted += slice.length;
    }

    console.log(`Inserted chunk into PG in ${Date.now() - insertStart}ms. Progress: ${totalInserted} / ${total} companies.`);
    offset += rows.length;
  }

  // Update sequence to max id
  await pool.query(`SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1))`);
  const finalCount = await pool.query('SELECT count(*) FROM companies');
  console.log(`\n>>> SUCCESS: Synced ${finalCount.rows[0].count} companies into PostgreSQL in ${((Date.now() - tStart)/1000).toFixed(1)}s.`);
}

async function syncAllContacts() {
  console.log('\n======================================================');
  console.log('--- STEP 2: SYNCING ALL CONTACTS FROM ORACLE APEX ---');
  console.log('======================================================\n');

  console.log('Fetching total count from CRM.CONTACT...');
  const countRes = await executeMcpSql('SELECT COUNT(*) as TOTAL FROM CRM.CONTACT');
  const total = parseInt(countRes[0]?.TOTAL || 0, 10);
  console.log(`Total Contacts in Oracle APEX: ${total}`);

  // Fetch valid company IDs for foreign key safety
  console.log('Loading valid company IDs into memory for FK validation...');
  const compIdRes = await pool.query('SELECT id FROM companies');
  const validCompIds = new Set(compIdRes.rows.map(r => Number(r.id)));
  console.log(`Loaded ${validCompIds.size} company IDs.`);

  await pool.query('TRUNCATE TABLE contacts CASCADE');
  console.log('Cleaned local contacts table.');

  const chunkSize = 5000;
  let offset = 0;
  let totalInserted = 0;
  const tStart = Date.now();

  while (offset < total) {
    const fetchStart = Date.now();
    console.log(`\nFetching Contacts chunk: offset ${offset}, limit ${chunkSize}...`);
    const sql = `
      SELECT 
        ID, DESIGNATION, POS_TYPE, PRIORITY_CONTACT, COUNTRY, COMP_EMAIL,
        OTHER_EMAIL, COMP_EMAIL_VERIFIED, CONTACT_PHONE, CONTACT_PHONE2,
        CONTACT_PHONE3, CONTACT_MOBILE, CONTACT_MOBILE2, CONTACT_MOBILE3,
        MOBILE_VERIFIED, LINKEDIN_URL, LINKEDLNID, COMP_LINKEDLNID,
        PREFERRED_LINKEDIN_CONNECTED, LINKEDIN_CONN_SEND_ACC, CONNECTION_DATE,
        CONTACTSTATUS, SALESPERSON, SOURCE, DATA_EXTRACTED, REMARK,
        LINKEDIN_CNNCTD_ACC, CURRENT_PAST, EMAIL_TOOL_VERIFIED,
        EMAIL_VERIFIED_BY_RESPONSE, SOURCE_DETAILS, CONNECTION_SEND_BY,
        WEBSITE, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE,
        INDUSTRY, CONTACT_NAME, COMP_NAME, COMP_ID, TECHNOLOGY
      FROM CRM.CONTACT
      ORDER BY ID ASC
      OFFSET ${offset} ROWS FETCH NEXT ${chunkSize} ROWS ONLY
    `;
    const rows = await executeMcpSql(sql);
    console.log(`Fetched ${rows.length} contact rows from MCP in ${Date.now() - fetchStart}ms.`);
    if (!rows || rows.length === 0) break;

    const insertStart = Date.now();
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const placeholders = [];
      const values = [];
      let pIdx = 1;

      for (const r of slice) {
        placeholders.push(`(
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
          $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}
        )`);

        const id = parseInt(r.ID, 10);
        const contactName = cleanStr(r.CONTACT_NAME) || 'Unknown Contact';
        const rawCompId = parseIntSafe(r.COMP_ID);
        const safeCompanyId = rawCompId && validCompIds.has(rawCompId) ? rawCompId : null;
        const compName = cleanStr(r.COMP_NAME);
        const designation = cleanStr(r.DESIGNATION);
        const posType = cleanStr(r.POS_TYPE);
        const priorityContact = cleanStr(r.PRIORITY_CONTACT);
        const country = cleanStr(r.COUNTRY);
        const compEmail = cleanStr(r.COMP_EMAIL);
        const otherEmail = cleanStr(r.OTHER_EMAIL);
        const compEmailVerified = cleanStr(r.COMP_EMAIL_VERIFIED);
        const contactPhone = cleanStr(r.CONTACT_PHONE);
        const contactPhone2 = cleanStr(r.CONTACT_PHONE2);
        const contactPhone3 = cleanStr(r.CONTACT_PHONE3);
        const contactMobile = cleanStr(r.CONTACT_MOBILE);
        const contactMobile2 = cleanStr(r.CONTACT_MOBILE2);
        const contactMobile3 = cleanStr(r.CONTACT_MOBILE3);
        const mobileVerified = cleanStr(r.MOBILE_VERIFIED);
        const linkedinUrl = cleanStr(r.LINKEDIN_URL);
        const linkedlnid = cleanStr(r.LINKEDLNID);
        const compLinkedlnid = cleanStr(r.COMP_LINKEDLNID);
        const prefLinkedin = cleanStr(r.PREFERRED_LINKEDIN_CONNECTED);
        const linkedinConnSend = cleanStr(r.LINKEDIN_CONN_SEND_ACC);
        const connDate = cleanStr(r.CONNECTION_DATE);
        const contactStatus = cleanStr(r.CONTACTSTATUS);
        const sp = cleanStr(r.SALESPERSON);
        const source = cleanStr(r.SOURCE);
        const dataExtracted = cleanStr(r.DATA_EXTRACTED);
        const remark = cleanStr(r.REMARK);
        const linkedinCnnctd = cleanStr(r.LINKEDIN_CNNCTD_ACC);
        const currentPast = cleanStr(r.CURRENT_PAST);
        const emailToolVer = cleanStr(r.EMAIL_TOOL_VERIFIED);
        const emailVerResp = cleanStr(r.EMAIL_VERIFIED_BY_RESPONSE);
        const srcDetails = cleanStr(r.SOURCE_DETAILS);
        const connSendBy = cleanStr(r.CONNECTION_SEND_BY);
        const website = cleanStr(r.WEBSITE);
        const createdBy = cleanStr(r.CREATED_BY) || 'system';
        const createdDate = cleanStr(r.CREATED_DATE);
        const modBy = cleanStr(r.MODIFIED_BY) || 'system';
        const modDate = cleanStr(r.MODIFIED_DATE);
        const industry = cleanStr(r.INDUSTRY);
        const technology = cleanStr(r.TECHNOLOGY);

        values.push(
          id, designation, posType, posType, priorityContact, country,
          compEmail, compEmail, otherEmail, compEmailVerified, compEmailVerified,
          contactPhone, contactPhone, contactPhone2, contactPhone2, contactPhone3, contactPhone3,
          contactMobile, contactMobile, contactMobile2, contactMobile2, contactMobile3, contactMobile3,
          mobileVerified, linkedinUrl, linkedlnid, linkedlnid, compLinkedlnid, compLinkedlnid,
          prefLinkedin, linkedinConnSend, connDate,
          contactStatus, contactStatus, sp, source, dataExtracted, dataExtracted,
          remark, remark, linkedinCnnctd, linkedinCnnctd, currentPast,
          emailToolVer, emailVerResp, emailVerResp,
          srcDetails, connSendBy, website, createdBy, createdDate,
          modBy, modDate, industry, contactName, compName, compName,
          rawCompId, safeCompanyId, technology
        );
      }

      await pool.query(`
        INSERT INTO contacts (
          id, designation, pos_type, position_type, priority_contact, country,
          comp_email, email, other_email, comp_email_verified, email_verified,
          contact_phone, phone, contact_phone2, phone2, contact_phone3, phone3,
          contact_mobile, mobile, contact_mobile2, mobile2, contact_mobile3, mobile3,
          mobile_verified, linkedin_url, linkedlnid, linkedin_id, comp_linkedlnid, comp_linkedin_id,
          preferred_linkedin_connected, linkedin_conn_send_acc, connection_date,
          contactstatus, contact_status, salesperson, source, data_extracted, data_extracted_date,
          remark, remarks, linkedin_cnnctd_acc, linkedin_connected_acc, current_past,
          email_tool_verified, email_verified_by_response, email_verified_response,
          source_details, connection_send_by, website, created_by, created_date,
          modified_by, modified_date, industry, contact_name, comp_name, company_name,
          comp_id, company_id, technology
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          contact_name = EXCLUDED.contact_name,
          comp_name = EXCLUDED.comp_name,
          company_name = EXCLUDED.company_name,
          comp_id = EXCLUDED.comp_id,
          company_id = EXCLUDED.company_id,
          comp_email = EXCLUDED.comp_email,
          email = EXCLUDED.email,
          contact_phone = EXCLUDED.contact_phone,
          phone = EXCLUDED.phone,
          contact_mobile = EXCLUDED.contact_mobile,
          mobile = EXCLUDED.mobile,
          designation = EXCLUDED.designation,
          country = EXCLUDED.country,
          salesperson = EXCLUDED.salesperson,
          contactstatus = EXCLUDED.contactstatus,
          contact_status = EXCLUDED.contact_status,
          modified_by = EXCLUDED.modified_by,
          modified_date = EXCLUDED.modified_date
      `, values);

      totalInserted += slice.length;
    }

    console.log(`Inserted chunk into PG in ${Date.now() - insertStart}ms. Progress: ${totalInserted} / ${total} contacts.`);
    offset += rows.length;
  }

  // Update sequence to max id
  await pool.query(`SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1))`);
  const finalCount = await pool.query('SELECT count(*) FROM contacts');
  console.log(`\n>>> SUCCESS: Synced ${finalCount.rows[0].count} contacts into PostgreSQL in ${((Date.now() - tStart)/1000).toFixed(1)}s.`);
}

async function main() {
  try {
    await syncAllCompanies();
    await syncAllContacts();
    console.log('\n======================================================');
    console.log('--- ALL COMPANIES AND CONTACTS FULLY SYNCHRONIZED ---');
    console.log('======================================================');
  } catch (err) {
    console.error('Fatal error during sync:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
