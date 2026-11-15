const { pool } = require('../db/pool');

/**
 * Standard Contact Upload Template Columns matching Oracle APEX CRM.CONTACT_TEMPLATE_COLS
 */
const CONTACT_INSERT_HEADERS = [
  'Company ID',
  'Joget Company ID',
  'Company Name',
  'Contact Name',
  'Designation',
  'Position Type',
  'Priority Contact',
  'Country',
  'Company Email',
  'Other Email',
  'Company Email Verified',
  'Contact Phone',
  'Contact Phone 2',
  'Contact Phone 3',
  'Contact Mobile',
  'Contact Mobile 2',
  'Contact Mobile 3',
  'Mobile Verified',
  'LinkedIn URL',
  'LinkedIn ID',
  'Company LinkedIn ID',
  'Preferred LinkedIn Connected',
  'LinkedIn Connection Sent Account',
  'Connection Date',
  'Contact Status',
  'Salesperson',
  'Previous Salesperson',
  'Source',
  'Data Extracted',
  'Remark',
  'LinkedIn Connected Account',
  'Current/Past',
  'Email Tool Verified',
  'Email Verified By Response',
  'Source Details',
  'Connection Sent By',
  'Website',
];

const CONTACT_UPDATE_HEADERS = ['Contact ID', ...CONTACT_INSERT_HEADERS];

const SAMPLE_CONTACT_ROWS = [
  [
    '364601',
    '',
    'Proterra',
    'John Doe',
    'IT Manager',
    'Manager',
    'Y',
    'USA',
    'jdoe@proterra.example.com',
    'john.doe@personal.example.com',
    'Y',
    '+1-555-0101',
    '',
    '',
    '+1-555-0102',
    '',
    '',
    'Y',
    'https://www.linkedin.com/in/johndoe',
    'johndoe-101',
    'proterra-inc',
    'Y',
    'Shirin Muzzaffar',
    '15/08/2026',
    'Active',
    'Aaliya Bhatkar',
    '',
    'LinkedIn',
    '20/07/2026',
    'Key decision maker for technology stack',
    'Shirin Muzzaffar',
    'Current',
    'Verified',
    'Responded',
    'Inbound outreach',
    'Shirin Muzzaffar',
    'https://proterra.example.com',
  ],
];

/**
 * Generate CSV template string for Contacts
 */
function getContactTemplateCsv(mode = 'insert') {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headers = String(mode).toLowerCase() === 'update' ? CONTACT_UPDATE_HEADERS : CONTACT_INSERT_HEADERS;
  const headerLine = headers.map(escapeCsv).join(',');

  const rows = SAMPLE_CONTACT_ROWS.map((r) => {
    const rowData = String(mode).toLowerCase() === 'update' ? ['1001', ...r] : r;
    return rowData.map(escapeCsv).join(',');
  });

  return [headerLine, ...rows].join('\n');
}

/**
 * Retrieve master lookup metadata for contact validation
 */
async function getContactUploadMeta() {
  const [compRes, ctryRes, desigRes, posRes, spRes, srcRes, statusRes] = await Promise.all([
    pool.query(`SELECT id, COALESCE(comp_name, name) as comp_name, website, joget_id FROM companies`),
    pool.query(`SELECT DISTINCT country FROM master_countries WHERE country IS NOT NULL AND country != '' ORDER BY country ASC`),
    pool.query(`SELECT DISTINCT designation FROM master_designation_positions WHERE designation IS NOT NULL AND designation != ''`),
    pool.query(`SELECT DISTINCT pos_type FROM master_position_types WHERE pos_type IS NOT NULL AND pos_type != ''`),
    pool.query(`SELECT DISTINCT salesperson FROM master_salespersons WHERE salesperson IS NOT NULL AND salesperson != ''`),
    pool.query(`SELECT DISTINCT source FROM master_sources WHERE source IS NOT NULL AND source != ''`),
    pool.query(`SELECT DISTINCT contact_status FROM master_contact_statuses WHERE contact_status IS NOT NULL AND contact_status != ''`),
  ]);

  return {
    companies: compRes.rows,
    countries: ctryRes.rows.map((r) => r.country),
    designations: desigRes.rows.map((r) => r.designation),
    positionTypes: posRes.rows.map((r) => r.pos_type),
    salespersons: spRes.rows.map((r) => r.salesperson),
    sources: srcRes.rows.map((r) => r.source),
    contactStatuses: statusRes.rows.map((r) => r.contact_status),
  };
}

/**
 * Validate batch of staged contact rows
 */
async function validateContactBatch(rows, mode = 'insert') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: 'No contact rows provided for validation.',
      summary: { total: 0, new: 0, update: 0, errors: 0, valid: 0, invalid: 0, warnings: 0 },
      results: [],
    };
  }

  const meta = await getContactUploadMeta();

  // Load existing contacts for uniqueness checks
  const existingContactsRes = await pool.query(`
    SELECT id, contact_name, comp_id, comp_name, comp_email, other_email, linkedin_url
    FROM contacts
  `);
  const existingContacts = existingContactsRes.rows;

  // Build lookup maps
  const dbCompanyIdMap = new Map();
  const dbCompanyNameMap = new Map();
  for (const c of meta.companies) {
    dbCompanyIdMap.set(Number(c.id), c);
    if (c.comp_name) dbCompanyNameMap.set(c.comp_name.toLowerCase().trim(), c);
  }

  const dbContactIdMap = new Map();
  const dbContactEmailMap = new Map();
  const dbContactLinkedinMap = new Map();
  const dbContactPairMap = new Map(); // lower(comp_name) + '::' + lower(contact_name)
  for (const ct of existingContacts) {
    dbContactIdMap.set(Number(ct.id), ct);
    if (ct.comp_email && ct.comp_email.trim()) {
      dbContactEmailMap.set(ct.comp_email.toLowerCase().trim(), ct);
    }
    if (ct.other_email && ct.other_email.trim()) {
      dbContactEmailMap.set(ct.other_email.toLowerCase().trim(), ct);
    }
    if (ct.linkedin_url && ct.linkedin_url.trim()) {
      dbContactLinkedinMap.set(ct.linkedin_url.toLowerCase().trim(), ct);
    }
    if (ct.comp_name && ct.contact_name) {
      dbContactPairMap.set(`${ct.comp_name.toLowerCase().trim()}::${ct.contact_name.toLowerCase().trim()}`, ct);
    }
  }

  const countrySet = new Set(meta.countries.map((c) => c.toLowerCase().trim()));
  const spSet = new Set(meta.salespersons.map((s) => s.toLowerCase().trim()));
  const srcSet = new Set(meta.sources.map((s) => s.toLowerCase().trim()));
  const statusSet = new Set(meta.contactStatuses.map((s) => s.toLowerCase().trim()));
  const posSet = new Set((meta.positionTypes || []).map((p) => p.toLowerCase().trim()));

  // In-file duplicate trackers
  const fileSeenPairs = new Map();
  const fileSeenEmails = new Map();
  const fileSeenLinkedins = new Map();

  let newCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  const results = rows.map((rawRow, idx) => {
    const src = rawRow.normalized ? { ...rawRow.normalized, ...rawRow } : rawRow;
    const sourceRowNumber = rawRow.__sourceRowNumber !== undefined ? rawRow.__sourceRowNumber : idx + 2;

    const errors = [];
    const warnings = [];

    // Fields extraction
    const rawContactId = String(src['Contact ID'] || src['contact_id'] || src['contactid'] || src['id'] || src.id || '').trim();
    const rawCompId = String(src['Company ID'] || src['comp_id'] || src['companyid'] || src.comp_id || '').trim();
    const compName = String(src['Company Name'] || src['comp_name'] || src['companyname'] || src.comp_name || '').trim();
    const contactName = String(src['Contact Name'] || src['contact_name'] || src['contactname'] || src['Name'] || src.contact_name || '').trim();
    const designation = String(src['Designation'] || src['designation'] || '').trim();
    const posType = String(src['Position Type'] || src['pos_type'] || src['positiontype'] || '').trim();
    const priorityContact = String(src['Priority Contact'] || src['priority_contact'] || 'N').trim().toUpperCase();
    const country = String(src['Country'] || src['country'] || '').trim();
    const compEmail = String(src['Company Email'] || src['comp_email'] || src['companyemail'] || src['Email'] || '').trim();
    const otherEmail = String(src['Other Email'] || src['other_email'] || src['otheremail'] || '').trim();
    const compEmailVerified = String(src['Company Email Verified'] || src['comp_email_verified'] || 'N').trim();
    const contactPhone = String(src['Contact Phone'] || src['contact_phone'] || src['phone'] || '').trim();
    const contactMobile = String(src['Contact Mobile'] || src['contact_mobile'] || src['mobile'] || '').trim();
    const linkedinUrl = String(src['LinkedIn URL'] || src['linkedin_url'] || src['linkedinurl'] || '').trim();
    const contactStatus = String(src['Contact Status'] || src['contactstatus'] || src['contact_status'] || 'Active').trim();
    const salesperson = String(src['Salesperson'] || src['salesperson'] || '').trim();
    const prevSalesperson = String(src['Previous Salesperson'] || src['prev_salesperson'] || '').trim();
    const source = String(src['Source'] || src['source'] || '').trim();
    const remark = String(src['Remark'] || src['remark'] || src['Remarks'] || '').trim();
    const website = String(src['Website'] || src['website'] || '').trim();

    // 1. Validate Contact ID
    let parsedContactId = null;
    if (rawContactId) {
      if (!/^\d+$/.test(rawContactId)) {
        errors.push({ field: 'Contact ID', message: `Contact ID "${rawContactId}" is not a valid number` });
      } else {
        parsedContactId = parseInt(rawContactId, 10);
        if (!dbContactIdMap.has(parsedContactId)) {
          errors.push({ field: 'Contact ID', message: `Contact ID ${parsedContactId} does not exist` });
        }
      }
    } else if (mode === 'update') {
      errors.push({ field: 'Contact ID', message: 'Contact ID is required for Update mode' });
    }

    // 2. Validate Company reference
    let matchedCompany = null;
    if (rawCompId) {
      if (!/^\d+$/.test(rawCompId)) {
        errors.push({ field: 'Company ID', message: `Company ID "${rawCompId}" is not a valid number` });
      } else {
        matchedCompany = dbCompanyIdMap.get(parseInt(rawCompId, 10));
        if (!matchedCompany) {
          errors.push({ field: 'Company ID', message: `Company ID ${rawCompId} does not exist` });
        } else if (compName && matchedCompany.comp_name.toLowerCase().trim() !== compName.toLowerCase()) {
          errors.push({ field: 'Company Name', message: 'Company ID and Company Name do not match the same company' });
        }
      }
    }

    if (!compName) {
      errors.push({ field: 'Company Name', message: 'Company Name is required' });
    } else if (!matchedCompany) {
      matchedCompany = dbCompanyNameMap.get(compName.toLowerCase());
      if (!matchedCompany) {
        errors.push({ field: 'Company Name', message: `Company "${compName}" not found in CRM Companies` });
      }
    }

    // 3. Validate Contact Name
    if (!contactName) {
      errors.push({ field: 'Contact Name', message: 'Contact Name is required' });
    } else {
      const pairKey = `${compName.toLowerCase()}::${contactName.toLowerCase()}`;
      if (fileSeenPairs.has(pairKey)) {
        errors.push({ field: 'Contact Name', message: 'Duplicate Contact (same name + company) inside file' });
      } else {
        fileSeenPairs.set(pairKey, sourceRowNumber);
      }

      if (mode === 'insert' && dbContactPairMap.has(pairKey)) {
        errors.push({ field: 'Contact Name', message: `Contact "${contactName}" already exists for ${compName}` });
      }
    }

    // 4. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (compEmail) {
      if (!emailRegex.test(compEmail)) {
        errors.push({ field: 'Company Email', message: 'Company Email format is invalid' });
      } else {
        const lowerEmail = compEmail.toLowerCase();
        if (fileSeenEmails.has(lowerEmail)) {
          errors.push({ field: 'Company Email', message: 'Duplicate Contact Email inside the file' });
        } else {
          fileSeenEmails.set(lowerEmail, sourceRowNumber);
        }

        if (mode === 'insert' && dbContactEmailMap.has(lowerEmail)) {
          errors.push({ field: 'Company Email', message: 'Contact Email already exists (use its ID to update)' });
        }
      }
    }

    if (otherEmail && !emailRegex.test(otherEmail)) {
      errors.push({ field: 'Other Email', message: 'Other Email format is invalid' });
    }

    // 5. Validate URLs
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    if (website && (!urlPattern.test(website) || website.toLowerCase() === 'n/a')) {
      errors.push({ field: 'Website', message: 'Website is not valid' });
    }
    if (linkedinUrl) {
      const lowerLk = linkedinUrl.toLowerCase().trim();
      if (!urlPattern.test(linkedinUrl) || !lowerLk.includes('linkedin.com')) {
        errors.push({ field: 'LinkedIn URL', message: 'LinkedIn URL is not valid' });
      } else {
        if (fileSeenLinkedins.has(lowerLk)) {
          errors.push({ field: 'LinkedIn URL', message: 'Duplicate LinkedIn URL inside the file' });
        } else {
          fileSeenLinkedins.set(lowerLk, sourceRowNumber);
        }

        if (mode === 'insert' && dbContactLinkedinMap.has(lowerLk)) {
          errors.push({ field: 'LinkedIn URL', message: 'LinkedIn URL already exists (use its ID to update)' });
        }
      }
    }

    // 6. Master Lookups
    if (country && !countrySet.has(country.toLowerCase())) {
      errors.push({ field: 'Country', message: `Country "${country}" not found in Country Master` });
    }
    if (posType && !posSet.has(posType.toLowerCase())) {
      errors.push({ field: 'Position Type', message: `Position Type "${posType}" not found` });
    }
    if (salesperson && !spSet.has(salesperson.toLowerCase())) {
      errors.push({ field: 'Salesperson', message: `Salesperson "${salesperson}" not found` });
    }
    if (source && !srcSet.has(source.toLowerCase())) {
      errors.push({ field: 'Source', message: `Source "${source}" not found` });
    }
    if (contactStatus && !statusSet.has(contactStatus.toLowerCase())) {
      warnings.push({ field: 'Contact Status', message: `Contact Status "${contactStatus}" not recognized` });
    }

    const isValid = errors.length === 0;
    let rowStatus = 'NEW';
    if (!isValid) {
      rowStatus = 'ERROR';
      errorCount++;
    } else if (mode === 'update' || parsedContactId) {
      rowStatus = 'UPDATE';
      updateCount++;
    } else {
      rowStatus = 'NEW';
      newCount++;
    }

    if (warnings.length > 0) warningCount++;
    const errorMsg = errors.map((e) => e.message).join(' | ');

    return {
      sourceRowNumber,
      stg_id: 501000 + idx,
      batch_id: 2026,
      row_status: rowStatus,
      error_msg: errorMsg,
      isValid,
      errors,
      warnings,
      normalized: {
        id: parsedContactId || undefined,
        contact_id: parsedContactId || undefined,
        comp_id: matchedCompany ? matchedCompany.id : (rawCompId ? parseInt(rawCompId, 10) : undefined),
        comp_name: compName,
        contact_name: contactName,
        designation: designation || null,
        pos_type: posType || null,
        priority_contact: priorityContact || 'N',
        country: country || null,
        comp_email: compEmail || null,
        other_email: otherEmail || null,
        comp_email_verified: compEmailVerified || 'N',
        contact_phone: contactPhone || null,
        contact_mobile: contactMobile || null,
        linkedin_url: linkedinUrl || null,
        contactstatus: contactStatus || 'Active',
        salesperson: salesperson || null,
        prev_salesperson: prevSalesperson || null,
        source: source || null,
        remark: remark || null,
        website: website || null,
      },
    };
  });

  return {
    success: true,
    summary: {
      total: rows.length,
      new: newCount,
      update: updateCount,
      errors: errorCount,
      valid: newCount + updateCount,
      invalid: errorCount,
      warnings: warningCount,
    },
    results,
  };
}

/**
 * Import validated contact rows into PostgreSQL database
 */
async function importContactBatch(validatedResults, mode = 'insert', policy = 'skip') {
  if (!Array.isArray(validatedResults) || validatedResults.length === 0) {
    throw new Error('No validated contact records provided for import.');
  }

  const rowsToProcess = policy === 'skip'
    ? validatedResults.filter((r) => r.isValid)
    : validatedResults;

  if (rowsToProcess.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedCount: validatedResults.length,
      failedCount: 0,
      message: 'No valid contacts available to import. All rows were skipped due to validation errors.',
      importedIds: [],
    };
  }

  const client = await pool.connect();
  const importedIds = [];
  const batchId = Math.floor(Date.now() / 1000) % 900000 + 100000;

  try {
    await client.query('BEGIN');

    for (const item of rowsToProcess) {
      const c = item.normalized;

      if (mode === 'insert') {
        const insertSql = `
          INSERT INTO contacts (
            comp_id, comp_name, contact_name, designation, pos_type,
            priority_contact, country, comp_email, email, other_email,
            comp_email_verified, contact_phone, phone, contact_mobile, mobile,
            linkedin_url, contactstatus, salesperson,
            source, remark, website, created_by, created_date, modified_by, modified_date
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $8, $9,
            $10, $11, $11, $12, $12,
            $13, $14, $15,
            $16, $17, $18, 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY'), 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY')
          )
          RETURNING id
        `;

        const params = [
          c.comp_id || null,
          c.comp_name,
          c.contact_name,
          c.designation,
          c.pos_type,
          c.priority_contact,
          c.country,
          c.comp_email,
          c.other_email,
          c.comp_email_verified,
          c.contact_phone,
          c.contact_mobile,
          c.linkedin_url,
          c.contactstatus,
          c.salesperson,
          c.source,
          c.remark,
          c.website,
        ];

        const res = await client.query(insertSql, params);
        if (res.rows[0]) importedIds.push(res.rows[0].id);
      } else if (mode === 'update') {
        const updateSql = `
          UPDATE contacts SET
            comp_id = COALESCE($2, comp_id),
            comp_name = COALESCE($3, comp_name),
            contact_name = COALESCE($4, contact_name),
            designation = COALESCE($5, designation),
            pos_type = COALESCE($6, pos_type),
            priority_contact = COALESCE($7, priority_contact),
            country = COALESCE($8, country),
            comp_email = COALESCE($9, comp_email),
            email = COALESCE($9, email),
            other_email = COALESCE($10, other_email),
            comp_email_verified = COALESCE($11, comp_email_verified),
            contact_phone = COALESCE($12, contact_phone),
            phone = COALESCE($12, phone),
            contact_mobile = COALESCE($13, contact_mobile),
            mobile = COALESCE($13, mobile),
            linkedin_url = COALESCE($14, linkedin_url),
            contactstatus = COALESCE($15, contactstatus),
            salesperson = COALESCE($16, salesperson),
            source = COALESCE($17, source),
            remark = COALESCE($18, remark),
            website = COALESCE($19, website),
            modified_by = 'APEX_PUBLIC_USER',
            modified_date = TO_CHAR(NOW(), 'DD-MON-YYYY')
          WHERE id = $1
        `;

        const params = [
          c.id || c.contact_id,
          c.comp_id || null,
          c.comp_name,
          c.contact_name,
          c.designation,
          c.pos_type,
          c.priority_contact,
          c.country,
          c.comp_email,
          c.other_email,
          c.comp_email_verified,
          c.contact_phone,
          c.contact_mobile,
          c.linkedin_url,
          c.contactstatus,
          c.salesperson,
          c.source,
          c.remark,
          c.website,
        ];

        await client.query(updateSql, params);
        importedIds.push(c.id || c.contact_id);
      }
    }

    // Record error rows into contact_incorrect_data
    const errorRows = validatedResults.filter((r) => !r.isValid);
    for (const errItem of errorRows) {
      const c = errItem.normalized;
      await client.query(
        `INSERT INTO contact_incorrect_data (
          batch_id, excel_row_no, comp_id, comp_name, contact_name, designation,
          pos_type, country, comp_email, other_email, contact_phone, contact_mobile,
          linkedin_url, salesperson, source, remark, website, error_message, error_date, created_by, created_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, TO_CHAR(NOW(), 'DD-MON-YYYY'), 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY')
        )`,
        [
          batchId,
          errItem.excel_row_no || errItem.sourceRowNumber,
          c.comp_id || '',
          c.comp_name || '',
          c.contact_name || '',
          c.designation || '',
          c.pos_type || '',
          c.country || '',
          c.comp_email || '',
          c.other_email || '',
          c.contact_phone || '',
          c.contact_mobile || '',
          c.linkedin_url || '',
          c.salesperson || '',
          c.source || '',
          c.remark || '',
          c.website || '',
          errItem.error_msg,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      batchId,
      importedCount: importedIds.length,
      skippedCount: validatedResults.length - rowsToProcess.length,
      failedCount: 0,
      message: `Successfully imported ${importedIds.length} contact(s) into CRM database.`,
      importedIds,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getContactTemplateCsv,
  getContactUploadMeta,
  validateContactBatch,
  importContactBatch,
};
