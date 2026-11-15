const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { pool } = require('../db/pool');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN_URL = process.env.MCP_TOKEN_URL || 'https://cms-auth.iqraitacademy.com/realms/cms-mcp/protocol/openid-connect/token';
const MCP_URL = process.env.MCP_URL || 'https://cms-mcp.iqraitacademy.com/mcp';
const CLIENT_ID = process.env.MCP_CLIENT_ID || 'builder-mcp';
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET || 'H9lON4kKQ4oOkakrthnyZTfVFp3C8B42iVKTIhSSJsu0kfpBHKM07UTwJ9woehvIc4pQrfmJvbCvBHk0gAQW9n';
const USERNAME = process.env.MCP_USERNAME || 'cms-builder';
const PASSWORD = process.env.MCP_PASSWORD || 'Iqra#321';
const READ_DB = process.env.MCP_DATABASE || 'mcp_cms_read';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 30000) {
    return cachedToken;
  }

  const tokenParams = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: USERNAME,
    password: PASSWORD,
    scope: 'openid urn:oracle:dbtools:ords:mcpserver:all',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: tokenParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Keycloak authentication error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + ((data.expires_in || 300) * 1000);
  return cachedToken;
}

// Single-pass RFC 4180 CSV Parser preserving inner commas & quotes
function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) return [];

  const cleaned = csvText
    .replace(/\n+\d+\s+rows?\s+selected\.\s*$/i, '')
    .replace(/\n+no rows selected\s*$/i, '')
    .trim();

  if (!cleaned) return [];

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];

    if (char === '"') {
      if (!inQuotes) {
        inQuotes = true;
      } else if (cleaned[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && cleaned[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some(val => val !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
    i++;
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(val => val !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const val = row[c] !== undefined ? row[c] : '';
      obj[key] = val;
      obj[key.toLowerCase()] = val;
    }
    data.push(obj);
  }

  return data;
}

async function executeMcpSql(sql) {
  const token = await getAccessToken();

  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'sql_run',
      arguments: {
        database: READ_DB,
        sql: sql,
      },
    },
  };

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MCP tool call error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (data.result?.isError) {
    const errorMsg = data.result?.content?.[0]?.text || 'MCP Query execution error';
    throw new Error(errorMsg);
  }

  const rawText = data.result?.content?.[0]?.text || '';
  return parseCsv(rawText);
}

async function migrateSchema() {
  console.log('[Schema] Dropping old tables and recreating with all 33 Company and 42 Contact columns...');
  await pool.query('DROP TABLE IF EXISTS contacts CASCADE;');
  await pool.query('DROP TABLE IF EXISTS companies CASCADE;');
  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8');
  await pool.query(schemaSql);
  console.log('[Schema] Schema applied successfully.');
}

async function runFullSync() {
  await migrateSchema();

  console.log('[Sync] Fetching 1000 Companies from Oracle APEX CMS (CRM.COMPANY)...');
  const companySql = `SELECT * FROM CRM.COMPANY ORDER BY ID ASC OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY`;
  const companyRows = await executeMcpSql(companySql);
  console.log(`[Sync] Received ${companyRows.length} company records from MCP.`);

  // Clean PostgreSQL companies table
  await pool.query('TRUNCATE TABLE contacts CASCADE');
  await pool.query('TRUNCATE TABLE companies CASCADE');

  console.log('[Sync] Inserting 1000 Companies into PostgreSQL...');
  let compInserted = 0;
  for (const r of companyRows) {
    const id = parseInt(r.ID, 10);
    const compName = r.COMP_NAME || 'Unnamed Company';
    const technology = r.TECHNOLOGY || null;
    const country = r.COUNTRY || null;
    const existingcomp = r.EXISTINGCOMP || 'N';
    const companyphone = r.COMPANYPHONE || null;
    const companyCategories = r.COMPANY_CATEGORIES || null;
    const companyType = r.COMPANY_TYPE || 'Direct Client';
    const registeredUrl = r.REGISTERED_URL || null;
    const registrationStatus = r.REGISTRATION_STATUS || null;
    const supplierNumber = r.SUPPLIER_NUMBER || null;
    const username = r.USERNAME || null;
    const password = r.PASSWORD || null;
    const registrationDate = r.REGISTRATION_DATE || null;
    const industry = r.INDUSTRY || null;
    const city = r.CITY || null;
    const website = r.WEBSITE || null;
    const da = r.DA || null;
    const comEmail = r.COM_EMAIL || null;
    const remark = r.REMARK || null;
    const employeeSize = r.EMPLOYEE_SIZE || null;
    const createdBy = r.CREATED_BY || 'system';
    const createdDate = r.CREATED_DATE || null;
    const modifiedBy = r.MODIFIED_BY || 'system';
    const modifiedDate = r.MODIFIED_DATE || null;
    const salesperson = r.SALESPERSON || null;
    const prevSalesperson = r.PREV_SALESPERSON || null;
    const jogetId = r.JOGET_ID || null;
    const contactsCount = r.CONTACTS_COUNT ? parseInt(r.CONTACTS_COUNT, 10) : 0;
    const leadCount = r.LEAD_COUNT ? parseInt(r.LEAD_COUNT, 10) : 0;
    const contactCount = r.CONTACT_COUNT ? parseInt(r.CONTACT_COUNT, 10) : contactsCount;
    const source = r.SOURCE || null;
    const normalizedWebsite = r.NORMALIZED_WEBSITE || null;

    const query = `
      INSERT INTO companies (
        id, comp_name, name, technology, country, existingcomp, existing_comp,
        companyphone, phone, company_categories, company_type, registered_url,
        registration_status, supplier_number, username, password, registration_date,
        industry, city, website, da, com_email, email, remark, remarks,
        employee_size, created_by, created_date, modified_by, modified_date,
        salesperson, prev_salesperson, joget_id, contacts_count, lead_count,
        contact_count, source, normalized_website
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35,
        $36, $37, $38
      )
    `;

    await pool.query(query, [
      id, compName, compName, technology, country, existingcomp, existingcomp,
      companyphone, companyphone, companyCategories, companyType, registeredUrl,
      registrationStatus, supplierNumber, username, password, registrationDate,
      industry, city, website, da, comEmail, comEmail, remark, remark,
      employeeSize, createdBy, createdDate, modifiedBy, modifiedDate,
      salesperson, prevSalesperson, jogetId, contactsCount, leadCount,
      contactCount, source, normalizedWebsite
    ]);
    compInserted++;
  }
  console.log(`[Sync] Successfully inserted ${compInserted} companies.`);

  console.log('[Sync] Fetching 1000 Contacts from Oracle APEX CMS (CRM.CONTACT)...');
  const contactSql = `SELECT * FROM CRM.CONTACT ORDER BY ID ASC OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY`;
  const contactRows = await executeMcpSql(contactSql);
  console.log(`[Sync] Received ${contactRows.length} contact records from MCP.`);

  // Load existing valid company IDs for foreign key
  const compIdsRes = await pool.query('SELECT id FROM companies');
  const validCompIds = new Set(compIdsRes.rows.map(r => String(r.id)));

  console.log('[Sync] Inserting 1000 Contacts into PostgreSQL...');
  let contInserted = 0;
  for (const r of contactRows) {
    const id = parseInt(r.ID, 10);
    const rawCompId = r.COMP_ID ? String(r.COMP_ID).trim() : null;
    const safeCompId = rawCompId && validCompIds.has(rawCompId) ? parseInt(rawCompId, 10) : null;
    const compId = r.COMP_ID ? parseInt(r.COMP_ID, 10) : null;
    const designation = r.DESIGNATION || null;
    const posType = r.POS_TYPE || null;
    const priorityContact = r.PRIORITY_CONTACT || null;
    const country = r.COUNTRY || null;
    const compEmail = r.COMP_EMAIL || null;
    const otherEmail = r.OTHER_EMAIL || null;
    const compEmailVerified = r.COMP_EMAIL_VERIFIED || null;
    const contactPhone = r.CONTACT_PHONE || null;
    const contactPhone2 = r.CONTACT_PHONE2 || null;
    const contactPhone3 = r.CONTACT_PHONE3 || null;
    const contactMobile = r.CONTACT_MOBILE || null;
    const contactMobile2 = r.CONTACT_MOBILE2 || null;
    const contactMobile3 = r.CONTACT_MOBILE3 || null;
    const mobileVerified = r.MOBILE_VERIFIED || null;
    const linkedinUrl = r.LINKEDIN_URL || null;
    const linkedlnid = r.LINKEDLNID || null;
    const compLinkedlnid = r.COMP_LINKEDLNID || null;
    const preferredLinkedinConnected = r.PREFERRED_LINKEDIN_CONNECTED || null;
    const linkedinConnSendAcc = r.LINKEDIN_CONN_SEND_ACC || null;
    const connectionDate = r.CONNECTION_DATE || null;
    const contactstatus = r.CONTACTSTATUS || null;
    const salesperson = r.SALESPERSON || null;
    const source = r.SOURCE || null;
    const dataExtracted = r.DATA_EXTRACTED || null;
    const remark = r.REMARK || null;
    const linkedinCnnctdAcc = r.LINKEDIN_CNNCTD_ACC || null;
    const currentPast = r.CURRENT_PAST || null;
    const emailToolVerified = r.EMAIL_TOOL_VERIFIED || null;
    const emailVerifiedByResponse = r.EMAIL_VERIFIED_BY_RESPONSE || null;
    const sourceDetails = r.SOURCE_DETAILS || null;
    const connectionSendBy = r.CONNECTION_SEND_BY || null;
    const website = r.WEBSITE || null;
    const createdBy = r.CREATED_BY || 'system';
    const createdDate = r.CREATED_DATE || null;
    const modifiedBy = r.MODIFIED_BY || 'system';
    const modifiedDate = r.MODIFIED_DATE || null;
    const industry = r.INDUSTRY || null;
    const contactName = r.CONTACT_NAME || 'Unknown Contact';
    const compName = r.COMP_NAME || null;
    const technology = r.TECHNOLOGY || null;

    const query = `
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
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29,
        $30, $31, $32,
        $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43,
        $44, $45, $46,
        $47, $48, $49, $50, $51,
        $52, $53, $54, $55, $56, $57,
        $58, $59, $60
      )
    `;

    await pool.query(query, [
      id, designation, posType, posType, priorityContact, country,
      compEmail, compEmail, otherEmail, compEmailVerified, compEmailVerified,
      contactPhone, contactPhone, contactPhone2, contactPhone2, contactPhone3, contactPhone3,
      contactMobile, contactMobile, contactMobile2, contactMobile2, contactMobile3, contactMobile3,
      mobileVerified, linkedinUrl, linkedlnid, linkedlnid, compLinkedlnid, compLinkedlnid,
      preferredLinkedinConnected, linkedinConnSendAcc, connectionDate,
      contactstatus, contactstatus, salesperson, source, dataExtracted, dataExtracted,
      remark, remark, linkedinCnnctdAcc, linkedinCnnctdAcc, currentPast,
      emailToolVerified, emailVerifiedByResponse, emailVerifiedByResponse,
      sourceDetails, connectionSendBy, website, createdBy, createdDate,
      modifiedBy, modifiedDate, industry, contactName, compName, compName,
      compId, safeCompId, technology
    ]);
    contInserted++;
  }
  console.log(`[Sync] Successfully inserted ${contInserted} contacts.`);

  // Write local cached JSON files
  console.log('[Sync] Caching JSON files for localStore fallback...');
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'companies_1000.json'), JSON.stringify(companyRows, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'contacts_1000.json'), JSON.stringify(contactRows, null, 2));
  console.log('[Sync] Cache written successfully.');

  // Verification check
  console.log('\n--- VERIFICATION ON POSTGRESQL ---');
  const compCount = await pool.query('SELECT count(*) FROM companies');
  const contCount = await pool.query('SELECT count(*) FROM contacts');
  console.log(`Companies in Postgres: ${compCount.rows[0].count}`);
  console.log(`Contacts in Postgres: ${contCount.rows[0].count}`);

  const sample100040 = await pool.query('SELECT id, contact_name, comp_name, comp_id, designation, priority_contact, comp_email, contact_phone, contactstatus, source, created_by, created_date, modified_by, modified_date, technology FROM contacts WHERE id = 100040');
  console.log('\nSample Contact 100040 in Postgres:');
  console.log(sample100040.rows[0]);

  const sampleComp100102 = await pool.query('SELECT id, comp_name, technology, country, companyphone, company_categories, employee_size, industry, registration_status, username, contacts_count, contact_count FROM companies WHERE id = 100102');
  console.log('\nSample Company 100102 in Postgres:');
  console.log(sampleComp100102.rows[0]);
}

runFullSync()
  .then(() => {
    console.log('\n=== FULL SYNC COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Full Sync Error:', err);
    process.exit(1);
  });
