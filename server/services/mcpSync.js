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

// Single-pass RFC 4180 CSV parser preserving inner commas and quotes
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

let reqCounter = 0;

async function executeMcpSql(sql) {
  const token = await getAccessToken();
  reqCounter++;

  const payload = {
    jsonrpc: '2.0',
    id: `${Date.now()}_${reqCounter}_${Math.random().toString(36).substring(2, 7)}`,
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

/**
 * Direct Live Query on CRM.COMPANY
 * Securely excludes PASSWORD and USERNAME to protect credentials.
 */
async function fetchMcpCompanies({
  search = '',
  id_from = '',
  id_to = '',
  name = '',
  comp_name = '',
  limit = 50,
  offset = 0,
  sortBy = 'ID',
  sortOrder = 'DESC',
  industry = '',
  country = '',
  technology = '',
  company_type = '',
  company_categories = '',
  categories = '',
  city = '',
  website = '',
  lead_count = '',
  employee_size = '',
  source = '',
  registration_status = '',
  supplier_number = '',
  created_by = '',
  phone = '',
  companyphone = '',
} = {}) {
  const whereClauses = [];

  if (search && search.trim()) {
    const s = search.trim().replace(/'/g, "''").toLowerCase();
    whereClauses.push(`(
      LOWER(COMP_NAME) LIKE '%${s}%' OR
      LOWER(TECHNOLOGY) LIKE '%${s}%' OR
      LOWER(INDUSTRY) LIKE '%${s}%' OR
      LOWER(COMPANY_TYPE) LIKE '%${s}%' OR
      LOWER(CITY) LIKE '%${s}%' OR
      LOWER(COUNTRY) LIKE '%${s}%' OR
      TO_CHAR(ID) LIKE '%${s}%'
    )`);
  }

  if (id_from && !isNaN(parseInt(id_from, 10))) {
    whereClauses.push(`ID >= ${parseInt(id_from, 10)}`);
  }
  if (id_to && !isNaN(parseInt(id_to, 10))) {
    whereClauses.push(`ID <= ${parseInt(id_to, 10)}`);
  }

  const targetName = (name || comp_name || '').trim();
  if (targetName) {
    const s = targetName.replace(/'/g, "''").toLowerCase();
    whereClauses.push(`LOWER(COMP_NAME) LIKE '%${s}%'`);
  }

  if (industry && industry.trim()) {
    whereClauses.push(`LOWER(INDUSTRY) LIKE '%${industry.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (country && country.trim()) {
    whereClauses.push(`LOWER(COUNTRY) LIKE '%${country.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (technology && technology.trim()) {
    whereClauses.push(`LOWER(TECHNOLOGY) LIKE '%${technology.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (company_type && company_type.trim()) {
    whereClauses.push(`LOWER(COMPANY_TYPE) LIKE '%${company_type.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  const targetCat = (company_categories || categories || '').trim();
  if (targetCat) {
    whereClauses.push(`LOWER(COMPANY_CATEGORIES) LIKE '%${targetCat.replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (city && city.trim()) {
    whereClauses.push(`LOWER(CITY) LIKE '%${city.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (website && website.trim()) {
    whereClauses.push(`LOWER(WEBSITE) LIKE '%${website.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (employee_size && employee_size.trim()) {
    whereClauses.push(`LOWER(EMPLOYEE_SIZE) = '${employee_size.trim().replace(/'/g, "''").toLowerCase()}'`);
  }
  if (lead_count !== '' && !isNaN(parseInt(lead_count, 10))) {
    whereClauses.push(`LEAD_COUNT = ${parseInt(lead_count, 10)}`);
  }
  if (source && source.trim()) {
    whereClauses.push(`LOWER(SOURCE) LIKE '%${source.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (registration_status && registration_status.trim()) {
    whereClauses.push(`LOWER(REGISTRATION_STATUS) = '${registration_status.trim().replace(/'/g, "''").toLowerCase()}'`);
  }
  if (supplier_number && supplier_number.trim()) {
    whereClauses.push(`LOWER(SUPPLIER_NUMBER) LIKE '%${supplier_number.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (created_by && created_by.trim()) {
    whereClauses.push(`LOWER(CREATED_BY) LIKE '%${created_by.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  const targetPhone = (phone || companyphone || '').trim();
  if (targetPhone) {
    const s = targetPhone.replace(/'/g, "''");
    whereClauses.push(`(COMPANYPHONE LIKE '%${s}%')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const safeSort = ['ID', 'COMP_NAME', 'CONTACT_COUNT', 'LEAD_COUNT', 'EMPLOYEE_SIZE', 'TECHNOLOGY', 'INDUSTRY', 'COMPANY_TYPE'].includes(sortBy.toUpperCase()) ? sortBy.toUpperCase() : 'ID';
  const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const sqlParts = [
    'SELECT ID, COMP_NAME, TECHNOLOGY, COUNTRY, EXISTINGCOMP, COMPANYPHONE, COMPANY_CATEGORIES, COMPANY_TYPE, REGISTERED_URL, REGISTRATION_STATUS, SUPPLIER_NUMBER, REGISTRATION_DATE, INDUSTRY, CITY, WEBSITE, DA, COM_EMAIL, REMARK, EMPLOYEE_SIZE, CREATED_BY, TO_CHAR(CREATED_DATE, \'MM/DD/YYYY\') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, \'MM/DD/YYYY\') as MODIFIED_DATE, SALESPERSON, PREV_SALESPERSON, JOGET_ID, CONTACTS_COUNT, LEAD_COUNT, CONTACT_COUNT, SOURCE, NORMALIZED_WEBSITE',
    'FROM CRM.COMPANY',
  ];
  if (whereSql) {
    sqlParts.push(whereSql);
  }
  sqlParts.push(`ORDER BY ${safeSort} ${safeOrder} NULLS LAST`);
  sqlParts.push(`OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);

  const dataSql = sqlParts.join(' ');
  const countSql = `SELECT COUNT(*) as TOTAL FROM CRM.COMPANY ${whereSql}`.trim();

  console.log('[fetchMcpCompanies] countSql:', countSql);
  const countRows = await executeMcpSql(countSql);
  console.log('[fetchMcpCompanies] dataSql:', dataSql);
  const dataRows = await executeMcpSql(dataSql);
  console.log('[fetchMcpCompanies] dataRows.length:', dataRows.length);

  const total = countRows[0]?.TOTAL ? parseInt(countRows[0].TOTAL, 10) : 33937;

  // Normalize returned fields, omit credentials, and clean literal 'undefined'
  const normalizedData = (dataRows || []).map((row) => {
    const id = row.ID ? parseInt(row.ID, 10) : row.id;
    const compType = row.COMPANY_TYPE === 'undefined' ? '' : (row.COMPANY_TYPE || '');
    return {
      id,
      name: row.COMP_NAME || row.comp_name || '',
      comp_name: row.COMP_NAME || row.comp_name || '',
      technology: row.TECHNOLOGY || '',
      country: row.COUNTRY || '',
      existing_comp: row.EXISTINGCOMP || 'N',
      existingcomp: row.EXISTINGCOMP || 'N',
      phone: row.COMPANYPHONE || '',
      companyphone: row.COMPANYPHONE || '',
      company_categories: row.COMPANY_CATEGORIES || '',
      company_type: compType,
      registered_url: row.REGISTERED_URL || '',
      registration_status: row.REGISTRATION_STATUS || '',
      supplier_number: row.SUPPLIER_NUMBER || '',
      registration_date: row.REGISTRATION_DATE || '',
      industry: row.INDUSTRY || '',
      city: row.CITY || '',
      website: row.WEBSITE || '',
      da: row.DA || '',
      email: row.COM_EMAIL || '',
      com_email: row.COM_EMAIL || '',
      remark: row.REMARK || '',
      remarks: row.REMARK || '',
      employee_size: row.EMPLOYEE_SIZE || '',
      created_by: row.CREATED_BY || '',
      created_date: row.CREATED_DATE || '',
      modified_by: row.MODIFIED_BY || '',
      modified_date: row.MODIFIED_DATE || '',
      salesperson: row.SALESPERSON || '',
      prev_salesperson: row.PREV_SALESPERSON || '',
      joget_id: row.JOGET_ID || '',
      contacts_count: row.CONTACTS_COUNT ? parseInt(row.CONTACTS_COUNT, 10) : 0,
      contact_count: row.CONTACT_COUNT ? parseInt(row.CONTACT_COUNT, 10) : 0,
      lead_count: row.LEAD_COUNT ? parseInt(row.LEAD_COUNT, 10) : 0,
      source: row.SOURCE || '',
      normalized_website: row.NORMALIZED_WEBSITE || '',
    };
  });

  return { data: normalizedData, total };
}

/**
 * Direct Live Query on CRM.CONTACT
 */
async function fetchMcpContacts({ search = '', limit = 50, offset = 0, sortBy = 'ID', sortOrder = 'DESC', position_type = '', contact_status = '', industry = '', country = '', company_id = '' } = {}) {
  const whereClauses = [];

  if (search && search.trim()) {
    const s = search.trim().replace(/'/g, "''").toLowerCase();
    whereClauses.push(`(
      LOWER(CONTACT_NAME) LIKE '%${s}%' OR
      LOWER(COMP_NAME) LIKE '%${s}%' OR
      LOWER(DESIGNATION) LIKE '%${s}%' OR
      LOWER(POS_TYPE) LIKE '%${s}%' OR
      LOWER(INDUSTRY) LIKE '%${s}%' OR
      LOWER(COMP_EMAIL) LIKE '%${s}%' OR
      TO_CHAR(ID) LIKE '%${s}%' OR
      TO_CHAR(COMP_ID) LIKE '%${s}%'
    )`);
  }

  if (company_id && company_id.trim()) {
    whereClauses.push(`COMP_ID = ${parseInt(company_id, 10)}`);
  }
  if (position_type && position_type.trim()) {
    whereClauses.push(`LOWER(POS_TYPE) LIKE '%${position_type.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (contact_status && contact_status.trim()) {
    whereClauses.push(`LOWER(CONTACTSTATUS) LIKE '%${contact_status.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (industry && industry.trim()) {
    whereClauses.push(`LOWER(INDUSTRY) LIKE '%${industry.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }
  if (country && country.trim()) {
    whereClauses.push(`LOWER(COUNTRY) LIKE '%${country.trim().replace(/'/g, "''").toLowerCase()}%'`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const safeSort = ['ID', 'COMP_ID', 'COMP_NAME', 'CONTACT_NAME', 'DESIGNATION', 'POS_TYPE', 'CONTACTSTATUS', 'SALESPERSON', 'INDUSTRY'].includes(sortBy.toUpperCase()) ? sortBy.toUpperCase() : 'ID';
  const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const dataSql = `
    SELECT ID, DESIGNATION, POS_TYPE, PRIORITY_CONTACT, COUNTRY, COMP_EMAIL, OTHER_EMAIL, COMP_EMAIL_VERIFIED, CONTACT_PHONE, CONTACT_PHONE2, CONTACT_PHONE3, CONTACT_MOBILE, CONTACT_MOBILE2, CONTACT_MOBILE3, MOBILE_VERIFIED, LINKEDIN_URL, LINKEDLNID, COMP_LINKEDLNID, PREFERRED_LINKEDIN_CONNECTED, LINKEDIN_CONN_SEND_ACC, CONNECTION_DATE, CONTACTSTATUS, SALESPERSON, SOURCE, DATA_EXTRACTED, REMARK, LINKEDIN_CNNCTD_ACC, CURRENT_PAST, EMAIL_TOOL_VERIFIED, EMAIL_VERIFIED_BY_RESPONSE, SOURCE_DETAILS, CONNECTION_SEND_BY, WEBSITE, CREATED_BY, TO_CHAR(CREATED_DATE, 'MM/DD/YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'MM/DD/YYYY') as MODIFIED_DATE, INDUSTRY, CONTACT_NAME, COMP_NAME, COMP_ID, TECHNOLOGY
    FROM CRM.CONTACT
    ${whereSql}
    ORDER BY ${safeSort} ${safeOrder} NULLS LAST
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

  const countSql = `SELECT COUNT(*) as TOTAL FROM CRM.CONTACT ${whereSql}`;

  const [dataRows, countRows] = await Promise.all([
    executeMcpSql(dataSql),
    executeMcpSql(countSql),
  ]);

  const total = countRows[0]?.TOTAL ? parseInt(countRows[0].TOTAL, 10) : 58757;
  return { data: dataRows, total };
}

/**
 * Sync Companies from MCP into PostgreSQL
 */
async function syncCompanies(limit = 1000) {
  console.log(`[MCP Sync] Fetching ${limit} companies from Oracle MCP (CRM.COMPANY)...`);
  const sql = `
    SELECT *
    FROM CRM.COMPANY
    ORDER BY ID ASC
    OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

  const rows = await executeMcpSql(sql);
  console.log(`[MCP Sync] Received ${rows.length} company records. Inserting into PostgreSQL...`);

  let insertedCount = 0;
  for (const r of rows) {
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
      ON CONFLICT (id) DO UPDATE SET
        comp_name = EXCLUDED.comp_name,
        name = EXCLUDED.name,
        technology = EXCLUDED.technology,
        country = EXCLUDED.country,
        existingcomp = EXCLUDED.existingcomp,
        existing_comp = EXCLUDED.existing_comp,
        companyphone = EXCLUDED.companyphone,
        phone = EXCLUDED.phone,
        company_categories = EXCLUDED.company_categories,
        company_type = EXCLUDED.company_type,
        registered_url = EXCLUDED.registered_url,
        registration_status = EXCLUDED.registration_status,
        supplier_number = EXCLUDED.supplier_number,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        registration_date = EXCLUDED.registration_date,
        industry = EXCLUDED.industry,
        city = EXCLUDED.city,
        website = EXCLUDED.website,
        da = EXCLUDED.da,
        com_email = EXCLUDED.com_email,
        email = EXCLUDED.email,
        remark = EXCLUDED.remark,
        remarks = EXCLUDED.remarks,
        employee_size = EXCLUDED.employee_size,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date,
        salesperson = EXCLUDED.salesperson,
        prev_salesperson = EXCLUDED.prev_salesperson,
        joget_id = EXCLUDED.joget_id,
        contacts_count = EXCLUDED.contacts_count,
        lead_count = EXCLUDED.lead_count,
        contact_count = EXCLUDED.contact_count,
        source = EXCLUDED.source,
        normalized_website = EXCLUDED.normalized_website
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
    insertedCount++;
  }

  await pool.query(`
    SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1), true)
  `).catch(() => { });

  console.log(`[MCP Sync] Successfully synced ${insertedCount} companies into PostgreSQL.`);
  return insertedCount;
}

/**
 * Sync Contacts from MCP into PostgreSQL
 */
async function syncContacts(limit = 1000) {
  console.log(`[MCP Sync] Fetching ${limit} contacts from Oracle MCP (CRM.CONTACT)...`);
  const sql = `
    SELECT *
    FROM CRM.CONTACT
    ORDER BY ID ASC
    OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

  const rows = await executeMcpSql(sql);
  console.log(`[MCP Sync] Received ${rows.length} contact records. Inserting into PostgreSQL...`);

  const existingCompIdsRes = await pool.query('SELECT id FROM companies').catch(() => ({ rows: [] }));
  const validCompanyIds = new Set(existingCompIdsRes.rows.map((r) => String(r.id)));

  let insertedCount = 0;
  for (const r of rows) {
    const id = parseInt(r.ID, 10);
    const rawCompId = r.COMP_ID ? String(r.COMP_ID).trim() : null;
    const safeCompId = rawCompId && validCompanyIds.has(rawCompId) ? parseInt(rawCompId, 10) : null;
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
      ON CONFLICT (id) DO UPDATE SET
        designation = EXCLUDED.designation,
        pos_type = EXCLUDED.pos_type,
        position_type = EXCLUDED.position_type,
        priority_contact = EXCLUDED.priority_contact,
        country = EXCLUDED.country,
        comp_email = EXCLUDED.comp_email,
        email = EXCLUDED.email,
        other_email = EXCLUDED.other_email,
        comp_email_verified = EXCLUDED.comp_email_verified,
        email_verified = EXCLUDED.email_verified,
        contact_phone = EXCLUDED.contact_phone,
        phone = EXCLUDED.phone,
        contact_phone2 = EXCLUDED.contact_phone2,
        phone2 = EXCLUDED.phone2,
        contact_phone3 = EXCLUDED.contact_phone3,
        phone3 = EXCLUDED.phone3,
        contact_mobile = EXCLUDED.contact_mobile,
        mobile = EXCLUDED.mobile,
        contact_mobile2 = EXCLUDED.contact_mobile2,
        mobile2 = EXCLUDED.mobile2,
        contact_mobile3 = EXCLUDED.contact_mobile3,
        mobile3 = EXCLUDED.mobile3,
        mobile_verified = EXCLUDED.mobile_verified,
        linkedin_url = EXCLUDED.linkedin_url,
        linkedlnid = EXCLUDED.linkedlnid,
        linkedin_id = EXCLUDED.linkedin_id,
        comp_linkedlnid = EXCLUDED.comp_linkedlnid,
        comp_linkedin_id = EXCLUDED.comp_linkedin_id,
        preferred_linkedin_connected = EXCLUDED.preferred_linkedin_connected,
        linkedin_conn_send_acc = EXCLUDED.linkedin_conn_send_acc,
        connection_date = EXCLUDED.connection_date,
        contactstatus = EXCLUDED.contactstatus,
        contact_status = EXCLUDED.contact_status,
        salesperson = EXCLUDED.salesperson,
        source = EXCLUDED.source,
        data_extracted = EXCLUDED.data_extracted,
        data_extracted_date = EXCLUDED.data_extracted_date,
        remark = EXCLUDED.remark,
        remarks = EXCLUDED.remarks,
        linkedin_cnnctd_acc = EXCLUDED.linkedin_cnnctd_acc,
        linkedin_connected_acc = EXCLUDED.linkedin_connected_acc,
        current_past = EXCLUDED.current_past,
        email_tool_verified = EXCLUDED.email_tool_verified,
        email_verified_by_response = EXCLUDED.email_verified_by_response,
        email_verified_response = EXCLUDED.email_verified_response,
        source_details = EXCLUDED.source_details,
        connection_send_by = EXCLUDED.connection_send_by,
        website = EXCLUDED.website,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date,
        industry = EXCLUDED.industry,
        contact_name = EXCLUDED.contact_name,
        comp_name = EXCLUDED.comp_name,
        company_name = EXCLUDED.company_name,
        comp_id = EXCLUDED.comp_id,
        company_id = EXCLUDED.company_id,
        technology = EXCLUDED.technology
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
    insertedCount++;
  }

  await pool.query(`
    SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1), true)
  `).catch(() => { });

  console.log(`[MCP Sync] Successfully synced ${insertedCount} contacts into PostgreSQL.`);
  return insertedCount;
}

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

/**
 * Sync All CRM Masters from MCP into PostgreSQL
 */
async function syncAllMasters() {
  console.log('[MCP Master Sync] Starting complete master synchronization from Oracle MCP...');
  const results = {};

  // 1. Ensure master tables exist
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

  // Company Sizes
  const sizeRows = await executeMcpSql(`SELECT ID, COMPANY_SIZE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT FROM CRM.COMPANY_SIZE ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_company_sizes');
  for (const r of sizeRows) {
    if (!r.COMPANY_SIZE) continue;
    await pool.query(
      `INSERT INTO master_company_sizes (id, master_company_size, master_count, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [parseInt(r.ID, 10), r.COMPANY_SIZE, parseInt(r.COMPANY_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'AMAAN', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.companySizes = sizeRows.length;

  // Company Types
  const typeRows = await executeMcpSql(`SELECT ID, COMPANY_TYPE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_TYPE_COUNT FROM CRM.COMPANY_TYPE ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_company_types');
  for (const r of typeRows) {
    if (!r.COMPANY_TYPE) continue;
    await pool.query(
      `INSERT INTO master_company_types (id, master_company_type, master_count, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [parseInt(r.ID, 10), r.COMPANY_TYPE, parseInt(r.COMPANY_TYPE_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ZAIN_DATEY', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.companyTypes = typeRows.length;

  // Countries
  const countryRows = await executeMcpSql(`SELECT ID, COUNTRY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT FROM CRM.COUNTRY ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_countries');
  for (const r of countryRows) {
    const countryVal = r.COUNTRY !== undefined ? r.COUNTRY : '';
    await pool.query(
      `INSERT INTO master_countries (id, country, master_count, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [parseInt(r.ID, 10), countryVal, parseInt(r.COMPANY_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'AMAAN', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.countries = countryRows.length;

  // Country & City Mapping (4334 records)
  const mappingRows = await executeMcpSql(`SELECT ID, COUNTRY, CITY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT FROM CRM.COUNTRY_CITY_MAPPING ORDER BY ID ASC`);
  await pool.query('DELETE FROM country_city_mapping');
  for (const r of mappingRows) {
    await pool.query(
      `INSERT INTO country_city_mapping (id, country, city, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [parseInt(r.ID, 10), r.COUNTRY || '', r.CITY || '', r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ZAIN_DATEY', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.countryCityMappings = mappingRows.length;

  // Technologies
  const techRows = await executeMcpSql(`SELECT ID, TECHNOLOGY, TECHNOLOGY_CATEGORY, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT FROM CRM.TECHNOLOGY ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_technologies');
  for (const r of techRows) {
    if (!r.TECHNOLOGY) continue;
    await pool.query(
      `INSERT INTO master_technologies (id, technology, technology_category, master_count, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [parseInt(r.ID, 10), r.TECHNOLOGY, r.TECHNOLOGY_CATEGORY || '', parseInt(r.COMPANY_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ADMIN', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.technologies = techRows.length;

  // Sources
  const sourceRows = await executeMcpSql(`SELECT ID, SOURCE, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE, COMPANY_COUNT, CONTACT_COUNT FROM CRM.SOURCE ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_sources');
  for (const r of sourceRows) {
    if (!r.SOURCE) continue;
    await pool.query(
      `INSERT INTO master_sources (id, source, master_count, contact_count, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [parseInt(r.ID, 10), r.SOURCE, parseInt(r.COMPANY_COUNT || 0, 10), parseInt(r.CONTACT_COUNT || 0, 10), r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ADMIN', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.sources = sourceRows.length;

  // Contact Statuses
  const statusRows = await executeMcpSql(`SELECT ID, CONTACT_STATUS, CREATED_BY, TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE, MODIFIED_BY, TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE FROM CRM.CONTACT_STATUS ORDER BY ID ASC`);
  await pool.query('DELETE FROM master_contact_statuses');
  for (const r of statusRows) {
    if (!r.CONTACT_STATUS) continue;
    await pool.query(
      `INSERT INTO master_contact_statuses (id, contact_status, created_by, created_date, modified_by, modified_date) VALUES ($1, $2, $3, $4, $5, $6)`,
      [parseInt(r.ID, 10), r.CONTACT_STATUS, r.CREATED_BY || 'APEX_PUBLIC_USER', formatOracleDate(r.CREATED_DATE), r.MODIFIED_BY || 'ADMIN', formatOracleDate(r.MODIFIED_DATE)]
    );
  }
  results.contactStatuses = statusRows.length;

  // Align sequences to MAX(id)
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

  console.log('[MCP Master Sync] Master sync completed successfully:', results);
  return results;
}

module.exports = {
  syncCompanies,
  syncContacts,
  syncAllMasters,
  executeMcpSql,
  fetchMcpCompanies,
  fetchMcpContacts,
};
