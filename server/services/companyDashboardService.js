const db = require('../db/pool');

/**
 * Service for Company Dashboard (modeled after APEX Application 136 Page 74).
 * Strictly queries the local PostgreSQL database (crm_db) containing ~1,000 records.
 */

function hasValue(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === '' || s === '-' || s === 'all' || s === '(select all)') return false;
    return true;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return false;
    if (val.length === 1 && (val[0].toLowerCase() === 'all' || val[0].toLowerCase() === '(select all)' || val[0] === '')) return false;
    return true;
  }
  return true;
}

function isBlankKeyword(s) {
  if (!s) return false;
  const l = String(s).trim().toLowerCase();
  return l === '(blanks)' || l === '(blank)' || l === 'blanks' || l === 'blank' || l === '__blank__';
}

/**
 * Single-column Excel Filter Clause builder
 * Handles:
 * - (Select All) -> no filter
 * - (Blanks) -> NULL or empty or '-'
 * - Multiple checked values -> ANY($p)
 * - Both (Blanks) and checked values -> ANY($p) OR NULL/empty
 */
function buildExcelFilter(expr, val, addParam) {
  if (!hasValue(val)) return null;

  let arr = Array.isArray(val) ? val : [val];
  arr = arr.map(v => String(v).trim()).filter(v => v !== '' && v !== '-');
  if (arr.length === 0) return null;

  const hasSelectAll = arr.some(v => v.toLowerCase() === '(select all)' || v.toLowerCase() === 'all');
  if (hasSelectAll && arr.length === 1) return null;

  const hasBlank = arr.some(isBlankKeyword);
  const nonBlankValues = arr.filter(v => !isBlankKeyword(v) && v.toLowerCase() !== '(select all)' && v.toLowerCase() !== 'all');

  const blankCondition = `(${expr} IS NULL OR TRIM(${expr}) = '' OR TRIM(${expr}) = '-' OR LOWER(TRIM(${expr})) = 'undefined' OR LOWER(TRIM(${expr})) = 'null')`;

  if (hasBlank && nonBlankValues.length === 0) {
    return blankCondition;
  }

  if (!hasBlank && nonBlankValues.length > 0) {
    const p = addParam(nonBlankValues.map(v => v.toLowerCase()));
    return `LOWER(TRIM(COALESCE(${expr}, ''))) = ANY(${p})`;
  }

  if (hasBlank && nonBlankValues.length > 0) {
    const p = addParam(nonBlankValues.map(v => v.toLowerCase()));
    return `(LOWER(TRIM(COALESCE(${expr}, ''))) = ANY(${p}) OR ${blankCondition})`;
  }

  return null;
}

/**
 * Dual-column Excel Filter Clause builder (e.g. co.country and ct.country)
 */
function buildExcelFilterDual(expr1, expr2, val, addParam) {
  if (!hasValue(val)) return null;

  let arr = Array.isArray(val) ? val : [val];
  arr = arr.map(v => String(v).trim()).filter(v => v !== '' && v !== '-');
  if (arr.length === 0) return null;

  const hasSelectAll = arr.some(v => v.toLowerCase() === '(select all)' || v.toLowerCase() === 'all');
  if (hasSelectAll && arr.length === 1) return null;

  const hasBlank = arr.some(isBlankKeyword);
  const nonBlankValues = arr.filter(v => !isBlankKeyword(v) && v.toLowerCase() !== '(select all)' && v.toLowerCase() !== 'all');

  const blankCondition = `(
    (${expr1} IS NULL OR TRIM(${expr1}) = '' OR TRIM(${expr1}) = '-' OR LOWER(TRIM(${expr1})) = 'undefined')
    AND (${expr2} IS NULL OR TRIM(${expr2}) = '' OR TRIM(${expr2}) = '-' OR LOWER(TRIM(${expr2})) = 'undefined')
  )`;

  if (hasBlank && nonBlankValues.length === 0) {
    return blankCondition;
  }

  if (!hasBlank && nonBlankValues.length > 0) {
    const p = addParam(nonBlankValues.map(v => v.toLowerCase()));
    return `(LOWER(TRIM(COALESCE(${expr1}, ''))) = ANY(${p}) OR LOWER(TRIM(COALESCE(${expr2}, ''))) = ANY(${p}))`;
  }

  if (hasBlank && nonBlankValues.length > 0) {
    const p = addParam(nonBlankValues.map(v => v.toLowerCase()));
    return `(
      LOWER(TRIM(COALESCE(${expr1}, ''))) = ANY(${p})
      OR LOWER(TRIM(COALESCE(${expr2}, ''))) = ANY(${p})
      OR ${blankCondition}
    )`;
  }

  return null;
}

/**
 * Excel Filter or Text Search builder (e.g. company name, contact name, website)
 */
function buildExcelOrTextFilter(expr, val, addParam) {
  if (!hasValue(val)) return null;

  if (Array.isArray(val)) {
    return buildExcelFilter(expr, val, addParam);
  }

  const str = String(val).trim();
  if (isBlankKeyword(str)) {
    return `(${expr} IS NULL OR TRIM(${expr}) = '' OR TRIM(${expr}) = '-' OR LOWER(TRIM(${expr})) = 'undefined')`;
  }

  const p = addParam(`%${str.toLowerCase()}%`);
  return `LOWER(COALESCE(${expr}, '')) LIKE ${p}`;
}

/**
 * Technology filter builder (matches multi-tech strings or exact blank)
 */
function buildTechnologyFilter(val, addParam) {
  if (!hasValue(val)) return null;

  let arr = Array.isArray(val) ? val : [val];
  arr = arr.map(v => String(v).trim()).filter(v => v !== '' && v !== '-');
  if (arr.length === 0) return null;

  const hasSelectAll = arr.some(v => v.toLowerCase() === '(select all)' || v.toLowerCase() === 'all');
  if (hasSelectAll && arr.length === 1) return null;

  const hasBlank = arr.some(isBlankKeyword);
  const nonBlankValues = arr.filter(v => !isBlankKeyword(v) && v.toLowerCase() !== '(select all)' && v.toLowerCase() !== 'all');

  const blankCond = `(
    (co.technology IS NULL OR TRIM(co.technology) = '' OR TRIM(co.technology) = '-')
    AND (ct.technology IS NULL OR TRIM(ct.technology) = '' OR TRIM(ct.technology) = '-')
  )`;

  const matchClauses = [];
  if (nonBlankValues.length > 0) {
    nonBlankValues.forEach(tech => {
      const p = addParam(`%${tech.toLowerCase()}%`);
      matchClauses.push(`(LOWER(COALESCE(co.technology, '')) LIKE ${p} OR LOWER(COALESCE(ct.technology, '')) LIKE ${p})`);
    });
  }

  if (hasBlank && matchClauses.length === 0) return blankCond;
  if (!hasBlank && matchClauses.length > 0) return `(${matchClauses.join(' OR ')})`;
  if (hasBlank && matchClauses.length > 0) return `(${matchClauses.join(' OR ')} OR ${blankCond})`;
  return null;
}

/**
 * Helper to build comprehensive parameterized WHERE clause for joined company and contact queries.
 */
function buildFilterClauses(filters = {}) {
  const where = [];
  const params = [];

  const addParam = (val) => {
    params.push(val);
    return `$${params.length}`;
  };

  // 1. Company ID
  if (hasValue(filters.company_id)) {
    if (Array.isArray(filters.company_id)) {
      const c = buildExcelFilterDual('co.id::text', 'ct.comp_id::text', filters.company_id, addParam);
      if (c) where.push(c);
    } else {
      const str = String(filters.company_id).trim();
      if (isBlankKeyword(str)) {
        where.push(`(co.id IS NULL AND ct.comp_id IS NULL)`);
      } else {
        const p = addParam(str);
        where.push(`(co.id::text = ${p} OR ct.comp_id::text = ${p})`);
      }
    }
  }

  // 2. Company Name
  const compNameClause = buildExcelOrTextFilter('COALESCE(co.comp_name, ct.comp_name)', filters.company_name, addParam);
  if (compNameClause) where.push(compNameClause);

  // 3. Company Country
  const countryClause = buildExcelFilterDual('co.country', 'ct.country', filters.country, addParam);
  if (countryClause) where.push(countryClause);

  // 4. Company Type
  const companyTypeClause = buildExcelFilter('co.company_type', filters.company_type, addParam);
  if (companyTypeClause) where.push(companyTypeClause);

  // 5. Industry
  const industryClause = buildExcelFilterDual('co.industry', 'ct.industry', filters.industry, addParam);
  if (industryClause) where.push(industryClause);

  // 6. Employee Size
  const empSizeClause = buildExcelFilter('co.employee_size', filters.employee_size, addParam);
  if (empSizeClause) where.push(empSizeClause);

  // 7. Technology
  const techClause = buildTechnologyFilter(filters.technology, addParam);
  if (techClause) where.push(techClause);

  // 8. Company Source
  const companySourceClause = buildExcelFilter('co.source', filters.company_source, addParam);
  if (companySourceClause) where.push(companySourceClause);

  // 9. Website
  const websiteClause = buildExcelOrTextFilter('co.website', filters.website, addParam);
  if (websiteClause) where.push(websiteClause);

  // 10. Contact ID
  if (hasValue(filters.contact_id)) {
    if (Array.isArray(filters.contact_id)) {
      const c = buildExcelFilter('ct.id::text', filters.contact_id, addParam);
      if (c) where.push(c);
    } else {
      const str = String(filters.contact_id).trim();
      if (isBlankKeyword(str)) {
        where.push(`ct.id IS NULL`);
      } else {
        const p = addParam(str);
        where.push(`ct.id::text = ${p}`);
      }
    }
  }

  // 11. Contact Name
  const contactNameClause = buildExcelOrTextFilter('ct.contact_name', filters.contact_name, addParam);
  if (contactNameClause) where.push(contactNameClause);

  // 12. Contact Count
  if (hasValue(filters.contact_count)) {
    if (Array.isArray(filters.contact_count)) {
      const c = buildExcelFilter('COALESCE(co.contacts_count, co.contact_count)::text', filters.contact_count, addParam);
      if (c) where.push(c);
    } else {
      const str = String(filters.contact_count).trim();
      if (isBlankKeyword(str)) {
        where.push(`(co.contacts_count IS NULL OR co.contacts_count = 0)`);
      } else {
        const p = addParam(parseInt(str, 10) || 0);
        where.push(`(co.contacts_count = ${p} OR co.contact_count = ${p})`);
      }
    }
  }

  // 13. Position Type
  const posTypeClause = buildExcelFilter('COALESCE(ct.pos_type, ct.position_type)', filters.position_type, addParam);
  if (posTypeClause) where.push(posTypeClause);

  // 14. Linkedin Connected Account
  const linkedinAccClause = buildExcelFilter('COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc)', filters.linkedin_connected_account, addParam);
  if (linkedinAccClause) where.push(linkedinAccClause);

  // 15. Linkedin URL
  const linkedinUrlClause = buildExcelOrTextFilter('ct.linkedin_url', filters.linkedin_url, addParam);
  if (linkedinUrlClause) where.push(linkedinUrlClause);

  // 16. Sales Person
  const salespersonClause = buildExcelFilterDual('co.salesperson', 'ct.salesperson', filters.salesperson, addParam);
  if (salespersonClause) where.push(salespersonClause);

  // 17. Company Categories
  const compCategoriesClause = buildExcelFilter('co.company_categories', filters.company_categories, addParam);
  if (compCategoriesClause) where.push(compCategoriesClause);

  // 18. Contact Source
  const contactSourceClause = buildExcelFilter('ct.source', filters.contact_source, addParam);
  if (contactSourceClause) where.push(contactSourceClause);

  // 19. Preferred Linkedin Connected
  const prefLinkedinClause = buildExcelFilter('ct.preferred_linkedin_connected', filters.preferred_linkedin_connected, addParam);
  if (prefLinkedinClause) where.push(prefLinkedinClause);

  // 20 & 21. Contact Created Dates
  if (hasValue(filters.contact_from_date)) {
    const p = addParam(String(filters.contact_from_date).trim());
    where.push(`COALESCE(ct.created_date, ct.created_at::text) >= ${p}`);
  }
  if (hasValue(filters.contact_to_date)) {
    const p = addParam(String(filters.contact_to_date).trim());
    where.push(`COALESCE(ct.created_date, ct.created_at::text) <= ${p}`);
  }

  // Generic search box across visible fields
  if (hasValue(filters.search)) {
    const p = addParam(`%${String(filters.search).trim().toLowerCase()}%`);
    where.push(`(
      LOWER(COALESCE(co.comp_name, '')) LIKE ${p}
      OR LOWER(COALESCE(ct.contact_name, '')) LIKE ${p}
      OR LOWER(COALESCE(co.country, '')) LIKE ${p}
      OR LOWER(COALESCE(ct.country, '')) LIKE ${p}
      OR LOWER(COALESCE(co.industry, '')) LIKE ${p}
      OR LOWER(COALESCE(co.technology, '')) LIKE ${p}
      OR LOWER(COALESCE(ct.designation, '')) LIKE ${p}
      OR LOWER(COALESCE(ct.comp_email, ct.email, '')) LIKE ${p}
    )`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, params };
}

function hasActiveFilters(filters = {}) {
  const keys = [
    'company_id', 'company_name', 'country', 'company_type', 'industry', 'employee_size',
    'technology', 'company_source', 'website', 'contact_id', 'contact_name', 'contact_count',
    'position_type', 'linkedin_connected_account', 'linkedin_url', 'salesperson',
    'company_categories', 'contact_source', 'preferred_linkedin_connected',
    'contact_from_date', 'contact_to_date', 'search'
  ];
  return keys.some(k => hasValue(filters[k]));
}

/**
 * Get distinct filter values for the dropdowns strictly from PostgreSQL.
 */
async function getCompanyDashboardFilterOptions() {
  const [
    countriesRes,
    companyTypesRes,
    industriesRes,
    empSizesRes,
    technologiesRes,
    companySourcesRes,
    posTypesRes,
    linkedinAccountsRes,
    salespersonsRes,
    companyCategoriesRes,
    contactSourcesRes,
    prefLinkedinRes,
    compNamesRes,
    contNamesRes,
    websitesRes,
    contactCountsRes,
  ] = await Promise.all([
    db.query(`SELECT DISTINCT country FROM (SELECT country FROM companies UNION SELECT country FROM contacts) c WHERE country IS NOT NULL AND country != '' ORDER BY country`),
    db.query(`SELECT DISTINCT company_type FROM companies WHERE company_type IS NOT NULL AND company_type != '' ORDER BY company_type`),
    db.query(`SELECT DISTINCT industry FROM (SELECT industry FROM companies UNION SELECT industry FROM contacts) i WHERE industry IS NOT NULL AND industry != '' ORDER BY industry`),
    db.query(`SELECT DISTINCT employee_size FROM companies WHERE employee_size IS NOT NULL AND employee_size != '' ORDER BY employee_size`),
    db.query(`SELECT DISTINCT technology FROM (SELECT technology FROM companies UNION SELECT technology FROM contacts) t WHERE technology IS NOT NULL AND technology != '' ORDER BY technology`),
    db.query(`SELECT DISTINCT source FROM companies WHERE source IS NOT NULL AND source != '' ORDER BY source`),
    db.query(`SELECT DISTINCT COALESCE(pos_type, position_type) AS pos_type FROM contacts WHERE COALESCE(pos_type, position_type) IS NOT NULL AND COALESCE(pos_type, position_type) != '' ORDER BY pos_type`),
    db.query(`SELECT DISTINCT COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) AS acc FROM contacts WHERE COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) IS NOT NULL AND COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) != '' ORDER BY acc`),
    db.query(`SELECT DISTINCT salesperson FROM (SELECT salesperson FROM companies UNION SELECT salesperson FROM contacts) s WHERE salesperson IS NOT NULL AND salesperson != '' ORDER BY salesperson`),
    db.query(`SELECT DISTINCT company_categories FROM companies WHERE company_categories IS NOT NULL AND company_categories != '' ORDER BY company_categories`),
    db.query(`SELECT DISTINCT source FROM contacts WHERE source IS NOT NULL AND source != '' ORDER BY source`),
    db.query(`SELECT DISTINCT preferred_linkedin_connected FROM contacts WHERE preferred_linkedin_connected IS NOT NULL AND preferred_linkedin_connected != '' ORDER BY preferred_linkedin_connected`),
    db.query(`SELECT DISTINCT comp_name FROM companies WHERE comp_name IS NOT NULL AND comp_name != '' ORDER BY comp_name`),
    db.query(`SELECT DISTINCT contact_name FROM contacts WHERE contact_name IS NOT NULL AND contact_name != '' ORDER BY contact_name`),
    db.query(`SELECT DISTINCT website FROM companies WHERE website IS NOT NULL AND website != '' ORDER BY website`),
    db.query(`SELECT DISTINCT COALESCE(contacts_count, contact_count)::text AS cc FROM companies WHERE COALESCE(contacts_count, contact_count) IS NOT NULL ORDER BY cc`),
  ]);

  return {
    countries: countriesRes.rows.map(r => r.country),
    companyTypes: companyTypesRes.rows.map(r => r.company_type),
    industries: industriesRes.rows.map(r => r.industry),
    employeeSizes: empSizesRes.rows.map(r => r.employee_size),
    technologies: technologiesRes.rows.map(r => r.technology),
    companySources: companySourcesRes.rows.map(r => r.source),
    positionTypes: posTypesRes.rows.map(r => r.pos_type),
    linkedinAccounts: linkedinAccountsRes.rows.map(r => r.acc),
    salespersons: salespersonsRes.rows.map(r => r.salesperson),
    companyCategories: companyCategoriesRes.rows.map(r => r.company_categories),
    contactSources: contactSourcesRes.rows.map(r => r.source),
    preferredLinkedin: prefLinkedinRes.rows.map(r => r.preferred_linkedin_connected),
    companyNames: compNamesRes.rows.map(r => r.comp_name),
    contactNames: contNamesRes.rows.map(r => r.contact_name),
    websites: websitesRes.rows.map(r => r.website),
    contactCounts: contactCountsRes.rows.map(r => r.cc),
  };
}

/**
 * Get KPI Counts (Company Count and Contact Count) strictly from local PostgreSQL database.
 */
async function getCompanyDashboardKpis(filters = {}) {
  const active = hasActiveFilters(filters);
  if (!active) {
    const [compRes, contRes] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM companies`),
      db.query(`SELECT COUNT(*)::int AS count FROM contacts`),
    ]);
    return {
      companyCount: compRes.rows[0]?.count || 0,
      contactCount: contRes.rows[0]?.count || 0,
    };
  }

  const { whereSql, params } = buildFilterClauses(filters);
  const [compRes, contRes] = await Promise.all([
    db.query(`
      SELECT COUNT(DISTINCT co.id)::int AS company_count
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${whereSql}
    `, params),
    db.query(`
      SELECT COUNT(DISTINCT ct.id)::int AS contact_count
      FROM contacts ct
      LEFT JOIN companies co ON co.id = ct.comp_id
      ${whereSql}
    `, params),
  ]);

  return {
    companyCount: compRes.rows[0]?.company_count || 0,
    contactCount: contRes.rows[0]?.contact_count || 0,
  };
}

/**
 * Get paginated report data for any of the 11 tabs strictly from local PostgreSQL database.
 * Every tab is filtered by ALL 21 filters.
 */
async function getCompanyDashboardReport(tabId = 'company_contact_details', filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const pageSize = pagination.pageSize === 'all' ? 10000 : Math.max(1, parseInt(pagination.pageSize, 10) || 50);
  const offset = (page - 1) * pageSize;

  const { whereSql, params } = buildFilterClauses(filters);

  // Tab 1: Company Contact Details
  if (tabId === 'company_contact_details') {
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, pageSize, offset];
    const dataSql = `
      SELECT 
        co.id AS company_id,
        co.comp_name AS company_name,
        ct.id AS contact_id,
        COALESCE(ct.comp_id, co.id) AS contact_company_id,
        ct.contact_name AS contact_name,
        COALESCE(ct.comp_name, co.comp_name) AS contact_company_name,
        COALESCE(co.contacts_count, 0) AS company_contacts_count,
        COALESCE(co.contact_count, 0) AS company_contact_count,
        co.employee_size,
        ct.preferred_linkedin_connected,
        co.company_type,
        co.industry AS company_industry,
        ct.industry AS contact_industry,
        co.source AS company_source,
        co.technology AS company_technology,
        COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc) AS linkedin_connected_account,
        co.country AS company_country,
        ct.country AS contact_country,
        ct.designation,
        COALESCE(ct.pos_type, ct.position_type) AS position_type,
        COALESCE(ct.comp_email, ct.email) AS email,
        ct.other_email,
        COALESCE(ct.comp_email_verified, ct.email_verified) AS comp_email_verified,
        COALESCE(ct.contact_phone, ct.phone) AS phone,
        COALESCE(ct.contact_phone2, ct.phone2) AS phone2,
        COALESCE(ct.contact_phone3, ct.phone3) AS phone3,
        COALESCE(ct.contact_mobile, ct.mobile) AS mobile,
        COALESCE(ct.contact_mobile2, ct.mobile2) AS mobile2,
        COALESCE(ct.contact_mobile3, ct.mobile3) AS mobile3,
        ct.mobile_verified,
        ct.linkedin_url,
        COALESCE(ct.linkedlnid, ct.linkedin_id) AS linkedin_id,
        COALESCE(ct.comp_linkedlnid, ct.comp_linkedin_id) AS comp_linkedin_id,
        co.website,
        co.city,
        COALESCE(co.salesperson, ct.salesperson) AS salesperson,
        co.salesperson AS company_salesperson,
        ct.salesperson AS contact_salesperson,
        ct.source AS contact_source,
        co.existingcomp,
        co.companyphone AS company_phone,
        co.company_categories,
        co.supplier_number,
        co.registered_url,
        co.registration_status,
        co.registration_date,
        co.username,
        co.password,
        co.da,
        co.com_email AS company_email,
        co.remark AS company_remark,
        ct.remark AS contact_remark,
        ct.priority_contact,
        ct.connection_date,
        ct.connection_send_by,
        COALESCE(ct.contactstatus, ct.contact_status) AS contact_status,
        ct.source_details,
        COALESCE(ct.data_extracted, ct.data_extracted_date) AS data_extracted,
        ct.current_past,
        co.lead_count,
        co.prev_salesperson,
        co.joget_id,
        co.created_by AS company_created_by,
        co.created_date AS company_created_date,
        co.modified_by AS company_modified_by,
        co.modified_date AS company_modified_date,
        ct.created_by AS contact_created_by,
        ct.created_date AS contact_created_date,
        ct.modified_by AS contact_modified_by,
        ct.modified_date AS contact_modified_date
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${whereSql}
      ORDER BY 
        CASE WHEN co.comp_name ILIKE '%ATHERIA%' THEN 0 ELSE 1 END,
        COALESCE(co.comp_name, ct.comp_name) ASC NULLS LAST,
        co.id ASC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await db.query(dataSql, dataParams);
    return { data: dataRes.rows, total, page, pageSize };
  }

  // Tab 2: Company Details (Filtered by company AND contact filters)
  if (tabId === 'company_details') {
    const countSql = `
      SELECT COUNT(DISTINCT co.id)::int AS total
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, pageSize, offset];
    const dataSql = `
      SELECT 
        co.id AS company_id,
        co.comp_name AS company_name,
        co.technology,
        co.industry,
        co.company_type,
        co.country,
        co.city,
        co.employee_size,
        co.website,
        co.companyphone AS company_phone,
        co.salesperson,
        co.prev_salesperson,
        COALESCE(co.contacts_count, co.contact_count, 0) AS contacts_count,
        co.lead_count,
        co.source,
        co.company_categories,
        co.existingcomp,
        co.registration_status,
        co.registered_url,
        co.supplier_number,
        co.username,
        co.password,
        co.registration_date,
        co.da,
        co.com_email AS company_email,
        co.remark,
        co.joget_id,
        co.created_by,
        co.created_date,
        co.modified_by,
        co.modified_date
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${whereSql}
      GROUP BY co.id
      ORDER BY co.id DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await db.query(dataSql, dataParams);
    return { data: dataRes.rows, total, page, pageSize };
  }

  // Tab 3: Contact Details (Filtered by contact AND company filters)
  if (tabId === 'contact_details') {
    const countSql = `
      SELECT COUNT(DISTINCT ct.id)::int AS total
      FROM contacts ct
      LEFT JOIN companies co ON co.id = ct.comp_id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, pageSize, offset];
    const dataSql = `
      SELECT 
        ct.id AS contact_id,
        ct.contact_name,
        COALESCE(ct.comp_id, co.id) AS company_id,
        COALESCE(ct.comp_name, co.comp_name) AS company_name,
        ct.designation,
        COALESCE(ct.pos_type, ct.position_type) AS position_type,
        ct.priority_contact,
        COALESCE(ct.comp_email, ct.email) AS email,
        ct.other_email,
        COALESCE(ct.comp_email_verified, ct.email_verified) AS comp_email_verified,
        ct.email_tool_verified,
        ct.email_verified_by_response,
        COALESCE(ct.contact_phone, ct.phone) AS phone,
        COALESCE(ct.contact_phone2, ct.phone2) AS phone2,
        COALESCE(ct.contact_phone3, ct.phone3) AS phone3,
        COALESCE(ct.contact_mobile, ct.mobile) AS mobile,
        COALESCE(ct.contact_mobile2, ct.mobile2) AS mobile2,
        COALESCE(ct.contact_mobile3, ct.mobile3) AS mobile3,
        ct.mobile_verified,
        ct.linkedin_url,
        COALESCE(ct.linkedlnid, ct.linkedin_id) AS linkedin_id,
        COALESCE(ct.comp_linkedlnid, ct.comp_linkedin_id) AS comp_linkedin_id,
        ct.preferred_linkedin_connected,
        ct.linkedin_conn_send_acc,
        COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc) AS linkedin_connected_account,
        ct.connection_date,
        ct.connection_send_by,
        COALESCE(ct.contactstatus, ct.contact_status) AS contact_status,
        COALESCE(ct.country, co.country) AS country,
        co.city AS city,
        COALESCE(ct.industry, co.industry) AS industry,
        COALESCE(ct.technology, co.technology) AS technology,
        COALESCE(ct.salesperson, co.salesperson) AS salesperson,
        ct.source,
        ct.source_details,
        COALESCE(ct.data_extracted, ct.data_extracted_date) AS data_extracted,
        ct.current_past,
        ct.remark,
        COALESCE(ct.website, co.website) AS website,
        ct.created_by,
        ct.created_date,
        ct.modified_by,
        ct.modified_date
      FROM contacts ct
      LEFT JOIN companies co ON co.id = ct.comp_id
      ${whereSql}
      GROUP BY ct.id, co.id
      ORDER BY ct.id DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await db.query(dataSql, dataParams);
    return { data: dataRes.rows, total, page, pageSize };
  }

  // Pivot tabs configuration matching Oracle APEX Page 74 Matrix Reports
  const PIVOT_TAB_CONFIG = {
    linkedin_by_position_type: {
      rowExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc)), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.pos_type, ct.position_type)), ''), 'Blank')`,
      rowHeaderKey: 'linkedin_connected_account',
      rowHeaderLabel: 'Linkedin Connected Account',
    },
    preferred_linkedin_by_position_type: {
      rowExpr: `COALESCE(NULLIF(TRIM(ct.preferred_linkedin_connected), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.pos_type, ct.position_type)), ''), 'Blank')`,
      rowHeaderKey: 'preferred_linkedin_connected',
      rowHeaderLabel: 'Preferred Linkedin Connected',
    },
    preferred_linkedin_by_technology: {
      rowExpr: `COALESCE(NULLIF(TRIM(ct.preferred_linkedin_connected), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(co.technology, ct.technology)), ''), 'Blank')`,
      rowHeaderKey: 'preferred_linkedin_connected',
      rowHeaderLabel: 'Preferred Linkedin Connected',
    },
    country_wise_position_type: {
      rowExpr: `COALESCE(NULLIF(TRIM(COALESCE(co.country, ct.country)), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.pos_type, ct.position_type)), ''), 'Blank')`,
      rowHeaderKey: 'country',
      rowHeaderLabel: 'Country',
    },
    source_wise_position_type: {
      rowExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.source, co.source)), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.pos_type, ct.position_type)), ''), 'Blank')`,
      rowHeaderKey: 'source',
      rowHeaderLabel: 'Source',
    },
    technology_wise_position_type: {
      rowExpr: `COALESCE(NULLIF(TRIM(COALESCE(co.technology, ct.technology)), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.pos_type, ct.position_type)), ''), 'Blank')`,
      rowHeaderKey: 'technology',
      rowHeaderLabel: 'Technology',
    },
    technology_wise_source: {
      rowExpr: `COALESCE(NULLIF(TRIM(COALESCE(co.technology, ct.technology)), ''), 'Blank')`,
      colExpr: `COALESCE(NULLIF(TRIM(COALESCE(ct.source, co.source)), ''), 'Blank')`,
      rowHeaderKey: 'technology',
      rowHeaderLabel: 'Technology',
    },
  };

  // Generic Dynamic Pivot / Crosstab report builder (APEX Interactive Report Pivot style)
  if (PIVOT_TAB_CONFIG[tabId]) {
    const conf = PIVOT_TAB_CONFIG[tabId];
    const querySql = `
      SELECT 
        ${conf.rowExpr} AS row_val,
        ${conf.colExpr} AS col_val,
        COUNT(*)::int AS cnt
      FROM contacts ct
      LEFT JOIN companies co ON co.id = ct.comp_id
      ${whereSql}
      GROUP BY 1, 2
    `;

    const res = await db.query(querySql, params);
    const rows = res.rows;

    function normalizeColLabel(val) {
      if (!val) return 'Blank';
      const s = String(val).trim();
      if (!s || s.toLowerCase() === 'blank') return 'Blank';
      const lower = s.toLowerCase();
      if (lower === 'non it' || lower === 'non-it') return 'Non IT';
      if (lower === 'head of it') return 'Head Of IT';
      if (lower === 'head of crm') return 'Head Of CRM';
      if (lower === 'it manager') return 'IT Manager';
      if (lower === 'it project manager') return 'IT Project Manager';
      if (lower === 'other crm') return 'Other CRM';
      if (lower === 'other it') return 'Other IT';
      if (lower === 'business application' || lower === 'business applications') return 'Business Application';
      if (lower === 'project manager') return 'Project Manager';
      if (lower === 'procurement') return 'Procurement';
      return s;
    }

    const colSet = new Set();
    const rowMap = new Map();

    for (const r of rows) {
      const cVal = normalizeColLabel(r.col_val);
      const rVal = r.row_val;
      const count = parseInt(r.cnt, 10) || 0;

      colSet.add(cVal);

      if (!rowMap.has(rVal)) {
        rowMap.set(rVal, { [conf.rowHeaderKey]: rVal, total: 0 });
      }
      const rowObj = rowMap.get(rVal);
      rowObj[cVal] = (rowObj[cVal] || 0) + count;
      rowObj.total += count;
    }

    // Sort columns: alphabetical, but 'Blank' second-to-last
    const sortedCols = Array.from(colSet).sort((a, b) => {
      if (a.toLowerCase() === 'blank') return 1;
      if (b.toLowerCase() === 'blank') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });

    // Ensure every row has all columns populated (default 0)
    let allRows = Array.from(rowMap.values()).map(rowObj => {
      for (const c of sortedCols) {
        if (rowObj[c] === undefined) {
          rowObj[c] = 0;
        }
      }
      return rowObj;
    });

    // In-table search filter
    const searchQ = (pagination.search || '').trim().toLowerCase();
    if (searchQ) {
      allRows = allRows.filter(r => {
        const val = String(r[conf.rowHeaderKey] || '').toLowerCase();
        return val.includes(searchQ);
      });
    }

    // Sort rows: descending by total count (matches APEX screenshot)
    allRows.sort((a, b) => b.total - a.total);

    const pivotColumns = [
      { key: conf.rowHeaderKey, label: conf.rowHeaderLabel, minWidth: 220, sortable: true },
      ...sortedCols.map(c => ({
        key: c,
        label: c,
        minWidth: 120,
        align: 'right',
        sortable: true,
      })),
      { key: 'total', label: 'Total', minWidth: 100, align: 'right', sortable: true, isTotal: true },
    ];

    const pageSize = pagination.pageSize === 'all' || pagination.pageSize >= 1000 ? Math.max(allRows.length, 1) : Math.max(1, parseInt(pagination.pageSize, 10) || 50);
    const offset = (page - 1) * pageSize;
    const pagedRows = allRows.slice(offset, offset + pageSize);

    return {
      isPivot: true,
      columns: pivotColumns,
      data: pagedRows,
      total: allRows.length,
      page,
      pageSize,
    };
  }

  // Tab 11: Registered Data (Filtered by all filters)
  if (tabId === 'registered_data') {
    const regCond = `((co.registration_status IS NOT NULL AND co.registration_status != '') OR (co.registered_url IS NOT NULL AND co.registered_url != '') OR (co.supplier_number IS NOT NULL AND co.supplier_number != ''))`;
    const fullWhere = whereSql ? `${whereSql} AND ${regCond}` : `WHERE ${regCond}`;

    const countSql = `
      SELECT COUNT(DISTINCT co.id)::int AS total
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${fullWhere}
    `;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataParams = [...params, pageSize, offset];
    const dataSql = `
      SELECT 
        co.id AS company_id,
        co.comp_name AS company_name,
        co.supplier_number,
        co.registration_status,
        co.registered_url,
        co.registration_date,
        co.country,
        co.city,
        co.website,
        co.username,
        co.password,
        co.technology,
        co.industry,
        co.employee_size,
        co.company_type,
        co.company_categories,
        co.salesperson,
        co.source,
        co.remark,
        co.created_date
      FROM companies co
      LEFT JOIN contacts ct ON co.id = ct.comp_id
      ${fullWhere}
      GROUP BY co.id
      ORDER BY co.id DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await db.query(dataSql, dataParams);
    return { data: dataRes.rows, total, page, pageSize };
  }

  return { data: [], total: 0, page, pageSize };
}

module.exports = {
  getCompanyDashboardFilterOptions,
  getCompanyDashboardKpis,
  getCompanyDashboardReport,
};
