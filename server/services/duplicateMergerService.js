const db = require('../db/pool');

/**
 * Service to manage Duplicate Merging for Companies and Contacts.
 * Strictly operates on the local PostgreSQL database (crm_db).
 */

const PROTECTED_COMPANY_IDS = ['364607']; // System test record safety boundary

/**
 * Standardize website domain for reliable duplicate matching
 */
function normalizeDomain(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/^www\./i, '');
  clean = clean.replace(/\/.*$/, '');
  clean = clean.trim();
  if (clean === '-' || clean === 'none' || clean === 'null' || clean === 'n/a' || clean === 'not found') {
    return '';
  }
  return clean;
}

/**
 * Standardize LinkedIn profile URL
 */
function normalizeLinkedIn(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/^www\./i, '');
  clean = clean.replace(/^linkedin\.com\/in\//i, '');
  clean = clean.replace(/^linkedin\.com\//i, '');
  clean = clean.replace(/\/.*$/, '');
  clean = clean.trim();
  if (!clean || clean === 'in' || clean === '-' || clean === 'none' || clean === 'null') {
    return '';
  }
  return clean;
}

/**
 * Find candidate duplicate company groups
 */
async function findCompanyDuplicates({ rule = 'all', search = '', page = 1, limit = 20 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  let groupQueries = [];

  // Rule 1: Exact Normalized Company Name
  if (rule === 'all' || rule === 'name') {
    groupQueries.push(`
      SELECT 
        'name' AS match_rule_type,
        'Matching Company Name' AS match_rule,
        LOWER(TRIM(COALESCE(c.comp_name, c.name))) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(c.id ORDER BY c.id ASC) AS candidate_ids
      FROM companies c
      WHERE COALESCE(c.comp_name, c.name) IS NOT NULL 
        AND TRIM(COALESCE(c.comp_name, c.name)) != ''
      GROUP BY LOWER(TRIM(COALESCE(c.comp_name, c.name)))
      HAVING COUNT(*) > 1
    `);
  }

  // Rule 2: Normalized Website Domain
  if (rule === 'all' || rule === 'website') {
    groupQueries.push(`
      SELECT 
        'website' AS match_rule_type,
        'Matching Website Domain' AS match_rule,
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(c.website, '^https?://(www\\.)?', '', 'i'), '/.*$', ''))) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(c.id ORDER BY c.id ASC) AS candidate_ids
      FROM companies c
      WHERE c.website IS NOT NULL 
        AND TRIM(c.website) != ''
        AND TRIM(c.website) != '-'
        AND LOWER(TRIM(c.website)) NOT IN ('none', 'null', 'n/a', 'not found', 'undefined')
        AND LENGTH(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(c.website, '^https?://(www\\.)?', '', 'i'), '/.*$', ''))) > 3
      GROUP BY LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(c.website, '^https?://(www\\.)?', '', 'i'), '/.*$', '')))
      HAVING COUNT(*) > 1
    `);
  }

  // Rule 3: Exact Corporate Email
  if (rule === 'all' || rule === 'email') {
    groupQueries.push(`
      SELECT 
        'email' AS match_rule_type,
        'Matching Corporate Email' AS match_rule,
        LOWER(TRIM(COALESCE(c.com_email, c.email))) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(c.id ORDER BY c.id ASC) AS candidate_ids
      FROM companies c
      WHERE COALESCE(c.com_email, c.email) IS NOT NULL 
        AND TRIM(COALESCE(c.com_email, c.email)) != ''
        AND TRIM(COALESCE(c.com_email, c.email)) != '-'
        AND LOWER(TRIM(COALESCE(c.com_email, c.email))) NOT IN ('none', 'null', 'n/a', 'not found', 'undefined')
      GROUP BY LOWER(TRIM(COALESCE(c.com_email, c.email)))
      HAVING COUNT(*) > 1
    `);
  }

  if (groupQueries.length === 0) {
    return { groups: [], totalGroups: 0, page: parsedPage, limit: parsedLimit };
  }

  const combinedSql = groupQueries.join(' UNION ALL ');

  let finalQuery = `
    WITH duplicate_groups AS (
      ${combinedSql}
    )
    SELECT * FROM duplicate_groups
  `;

  const queryParams = [];
  if (search && search.trim() !== '') {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    finalQuery += ` WHERE LOWER(match_value) LIKE $1`;
  }

  // Count total groups
  const countSql = `SELECT COUNT(*)::int AS total FROM (${finalQuery}) sub`;
  const countRes = await db.query(countSql, queryParams);
  const totalGroups = countRes.rows[0]?.total || 0;

  // Pagination on groups
  queryParams.push(parsedLimit);
  queryParams.push(offset);
  const pagedSql = `${finalQuery} ORDER BY record_count DESC, match_value ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
  const groupsRes = await db.query(pagedSql, queryParams);

  if (groupsRes.rows.length === 0) {
    return { groups: [], totalGroups, page: parsedPage, limit: parsedLimit };
  }

  // Fetch full company details for candidate IDs in these groups
  const allIds = Array.from(new Set(groupsRes.rows.flatMap(r => r.candidate_ids)));
  const compDetailsRes = await db.query(`
    SELECT 
      c.id,
      COALESCE(c.comp_name, c.name) AS name,
      c.website,
      COALESCE(c.com_email, c.email) AS email,
      COALESCE(c.companyphone, c.phone) AS phone,
      c.country,
      c.city,
      c.industry,
      c.company_type,
      c.employee_size,
      c.registration_status,
      c.technology,
      c.source,
      c.created_by,
      c.created_date,
      c.modified_by,
      c.modified_date,
      COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) AS contact_count,
      COALESCE((SELECT COUNT(*)::int FROM leads ld WHERE ld.company_id = c.id), 0) AS lead_count
    FROM companies c
    WHERE c.id = ANY($1)
    ORDER BY c.id ASC
  `, [allIds]);

  const companyMap = new Map(compDetailsRes.rows.map(r => [String(r.id), r]));

  const enrichedGroups = groupsRes.rows.map((g, idx) => ({
    groupId: `COMP-GRP-${g.match_rule_type.toUpperCase()}-${idx + 1 + offset}`,
    matchRuleType: g.match_rule_type,
    matchRule: g.match_rule,
    matchValue: g.match_value,
    recordCount: g.record_count,
    candidateIds: g.candidate_ids,
    records: g.candidate_ids.map(id => companyMap.get(String(id))).filter(Boolean)
  }));

  return {
    groups: enrichedGroups,
    totalGroups,
    page: parsedPage,
    limit: parsedLimit
  };
}

/**
 * Find candidate duplicate contact groups
 */
async function findContactDuplicates({ rule = 'all', search = '', page = 1, limit = 20 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  let groupQueries = [];

  // Rule 1: Exact Email
  if (rule === 'all' || rule === 'email') {
    groupQueries.push(`
      SELECT 
        'email' AS match_rule_type,
        'Matching Email Address' AS match_rule,
        LOWER(TRIM(COALESCE(ct.comp_email, ct.email))) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(ct.id ORDER BY ct.id ASC) AS candidate_ids
      FROM contacts ct
      WHERE COALESCE(ct.comp_email, ct.email) IS NOT NULL 
        AND TRIM(COALESCE(ct.comp_email, ct.email)) != ''
        AND TRIM(COALESCE(ct.comp_email, ct.email)) != '-'
        AND LOWER(TRIM(COALESCE(ct.comp_email, ct.email))) NOT IN ('none', 'null', 'n/a', 'not found', 'undefined')
      GROUP BY LOWER(TRIM(COALESCE(ct.comp_email, ct.email)))
      HAVING COUNT(*) > 1
    `);
  }

  // Rule 2: LinkedIn Profile URL
  if (rule === 'all' || rule === 'linkedin') {
    groupQueries.push(`
      SELECT 
        'linkedin' AS match_rule_type,
        'Matching LinkedIn Profile' AS match_rule,
        LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(ct.linkedin_url, '^https?://(www\\.)?linkedin\\.com/in/', '', 'i'), '/.*$', ''))) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(ct.id ORDER BY ct.id ASC) AS candidate_ids
      FROM contacts ct
      WHERE ct.linkedin_url IS NOT NULL 
        AND TRIM(ct.linkedin_url) != ''
        AND LOWER(TRIM(ct.linkedin_url)) NOT IN ('none', 'null', 'n/a', 'not found', 'undefined')
        AND LENGTH(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(ct.linkedin_url, '^https?://(www\\.)?linkedin\\.com/in/', '', 'i'), '/.*$', ''))) > 2
      GROUP BY LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(ct.linkedin_url, '^https?://(www\\.)?linkedin\\.com/in/', '', 'i'), '/.*$', '')))
      HAVING COUNT(*) > 1
    `);
  }

  // Rule 3: Contact Name at Same Company
  if (rule === 'all' || rule === 'name_company') {
    groupQueries.push(`
      SELECT 
        'name_company' AS match_rule_type,
        'Same Name at Same Company' AS match_rule,
        CONCAT(LOWER(TRIM(ct.contact_name)), ' @ Comp #', COALESCE(ct.company_id, ct.comp_id)) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(ct.id ORDER BY ct.id ASC) AS candidate_ids
      FROM contacts ct
      WHERE ct.contact_name IS NOT NULL 
        AND TRIM(ct.contact_name) != ''
        AND COALESCE(ct.company_id, ct.comp_id) IS NOT NULL
      GROUP BY LOWER(TRIM(ct.contact_name)), COALESCE(ct.company_id, ct.comp_id)
      HAVING COUNT(*) > 1
    `);
  }

  // Rule 4: Matching Phone / Mobile Number
  if (rule === 'all' || rule === 'phone') {
    groupQueries.push(`
      SELECT 
        'phone' AS match_rule_type,
        'Matching Phone/Mobile' AS match_rule,
        TRIM(COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile)) AS match_value,
        COUNT(*)::int AS record_count,
        array_agg(ct.id ORDER BY ct.id ASC) AS candidate_ids
      FROM contacts ct
      WHERE COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile) IS NOT NULL 
        AND TRIM(COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile)) != ''
        AND TRIM(COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile)) != '-'
        AND LENGTH(TRIM(COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile))) >= 7
      GROUP BY TRIM(COALESCE(ct.contact_phone, ct.contact_mobile, ct.phone, ct.mobile))
      HAVING COUNT(*) > 1
    `);
  }

  if (groupQueries.length === 0) {
    return { groups: [], totalGroups: 0, page: parsedPage, limit: parsedLimit };
  }

  const combinedSql = groupQueries.join(' UNION ALL ');

  let finalQuery = `
    WITH duplicate_groups AS (
      ${combinedSql}
    )
    SELECT * FROM duplicate_groups
  `;

  const queryParams = [];
  if (search && search.trim() !== '') {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    finalQuery += ` WHERE LOWER(match_value) LIKE $1`;
  }

  const countSql = `SELECT COUNT(*)::int AS total FROM (${finalQuery}) sub`;
  const countRes = await db.query(countSql, queryParams);
  const totalGroups = countRes.rows[0]?.total || 0;

  queryParams.push(parsedLimit);
  queryParams.push(offset);
  const pagedSql = `${finalQuery} ORDER BY record_count DESC, match_value ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
  const groupsRes = await db.query(pagedSql, queryParams);

  if (groupsRes.rows.length === 0) {
    return { groups: [], totalGroups, page: parsedPage, limit: parsedLimit };
  }

  const allIds = Array.from(new Set(groupsRes.rows.flatMap(r => r.candidate_ids)));
  const contactDetailsRes = await db.query(`
    SELECT 
      ct.id,
      ct.contact_name,
      COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name) AS company_name,
      COALESCE(ct.company_id, ct.comp_id) AS company_id,
      COALESCE(ct.comp_email, ct.email) AS email,
      COALESCE(ct.contact_phone, ct.phone) AS phone,
      COALESCE(ct.contact_mobile, ct.mobile) AS mobile,
      ct.designation,
      ct.pos_type AS position_type,
      ct.country,
      ct.linkedin_url,
      ct.created_by,
      ct.created_date,
      ct.modified_by,
      ct.modified_date
    FROM contacts ct
    LEFT JOIN companies c ON (ct.company_id = c.id OR ct.comp_id = c.id)
    WHERE ct.id = ANY($1)
    ORDER BY ct.id ASC
  `, [allIds]);

  const contactMap = new Map(contactDetailsRes.rows.map(r => [String(r.id), r]));

  const enrichedGroups = groupsRes.rows.map((g, idx) => ({
    groupId: `CONT-GRP-${g.match_rule_type.toUpperCase()}-${idx + 1 + offset}`,
    matchRuleType: g.match_rule_type,
    matchRule: g.match_rule,
    matchValue: g.match_value,
    recordCount: g.record_count,
    candidateIds: g.candidate_ids,
    records: g.candidate_ids.map(id => contactMap.get(String(id))).filter(Boolean)
  }));

  return {
    groups: enrichedGroups,
    totalGroups,
    page: parsedPage,
    limit: parsedLimit
  };
}

/**
 * Preview company merge before committing
 */
async function previewCompanyMerge({ masterId, secondaryIds = [], fieldOverrides = {} }) {
  if (!masterId) throw new Error('Master Company ID is required.');
  if (!Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    throw new Error('At least one secondary company ID must be selected to merge.');
  }

  const allIds = [masterId, ...secondaryIds];
  const compRes = await db.query(`
    SELECT 
      c.*,
      COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) AS contact_count,
      COALESCE((SELECT COUNT(*)::int FROM leads ld WHERE ld.company_id = c.id), 0) AS lead_count
    FROM companies c
    WHERE c.id = ANY($1)
  `, [allIds]);

  const masterRecord = compRes.rows.find(r => String(r.id) === String(masterId));
  if (!masterRecord) {
    throw new Error(`Master company #${masterId} was not found in the database.`);
  }

  const secondaryRecords = compRes.rows.filter(r => secondaryIds.map(String).includes(String(r.id)));
  if (secondaryRecords.length !== secondaryIds.length) {
    throw new Error('One or more selected secondary company records could not be found.');
  }

  // Count reassignable contacts
  const contactsCountRes = await db.query(`
    SELECT COUNT(*)::int AS count 
    FROM contacts 
    WHERE (company_id = ANY($1) OR comp_id = ANY($1))
      AND (company_id != $2 AND comp_id != $2)
  `, [secondaryIds, masterId]);
  const reassignedContactsCount = contactsCountRes.rows[0]?.count || 0;

  // Count reassignable leads
  const leadsCountRes = await db.query(`
    SELECT COUNT(*)::int AS count 
    FROM leads 
    WHERE company_id = ANY($1) AND company_id != $2
  `, [secondaryIds, masterId]);
  const reassignedLeadsCount = leadsCountRes.rows[0]?.count || 0;

  // Compute final merged values
  const fields = [
    'comp_name', 'name', 'website', 'com_email', 'email', 'companyphone', 'phone',
    'country', 'city', 'industry', 'employee_size', 'company_type', 'company_categories',
    'registration_status', 'technology', 'source', 'remarks', 'da', 'supplier_number'
  ];

  const mergedValues = {};
  fields.forEach(field => {
    if (fieldOverrides[field] !== undefined && fieldOverrides[field] !== null && String(fieldOverrides[field]).trim() !== '') {
      mergedValues[field] = fieldOverrides[field];
    } else if (masterRecord[field] !== undefined && masterRecord[field] !== null && String(masterRecord[field]).trim() !== '') {
      mergedValues[field] = masterRecord[field];
    } else {
      // Auto-fill from secondary if master was blank
      const secVal = secondaryRecords.find(s => s[field] && String(s[field]).trim() !== '');
      mergedValues[field] = secVal ? secVal[field] : (masterRecord[field] || '');
    }
  });

  // Keep names synchronized
  if (mergedValues.comp_name) mergedValues.name = mergedValues.comp_name;
  if (mergedValues.name && !mergedValues.comp_name) mergedValues.comp_name = mergedValues.name;

  return {
    success: true,
    masterRecord,
    secondaryRecords,
    mergedValues,
    reassignedContactsCount,
    reassignedLeadsCount,
  };
}

/**
 * Preview contact merge before committing
 */
async function previewContactMerge({ masterId, secondaryIds = [], fieldOverrides = {} }) {
  if (!masterId) throw new Error('Master Contact ID is required.');
  if (!Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    throw new Error('At least one secondary contact ID must be selected to merge.');
  }

  const allIds = [masterId, ...secondaryIds];
  const contactsRes = await db.query(`
    SELECT ct.*, COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name) AS company_name
    FROM contacts ct
    LEFT JOIN companies c ON (ct.company_id = c.id OR ct.comp_id = c.id)
    WHERE ct.id = ANY($1)
  `, [allIds]);

  const masterRecord = contactsRes.rows.find(r => String(r.id) === String(masterId));
  if (!masterRecord) {
    throw new Error(`Master contact #${masterId} was not found in the database.`);
  }

  const secondaryRecords = contactsRes.rows.filter(r => secondaryIds.map(String).includes(String(r.id)));
  if (secondaryRecords.length !== secondaryIds.length) {
    throw new Error('One or more selected secondary contact records could not be found.');
  }

  // Count reassignable lead contacts
  const leadContactsCountRes = await db.query(`
    SELECT COUNT(*)::int AS count 
    FROM lead_contacts 
    WHERE contact_id = ANY($1) AND contact_id != $2
  `, [secondaryIds, masterId]);
  const reassignedLeadContactsCount = leadContactsCountRes.rows[0]?.count || 0;

  const fields = [
    'contact_name', 'comp_email', 'email', 'contact_phone', 'phone', 'contact_mobile', 'mobile',
    'designation', 'pos_type', 'country', 'linkedin_url', 'company_id', 'comp_id',
    'preferred_linkedin_connected', 'contactstatus', 'salesperson', 'source', 'remark'
  ];

  const mergedValues = {};
  fields.forEach(field => {
    if (fieldOverrides[field] !== undefined && fieldOverrides[field] !== null && String(fieldOverrides[field]).trim() !== '') {
      mergedValues[field] = fieldOverrides[field];
    } else if (masterRecord[field] !== undefined && masterRecord[field] !== null && String(masterRecord[field]).trim() !== '') {
      mergedValues[field] = masterRecord[field];
    } else {
      const secVal = secondaryRecords.find(s => s[field] && String(s[field]).trim() !== '');
      mergedValues[field] = secVal ? secVal[field] : (masterRecord[field] || '');
    }
  });

  return {
    success: true,
    masterRecord,
    secondaryRecords,
    mergedValues,
    reassignedLeadContactsCount,
  };
}

/**
 * Execute Atomic Company Merge
 */
async function executeCompanyMerge({ masterId, secondaryIds = [], fieldOverrides = {}, mergedBy = 'admin', notes = '' }) {
  // Safety checks
  if (!masterId) throw new Error('Master Company ID is required.');
  if (!Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    throw new Error('At least one secondary company ID must be provided.');
  }

  const conflictProtected = secondaryIds.find(id => PROTECTED_COMPANY_IDS.includes(String(id)));
  if (conflictProtected) {
    throw new Error(`Company #${conflictProtected} is a system-protected test record and cannot be deleted or merged.`);
  }

  const preview = await previewCompanyMerge({ masterId, secondaryIds, fieldOverrides });
  const { masterRecord, secondaryRecords, mergedValues, reassignedContactsCount, reassignedLeadsCount } = preview;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Update master record with chosen merged values
    await client.query(`
      UPDATE companies SET
        comp_name = $1,
        name = $1,
        website = $2,
        com_email = $3,
        email = $3,
        companyphone = $4,
        phone = $4,
        country = $5,
        city = $6,
        industry = $7,
        company_type = $8,
        employee_size = $9,
        company_categories = $10,
        registration_status = $11,
        technology = $12,
        source = $13,
        remark = $14,
        remarks = $14,
        modified_by = $15,
        modified_date = TO_CHAR(NOW(), 'DD/MM/YYYY'),
        updated_at = NOW()
      WHERE id = $16
    `, [
      mergedValues.comp_name || masterRecord.comp_name || masterRecord.name,
      mergedValues.website || null,
      mergedValues.com_email || mergedValues.email || null,
      mergedValues.companyphone || mergedValues.phone || null,
      mergedValues.country || null,
      mergedValues.city || null,
      mergedValues.industry || null,
      mergedValues.company_type || 'Direct Client',
      mergedValues.employee_size || null,
      mergedValues.company_categories || null,
      mergedValues.registration_status || null,
      mergedValues.technology || null,
      mergedValues.source || null,
      mergedValues.remarks || null,
      mergedBy || 'admin',
      masterId
    ]);

    // 2. Reassign Contacts from secondaries to master
    const masterName = mergedValues.comp_name || masterRecord.comp_name || masterRecord.name;
    await client.query(`
      UPDATE contacts SET
        company_id = $1,
        comp_id = $1,
        company_name = $2,
        comp_name = $2
      WHERE company_id = ANY($3) OR comp_id = ANY($3)
    `, [masterId, masterName, secondaryIds]);

    // 3. Reassign Leads from secondaries to master
    await client.query(`
      UPDATE leads SET
        company_id = $1,
        company_name = $2
      WHERE company_id = ANY($3)
    `, [masterId, masterName, secondaryIds]);

    // 4. Update contact_count and lead_count on master
    await client.query(`
      UPDATE companies SET
        contact_count = (SELECT COUNT(*)::int FROM contacts WHERE company_id = $1 OR comp_id = $1),
        lead_count = (SELECT COUNT(*)::int FROM leads WHERE company_id = $1)
      WHERE id = $1
    `, [masterId]);

    // 5. Delete secondary records (after creating snapshot for APEX-grade audit/backup)
    const backupRecords = secondaryRecords.map(s => ({
      ...s,
      merge_role: 'OLD_DELETED',
      merged_into_id: masterId,
      backup_timestamp: new Date().toISOString()
    }));

    await client.query(`
      DELETE FROM companies WHERE id = ANY($1)
    `, [secondaryIds]);

    // 6. Record in merge_history with full APEX-compliant backup and mapping
    const mergedNames = secondaryRecords.map(s => s.comp_name || s.name || `Company #${s.id}`);
    const auditPayload = {
      mergedValues,
      backupRecords,
      mapping: secondaryIds.map(secId => ({
        old_id: secId,
        new_id: masterId,
        match_rule: notes || 'Manual Duplicate Merge'
      }))
    };

    await client.query(`
      INSERT INTO merge_history (
        entity_type,
        master_id,
        merged_ids,
        master_name,
        merged_names,
        match_rule,
        reassigned_contacts_count,
        reassigned_leads_count,
        field_changes,
        merged_by,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      'company',
      masterId,
      secondaryIds,
      masterName,
      mergedNames,
      notes || 'Manual Duplicate Merge',
      reassignedContactsCount,
      reassignedLeadsCount,
      JSON.stringify(auditPayload),
      mergedBy || 'admin',
      'SUCCESS',
      `Merged ${secondaryIds.length} duplicate company record(s) into Master #${masterId}.`
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      masterId,
      mergedIds: secondaryIds,
      masterName,
      reassignedContactsCount,
      reassignedLeadsCount,
      message: `Successfully merged ${secondaryIds.length} company record(s) into Master #${masterId} (${masterName}).`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute Atomic Contact Merge
 */
async function executeContactMerge({ masterId, secondaryIds = [], fieldOverrides = {}, mergedBy = 'admin', notes = '' }) {
  if (!masterId) throw new Error('Master Contact ID is required.');
  if (!Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    throw new Error('At least one secondary contact ID must be provided.');
  }

  const preview = await previewContactMerge({ masterId, secondaryIds, fieldOverrides });
  const { masterRecord, secondaryRecords, mergedValues, reassignedLeadContactsCount } = preview;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Update master contact
    await client.query(`
      UPDATE contacts SET
        contact_name = $1,
        comp_email = $2,
        email = $2,
        contact_phone = $3,
        phone = $3,
        contact_mobile = $4,
        mobile = $4,
        designation = $5,
        pos_type = $6,
        country = $7,
        linkedin_url = $8,
        company_id = $9,
        comp_id = $9,
        preferred_linkedin_connected = $10,
        contactstatus = $11,
        salesperson = $12,
        source = $13,
        remark = $14,
        modified_by = $15,
        modified_date = TO_CHAR(NOW(), 'DD/MM/YYYY'),
        updated_at = NOW()
      WHERE id = $16
    `, [
      mergedValues.contact_name || masterRecord.contact_name,
      mergedValues.comp_email || mergedValues.email || null,
      mergedValues.contact_phone || mergedValues.phone || null,
      mergedValues.contact_mobile || mergedValues.mobile || null,
      mergedValues.designation || null,
      mergedValues.pos_type || null,
      mergedValues.country || null,
      mergedValues.linkedin_url || null,
      mergedValues.company_id || masterRecord.company_id || null,
      mergedValues.preferred_linkedin_connected || null,
      mergedValues.contactstatus || null,
      mergedValues.salesperson || null,
      mergedValues.source || null,
      mergedValues.remark || null,
      mergedBy || 'admin',
      masterId
    ]);

    // 2. Reassign lead contacts
    await client.query(`
      UPDATE lead_contacts SET
        contact_id = $1
      WHERE contact_id = ANY($2)
    `, [masterId, secondaryIds]);

    // 3. Delete secondary contacts (after creating snapshot for APEX-grade audit/backup)
    const backupRecords = secondaryRecords.map(s => ({
      ...s,
      merge_role: 'OLD_DELETED',
      merged_into_id: masterId,
      backup_timestamp: new Date().toISOString()
    }));

    await client.query(`
      DELETE FROM contacts WHERE id = ANY($1)
    `, [secondaryIds]);

    // 4. Update contact_count on affected parent companies
    const parentCompanyIds = Array.from(new Set([
      masterRecord.company_id,
      ...secondaryRecords.map(s => s.company_id)
    ].filter(Boolean)));

    if (parentCompanyIds.length > 0) {
      await client.query(`
        UPDATE companies SET
          contact_count = (SELECT COUNT(*)::int FROM contacts WHERE company_id = companies.id OR comp_id = companies.id)
        WHERE id = ANY($1)
      `, [parentCompanyIds]);
    }

    // 5. Record in merge_history with full APEX-compliant backup and mapping
    const mergedNames = secondaryRecords.map(s => s.contact_name || `Contact #${s.id}`);
    const masterName = mergedValues.contact_name || masterRecord.contact_name;
    const auditPayload = {
      mergedValues,
      backupRecords,
      mapping: secondaryIds.map(secId => ({
        old_id: secId,
        new_id: masterId,
        slug: masterRecord.linkedin_url ? masterRecord.linkedin_url.replace(/^.*\/in\//i, '').replace(/\/.*$/, '') : '',
        match_rule: notes || 'Manual Duplicate Contact Merge'
      }))
    };

    await client.query(`
      INSERT INTO merge_history (
        entity_type,
        master_id,
        merged_ids,
        master_name,
        merged_names,
        match_rule,
        reassigned_contacts_count,
        reassigned_leads_count,
        reassigned_lead_contacts_count,
        field_changes,
        merged_by,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      'contact',
      masterId,
      secondaryIds,
      masterName,
      mergedNames,
      notes || 'Manual Duplicate Contact Merge',
      0,
      0,
      reassignedLeadContactsCount,
      JSON.stringify(auditPayload),
      mergedBy || 'admin',
      'SUCCESS',
      `Merged ${secondaryIds.length} duplicate contact record(s) into Master #${masterId}.`
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      masterId,
      mergedIds: secondaryIds,
      masterName,
      reassignedLeadContactsCount,
      message: `Successfully merged ${secondaryIds.length} contact record(s) into Master #${masterId} (${masterName}).`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fetch merge history audit records
 */
async function getMergeHistory({ entityType, page = 1, limit = 50 }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClause = '';
  const params = [];
  if (entityType && entityType !== 'all') {
    params.push(entityType);
    whereClause = `WHERE entity_type = $${params.length}`;
  }

  const countSql = `SELECT COUNT(*)::int AS total FROM merge_history ${whereClause}`;
  const countRes = await db.query(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  params.push(parsedLimit);
  params.push(offset);
  const dataSql = `
    SELECT * 
    FROM merge_history 
    ${whereClause}
    ORDER BY id DESC 
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const dataRes = await db.query(dataSql, params);

  return {
    history: dataRes.rows,
    total,
    page: parsedPage,
    limit: parsedLimit
  };
}

/**
 * Restore/Rollback a merged record using the backup snapshots
 * Implements APEX-grade recovery corresponding to RESTORE_STG tables
 */
async function restoreMerge({ historyId, restoredBy = 'admin' }) {
  if (!historyId) throw new Error('Merge History ID is required for restoration.');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const histRes = await client.query(`SELECT * FROM merge_history WHERE id = $1`, [historyId]);
    if (histRes.rows.length === 0) {
      throw new Error(`Merge audit record #${historyId} was not found.`);
    }

    const record = histRes.rows[0];
    if (record.status === 'RESTORED') {
      throw new Error(`Merge record #${historyId} has already been restored.`);
    }

    const fieldChanges = typeof record.field_changes === 'string'
      ? JSON.parse(record.field_changes)
      : (record.field_changes || {});
    const backupRecords = fieldChanges.backupRecords || [];

    if (backupRecords.length === 0) {
      throw new Error(`No backup records found in audit log #${historyId} to restore.`);
    }

    if (record.entity_type === 'company') {
      for (const comp of backupRecords) {
        await client.query(`
          INSERT INTO companies (
            id, comp_name, name, website, com_email, email, companyphone, phone,
            country, city, industry, company_type, employee_size, company_categories,
            registration_status, technology, source, remark, remarks,
            created_by, created_date, modified_by, modified_date, created_at, updated_at
          ) VALUES (
            $1, $2, $2, $3, $4, $4, $5, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $15,
            $16, $17, $18, TO_CHAR(NOW(), 'DD/MM/YYYY'), NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            comp_name = EXCLUDED.comp_name,
            name = EXCLUDED.name,
            website = EXCLUDED.website,
            updated_at = NOW()
        `, [
          comp.id, comp.comp_name || comp.name, comp.website, comp.com_email || comp.email,
          comp.companyphone || comp.phone, comp.country, comp.city, comp.industry,
          comp.company_type || 'Direct Client', comp.employee_size, comp.company_categories,
          comp.registration_status, comp.technology, comp.source, comp.remark || comp.remarks,
          comp.created_by || 'system', comp.created_date || TO_CHAR(NOW(), 'DD/MM/YYYY'),
          restoredBy
        ]);
      }
    } else if (record.entity_type === 'contact') {
      for (const ct of backupRecords) {
        await client.query(`
          INSERT INTO contacts (
            id, comp_id, company_id, comp_name, company_name, contact_name,
            designation, pos_type, country, comp_email, email, contact_phone, phone,
            contact_mobile, mobile, linkedin_url, preferred_linkedin_connected,
            contactstatus, salesperson, source, remark, remarks,
            created_by, created_date, modified_by, modified_date, created_at, updated_at
          ) VALUES (
            $1, $2, $2, $3, $3, $4,
            $5, $6, $7, $8, $8, $9, $9,
            $10, $10, $11, $12,
            $13, $14, $15, $16, $16,
            $17, $18, $19, TO_CHAR(NOW(), 'DD/MM/YYYY'), NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            contact_name = EXCLUDED.contact_name,
            updated_at = NOW()
        `, [
          ct.id, ct.comp_id || ct.company_id, ct.comp_name || ct.company_name, ct.contact_name,
          ct.designation, ct.pos_type, ct.country, ct.comp_email || ct.email,
          ct.contact_phone || ct.phone, ct.contact_mobile || ct.mobile,
          ct.linkedin_url, ct.preferred_linkedin_connected, ct.contactstatus,
          ct.salesperson, ct.source, ct.remark || ct.remarks,
          ct.created_by || 'system', ct.created_date || TO_CHAR(NOW(), 'DD/MM/YYYY'),
          restoredBy
        ]);
      }
    }

    await client.query(`
      UPDATE merge_history SET
        status = 'RESTORED',
        notes = COALESCE(notes, '') || ' [Restored by ' || $1 || ' on ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') || ']'
      WHERE id = $2
    `, [restoredBy, historyId]);

    await client.query('COMMIT');
    return {
      success: true,
      historyId,
      entityType: record.entity_type,
      restoredIds: record.merged_ids,
      message: `Successfully restored ${record.merged_ids.length} record(s) from merge audit #${historyId}.`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get flattened duplicate company report records (matching APEX CRM.DUPLICATE_COMPANY_REPORT)
 */
async function getDuplicateCompanyReport({ search = '', page = 1, limit = 50 } = {}) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const offset = (parsedPage - 1) * parsedLimit;

  let baseSql = `
    WITH contact_counts AS (
      SELECT comp_id, COUNT(*)::int AS live_contact_count
      FROM   contacts
      WHERE  comp_id IS NOT NULL
      GROUP BY comp_id
    ),
    base AS (
      SELECT c.*,
             NULLIF(COALESCE(c.normalized_website,
               LOWER(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(TRIM(COALESCE(c.website, ''))),
                     '^(https?://)?(www\\.)?', ''), '[^a-z0-9]', '', 'g'))), '') AS w_key,
             COALESCE(NULLIF(UPPER(TRIM(c.comp_name)), ''), '__BLANK__') AS k_name,
             COALESCE(cc.live_contact_count, 0) AS live_contact_count
      FROM   companies c
      LEFT JOIN contact_counts cc ON cc.comp_id = c.id
    ),
    keys AS (
      SELECT b.*,
             CASE WHEN w_key IS NOT NULL AND w_key != ''
                  THEN COUNT(*) OVER (PARTITION BY w_key) END AS w_cnt,
             CASE WHEN w_key IS NULL OR w_key = ''
                  THEN COUNT(*) OVER (PARTITION BY k_name) END AS n_cnt
      FROM   base b
    ),
    dup AS (
      SELECT k.*,
             CASE
               WHEN k.w_key IS NOT NULL AND k.w_key != '' AND k.w_cnt > 1 THEN 'WEBSITE'
               WHEN (k.w_key IS NULL OR k.w_key = '')     AND k.n_cnt > 1 THEN 'COMPANY NAME'
             END AS duplicate_type
      FROM   keys k
    )
    SELECT d.id,
           d.id                 AS company_id,
           d.comp_name,
           d.comp_name          AS company_name,
           d.technology,
           d.country,
           d.existingcomp,
           d.companyphone,
           d.company_categories,
           d.company_type,
           d.registered_url,
           d.registration_status,
           d.supplier_number,
           d.username,
           d.password,
           d.registration_date,
           d.industry,
           d.city,
           d.website,
           d.da,
           d.com_email,
           d.remark,
           d.employee_size,
           d.created_by,
           d.created_date,
           d.modified_by,
           d.modified_date,
           d.salesperson,
           d.prev_salesperson,
           d.joget_id,
           d.contacts_count,
           d.lead_count,
           d.source,
           d.normalized_website,
           d.live_contact_count AS contact_count,
           d.duplicate_type,
           'View Form'          AS view_form
    FROM   dup d
    WHERE  d.duplicate_type IS NOT NULL
  `;

  const params = [];
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    baseSql += `
      AND (
        d.id::text ILIKE $1
        OR d.comp_name ILIKE $1
        OR COALESCE(d.website, '') ILIKE $1
        OR COALESCE(d.country, '') ILIKE $1
        OR COALESCE(d.city, '') ILIKE $1
        OR COALESCE(d.industry, '') ILIKE $1
        OR COALESCE(d.technology, '') ILIKE $1
        OR d.duplicate_type ILIKE $1
      )
    `;
  }

  const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM (${baseSql}) count_sub`, params);
  const total = countRes.rows[0]?.total || 0;

  const dataSql = `${baseSql} ORDER BY d.comp_name ASC, d.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parsedLimit, offset);
  const dataRes = await db.query(dataSql, params);

  return {
    data: dataRes.rows,
    total,
    page: parsedPage,
    limit: parsedLimit,
  };
}

/**
 * Get flattened duplicate contact report records (matching APEX CRM.DUPLICATE_CONTACT_REPORT)
 */
async function getDuplicateContactReport({ search = '', page = 1, limit = 50 } = {}) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const offset = (parsedPage - 1) * parsedLimit;

  let baseSql = `
    WITH contact_norm AS (
        SELECT c.*,
            CASE WHEN c.linkedin_url ~* 'linkedin\\.com/'
                THEN RTRIM(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(TRIM(c.linkedin_url)), '^https?://(www\\.)?', ''), '[?#].*$', ''), '/')
            END AS linkedin_key,
            CASE WHEN TRIM(COALESCE(c.comp_email, c.email)) ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
                THEN LOWER(TRIM(COALESCE(c.comp_email, c.email)))
            END AS email_key,
            CASE WHEN TRIM(COALESCE(c.contact_name, '')) != '' AND TRIM(COALESCE(c.comp_name, '')) != ''
                THEN TRIM(REGEXP_REPLACE(UPPER(c.contact_name), '[^A-Z0-9]+', ' ', 'g')) || '|' ||
                     TRIM(REGEXP_REPLACE(UPPER(c.comp_name), '[^A-Z0-9]+', ' ', 'g'))
            END AS name_comp_key
        FROM contacts c
    ),
    contact_match AS (
        SELECT cn.*,
            CASE WHEN cn.linkedin_key IS NOT NULL THEN 'LINKEDIN URL'
                 WHEN cn.email_key IS NOT NULL THEN 'EMAIL'
                 WHEN cn.name_comp_key IS NOT NULL THEN 'CONTACT NAME + COMPANY'
            END AS duplicate_type,
            CASE WHEN cn.linkedin_key IS NOT NULL OR cn.email_key IS NOT NULL THEN 'CONFIRMED'
                 WHEN cn.name_comp_key IS NOT NULL THEN 'POSSIBLE'
            END AS match_confidence,
            COALESCE(cn.linkedin_key, cn.email_key, cn.name_comp_key) AS match_key
        FROM contact_norm cn
    ),
    contact_dups AS (
        SELECT cm.*,
            COUNT(*) OVER (PARTITION BY cm.duplicate_type, cm.match_key) AS duplicate_count,
            DENSE_RANK() OVER (ORDER BY cm.duplicate_type, cm.match_key) AS duplicate_group_id,
            ROW_NUMBER() OVER (PARTITION BY cm.duplicate_type, cm.match_key
                               ORDER BY cm.created_date, cm.id) AS row_in_group
        FROM contact_match cm
        WHERE cm.match_key IS NOT NULL
    )
    SELECT cd.id,
           cd.id AS contact_id,
           cd.comp_id,
           cd.company_id,
           cd.comp_name,
           cd.comp_name AS company_name,
           cd.contact_name,
           cd.designation,
           cd.pos_type,
           cd.pos_type AS position_type,
           cd.country,
           COALESCE(cd.comp_email, cd.email) AS email,
           COALESCE(cd.contact_phone, cd.phone) AS phone,
           COALESCE(cd.contact_mobile, cd.mobile) AS mobile,
           cd.linkedin_url,
           cd.preferred_linkedin_connected,
           cd.contactstatus,
           cd.salesperson,
           cd.source,
           cd.remark,
           cd.created_by,
           cd.created_date,
           cd.duplicate_type,
           cd.match_confidence,
           cd.match_key,
           cd.duplicate_count,
           cd.duplicate_group_id,
           cd.row_in_group,
           CASE WHEN cd.row_in_group = 1 THEN 'YES' ELSE 'NO' END AS suggested_keeper,
           'View Form' AS view_form
    FROM   contact_dups cd
    WHERE  cd.duplicate_count > 1
  `;

  const params = [];
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    baseSql += `
      AND (
        cd.id::text ILIKE $1
        OR cd.contact_name ILIKE $1
        OR COALESCE(cd.comp_name, '') ILIKE $1
        OR COALESCE(cd.comp_email, cd.email, '') ILIKE $1
        OR COALESCE(cd.designation, '') ILIKE $1
        OR COALESCE(cd.pos_type, '') ILIKE $1
        OR COALESCE(cd.country, '') ILIKE $1
        OR cd.duplicate_type ILIKE $1
      )
    `;
  }

  const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM (${baseSql}) count_sub`, params);
  const total = countRes.rows[0]?.total || 0;

  const dataSql = `${baseSql} ORDER BY cd.duplicate_group_id ASC, cd.row_in_group ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parsedLimit, offset);
  const dataRes = await db.query(dataSql, params);

  return {
    data: dataRes.rows,
    total,
    page: parsedPage,
    limit: parsedLimit,
  };
}

/**
 * Fetch a single company record by ID
 */
async function getCompanyById(id) {
  if (!id) return null;
  const res = await db.query(`
    SELECT c.*,
           (SELECT COUNT(*)::int FROM contacts WHERE comp_id = c.id OR company_id = c.id) AS contact_count
    FROM companies c
    WHERE c.id = $1
  `, [String(id)]);
  return res.rows[0] || null;
}

/**
 * Fetch a single contact record by ID
 */
async function getContactById(id) {
  if (!id) return null;
  const res = await db.query(`
    SELECT c.*
    FROM contacts c
    WHERE c.id = $1
  `, [String(id)]);
  return res.rows[0] || null;
}

/**
 * Merge two company records (Original/Parent + Duplicate/Child)
 * Exact Rule:
 * "if the parent record has the data in it for the same column it will pass i.e. it will not do the change in that column
 * but when the parent column is empty and the child column has some value it should get merge in the parent one"
 */
async function mergePairCompanies({ originalId, duplicateId, mergedBy = 'admin', notes = '' }) {
  if (!originalId || !duplicateId) {
    throw new Error('Both Original Company ID and Duplicate Company ID are required.');
  }
  if (String(originalId) === String(duplicateId)) {
    throw new Error('Original and Duplicate company cannot be the same record.');
  }
  if (PROTECTED_COMPANY_IDS.includes(String(duplicateId))) {
    throw new Error(`Company #${duplicateId} is a system-protected test record and cannot be merged.`);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const pRes = await client.query('SELECT * FROM companies WHERE id = $1 FOR UPDATE', [originalId]);
    const dRes = await client.query('SELECT * FROM companies WHERE id = $1 FOR UPDATE', [duplicateId]);

    if (pRes.rows.length === 0) throw new Error(`Original Company #${originalId} does not exist.`);
    if (dRes.rows.length === 0) throw new Error(`Duplicate Company #${duplicateId} does not exist.`);

    const parent = pRes.rows[0];
    const duplicate = dRes.rows[0];

    const isValEmpty = (val) => val === null || val === undefined || String(val).trim() === '' || String(val).trim() === '-';

    const mergedValues = { ...parent };
    const fieldChanges = {};

    for (const key of Object.keys(parent)) {
      if (['id', 'created_by', 'created_date', 'created_at', 'contact_count', 'lead_count', 'contacts_count'].includes(key)) continue;
      if (isValEmpty(parent[key]) && !isValEmpty(duplicate[key])) {
        mergedValues[key] = duplicate[key];
        fieldChanges[key] = { from: parent[key], to: duplicate[key] };
      }
    }

    // Keep name aliases in sync
    if (mergedValues.comp_name) mergedValues.name = mergedValues.comp_name;
    if (mergedValues.com_email) mergedValues.email = mergedValues.com_email;
    if (mergedValues.companyphone) mergedValues.phone = mergedValues.companyphone;
    if (mergedValues.remark) mergedValues.remarks = mergedValues.remark;
    if (mergedValues.existingcomp) mergedValues.existing_comp = mergedValues.existingcomp;

    // Update parent company
    await client.query(`
      UPDATE companies SET
        comp_name = $1,
        name = $1,
        website = $2,
        com_email = $3,
        email = $3,
        companyphone = $4,
        phone = $4,
        country = $5,
        city = $6,
        industry = $7,
        company_type = $8,
        employee_size = $9,
        company_categories = $10,
        registration_status = $11,
        technology = $12,
        source = $13,
        remark = $14,
        remarks = $14,
        registered_url = $15,
        supplier_number = $16,
        username = $17,
        password = $18,
        registration_date = $19,
        da = $20,
        salesperson = $21,
        prev_salesperson = $22,
        joget_id = $23,
        normalized_website = $24,
        modified_by = $25,
        modified_date = TO_CHAR(NOW(), 'DD/MM/YYYY'),
        updated_at = NOW()
      WHERE id = $26
    `, [
      mergedValues.comp_name,
      mergedValues.website || null,
      mergedValues.com_email || null,
      mergedValues.companyphone || null,
      mergedValues.country || null,
      mergedValues.city || null,
      mergedValues.industry || null,
      mergedValues.company_type || 'Direct Client',
      mergedValues.employee_size || null,
      mergedValues.company_categories || null,
      mergedValues.registration_status || null,
      mergedValues.technology || null,
      mergedValues.source || null,
      mergedValues.remark || null,
      mergedValues.registered_url || null,
      mergedValues.supplier_number || null,
      mergedValues.username || null,
      mergedValues.password || null,
      mergedValues.registration_date || null,
      mergedValues.da || null,
      mergedValues.salesperson || null,
      mergedValues.prev_salesperson || null,
      mergedValues.joget_id || null,
      mergedValues.normalized_website || null,
      mergedBy || 'admin',
      originalId
    ]);

    const parentName = mergedValues.comp_name || parent.comp_name;

    // Reassign child contacts from duplicate to parent
    await client.query(`
      UPDATE contacts SET
        company_id = $1,
        comp_id = $1,
        company_name = $2,
        comp_name = $2
      WHERE company_id = $3 OR comp_id = $3
    `, [originalId, parentName, duplicateId]);

    // Reassign child leads from duplicate to parent
    await client.query(`
      UPDATE leads SET
        company_id = $1,
        company_name = $2
      WHERE company_id = $3
    `, [originalId, parentName, duplicateId]);

    // Recalculate contact count and lead count on parent
    await client.query(`
      UPDATE companies SET
        contact_count = (SELECT COUNT(*)::int FROM contacts WHERE company_id = $1 OR comp_id = $1),
        contacts_count = (SELECT COUNT(*)::int FROM contacts WHERE company_id = $1 OR comp_id = $1),
        lead_count = (SELECT COUNT(*)::int FROM leads WHERE company_id = $1)
      WHERE id = $1
    `, [originalId]);

    // Save full snapshot in merge_history
    const backupRecords = [
      { ...duplicate, merge_role: 'OLD_DELETED', merged_into_id: originalId, backup_timestamp: new Date().toISOString() },
      { ...parent, merge_role: 'ORIGINAL_BEFORE_MERGE', backup_timestamp: new Date().toISOString() }
    ];

    await client.query(`
      INSERT INTO merge_history (
        entity_type, master_id, merged_ids, master_name, merged_names, field_changes, merged_by, created_by, notes, status
      ) VALUES (
        'company', $1, $2, $3, $4, $5, $6, $6, $7, 'MERGED'
      )
    `, [
      originalId,
      [duplicateId],
      parentName,
      [duplicate.comp_name || duplicate.name || `Company #${duplicateId}`],
      JSON.stringify({ fieldChanges, backupRecords }),
      mergedBy || 'admin',
      notes || `Merged duplicate company #${duplicateId} into original #${originalId}`
    ]);

    // Delete duplicate company record
    await client.query('DELETE FROM companies WHERE id = $1', [duplicateId]);

    await client.query('COMMIT');

    const updatedRes = await client.query('SELECT * FROM companies WHERE id = $1', [originalId]);

    return {
      success: true,
      masterId: originalId,
      deletedId: duplicateId,
      updatedRecord: updatedRes.rows[0],
      fieldChanges,
      message: `Duplicate company #${duplicateId} merged into original #${originalId} successfully.`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Merge two contact records (Original/Parent + Duplicate/Child)
 * Exact Rule:
 * "if the parent record has the data in it for the same column it will pass i.e. it will not do the change in that column
 * but when the parent column is empty and the child column has some value it should get merge in the parent one"
 */
async function mergePairContacts({ originalId, duplicateId, mergedBy = 'admin', notes = '' }) {
  if (!originalId || !duplicateId) {
    throw new Error('Both Original Contact ID and Duplicate Contact ID are required.');
  }
  if (String(originalId) === String(duplicateId)) {
    throw new Error('Original and Duplicate contact cannot be the same record.');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const pRes = await client.query('SELECT * FROM contacts WHERE id = $1 FOR UPDATE', [originalId]);
    const dRes = await client.query('SELECT * FROM contacts WHERE id = $1 FOR UPDATE', [duplicateId]);

    if (pRes.rows.length === 0) throw new Error(`Original Contact #${originalId} does not exist.`);
    if (dRes.rows.length === 0) throw new Error(`Duplicate Contact #${duplicateId} does not exist.`);

    const parent = pRes.rows[0];
    const duplicate = dRes.rows[0];

    const isValEmpty = (val) => val === null || val === undefined || String(val).trim() === '' || String(val).trim() === '-';

    const mergedValues = { ...parent };
    const fieldChanges = {};

    for (const key of Object.keys(parent)) {
      if (['id', 'created_by', 'created_date', 'created_at'].includes(key)) continue;
      if (isValEmpty(parent[key]) && !isValEmpty(duplicate[key])) {
        mergedValues[key] = duplicate[key];
        fieldChanges[key] = { from: parent[key], to: duplicate[key] };
      }
    }

    // Keep aliases in sync
    if (mergedValues.comp_email) mergedValues.email = mergedValues.comp_email;
    if (mergedValues.contact_phone) mergedValues.phone = mergedValues.contact_phone;
    if (mergedValues.contact_mobile) mergedValues.mobile = mergedValues.contact_mobile;
    if (mergedValues.remark) mergedValues.remarks = mergedValues.remark;
    if (mergedValues.pos_type) mergedValues.position_type = mergedValues.pos_type;
    if (mergedValues.contactstatus) mergedValues.contact_status = mergedValues.contactstatus;

    // Update parent contact
    await client.query(`
      UPDATE contacts SET
        comp_id = $1,
        company_id = $1,
        comp_name = $2,
        company_name = $2,
        contact_name = $3,
        designation = $4,
        pos_type = $5,
        position_type = $5,
        country = $6,
        comp_email = $7,
        email = $7,
        contact_phone = $8,
        phone = $8,
        contact_mobile = $9,
        mobile = $9,
        linkedin_url = $10,
        preferred_linkedin_connected = $11,
        contactstatus = $12,
        contact_status = $12,
        salesperson = $13,
        source = $14,
        remark = $15,
        remarks = $15,
        priority_contact = $16,
        other_email = $17,
        comp_email_verified = $18,
        mobile_verified = $19,
        linkedin_conn_send_acc = $20,
        connection_date = $21,
        data_extracted = $22,
        linkedin_cnnctd_acc = $23,
        current_past = $24,
        email_tool_verified = $25,
        email_verified_by_response = $26,
        source_details = $27,
        connection_send_by = $28,
        website = $29,
        industry = $30,
        technology = $31,
        modified_by = $32,
        modified_date = TO_CHAR(NOW(), 'DD/MM/YYYY'),
        updated_at = NOW()
      WHERE id = $33
    `, [
      mergedValues.comp_id || mergedValues.company_id || null,
      mergedValues.comp_name || mergedValues.company_name || null,
      mergedValues.contact_name,
      mergedValues.designation || null,
      mergedValues.pos_type || null,
      mergedValues.country || null,
      mergedValues.comp_email || null,
      mergedValues.contact_phone || null,
      mergedValues.contact_mobile || null,
      mergedValues.linkedin_url || null,
      mergedValues.preferred_linkedin_connected || null,
      mergedValues.contactstatus || null,
      mergedValues.salesperson || null,
      mergedValues.source || null,
      mergedValues.remark || null,
      mergedValues.priority_contact || null,
      mergedValues.other_email || null,
      mergedValues.comp_email_verified || null,
      mergedValues.mobile_verified || null,
      mergedValues.linkedin_conn_send_acc || null,
      mergedValues.connection_date || null,
      mergedValues.data_extracted || null,
      mergedValues.linkedin_cnnctd_acc || null,
      mergedValues.current_past || null,
      mergedValues.email_tool_verified || null,
      mergedValues.email_verified_by_response || null,
      mergedValues.source_details || null,
      mergedValues.connection_send_by || null,
      mergedValues.website || null,
      mergedValues.industry || null,
      mergedValues.technology || null,
      mergedBy || 'admin',
      originalId
    ]);

    // Reassign leads pointing to duplicate contact to parent contact
    await client.query(`
      UPDATE leads SET
        contact_id = $1,
        contact_name = $2
      WHERE contact_id = $3
    `, [originalId, mergedValues.contact_name || parent.contact_name, duplicateId]);

    // Save full snapshot in merge_history
    const backupRecords = [
      { ...duplicate, merge_role: 'OLD_DELETED', merged_into_id: originalId, backup_timestamp: new Date().toISOString() },
      { ...parent, merge_role: 'ORIGINAL_BEFORE_MERGE', backup_timestamp: new Date().toISOString() }
    ];

    await client.query(`
      INSERT INTO merge_history (
        entity_type, master_id, merged_ids, master_name, merged_names, field_changes, merged_by, created_by, notes, status
      ) VALUES (
        'contact', $1, $2, $3, $4, $5, $6, $6, $7, 'MERGED'
      )
    `, [
      originalId,
      [duplicateId],
      mergedValues.contact_name || parent.contact_name,
      [duplicate.contact_name || `Contact #${duplicateId}`],
      JSON.stringify({ fieldChanges, backupRecords }),
      mergedBy || 'admin',
      notes || `Merged duplicate contact #${duplicateId} into original #${originalId}`
    ]);

    // Delete duplicate contact
    await client.query('DELETE FROM contacts WHERE id = $1', [duplicateId]);

    await client.query('COMMIT');

    const updatedRes = await client.query('SELECT * FROM contacts WHERE id = $1', [originalId]);

    return {
      success: true,
      masterId: originalId,
      deletedId: duplicateId,
      updatedRecord: updatedRes.rows[0],
      fieldChanges,
      message: `Duplicate contact #${duplicateId} merged into original #${originalId} successfully.`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findCompanyDuplicates,
  findContactDuplicates,
  getDuplicateCompanyReport,
  getDuplicateContactReport,
  getCompanyById,
  getContactById,
  mergePairCompanies,
  mergePairContacts,
  previewCompanyMerge,
  previewContactMerge,
  executeCompanyMerge,
  executeContactMerge,
  getMergeHistory,
  restoreMerge,
  normalizeDomain,
  normalizeLinkedIn
};

