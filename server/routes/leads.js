const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');

function formatOracleDate(dateObj = new Date()) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  return `${day}-${mon}-${yr}`;
}

function formatDateSlash(dateObj = new Date()) {
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  return `${day}/${month}/${yr}`;
}

/**
 * GET /api/leads/meta/lovs
 * Returns lists of values for dropdowns
 */
router.get('/meta/lovs', async (req, res, next) => {
  try {
    const [
      acctMgrs,
      coordinators,
      currencies,
      probabilities,
      leadTypes,
      models,
      reqServices,
      cvMadeBy,
      sources,
      companies,
      industries,
      countries,
      companyTypes,
    ] = await Promise.all([
      pool.query(`SELECT DISTINCT account_manager FROM leads WHERE account_manager IS NOT NULL AND account_manager != '' ORDER BY account_manager`),
      pool.query(`SELECT DISTINCT name_of_coordinator FROM leads WHERE name_of_coordinator IS NOT NULL AND name_of_coordinator != '' ORDER BY name_of_coordinator`),
      pool.query(`SELECT currency_id, currency_code, currency_name FROM currencies ORDER BY currency_id`),
      pool.query(`SELECT DISTINCT probability FROM leads WHERE probability IS NOT NULL AND probability != '' ORDER BY probability`),
      pool.query(`SELECT DISTINCT lead_type FROM leads WHERE lead_type IS NOT NULL AND lead_type != '' ORDER BY lead_type`),
      pool.query(`SELECT DISTINCT model FROM lead_lines WHERE model IS NOT NULL AND model != '' ORDER BY model`),
      pool.query(`SELECT DISTINCT required_service FROM lead_lines WHERE required_service IS NOT NULL AND required_service != '' ORDER BY required_service`),
      pool.query(`SELECT DISTINCT cv_made_by FROM lead_lines WHERE cv_made_by IS NOT NULL AND cv_made_by != '' ORDER BY cv_made_by`),
      pool.query(`SELECT DISTINCT source FROM master_sources ORDER BY source`),
      pool.query(`SELECT id, comp_name, industry, country, city, company_type, website FROM companies ORDER BY comp_name ASC LIMIT 2000`),
      pool.query(`SELECT DISTINCT industry FROM master_industries ORDER BY industry`),
      pool.query(`SELECT DISTINCT country FROM master_countries ORDER BY country`),
      pool.query(`SELECT DISTINCT master_company_type as company_type FROM master_company_types ORDER BY master_company_type`),
    ]);

    res.json({
      success: true,
      data: {
        accountManagers: acctMgrs.rows.map(r => r.account_manager),
        coordinators: coordinators.rows.map(r => r.name_of_coordinator),
        currencies: currencies.rows,
        probabilities: probabilities.rows.map(r => r.probability),
        leadTypes: leadTypes.rows.map(r => r.lead_type),
        models: models.rows.map(r => r.model),
        requiredServices: reqServices.rows.map(r => r.required_service),
        cvMadeBy: cvMadeBy.rows.map(r => r.cv_made_by),
        sources: sources.rows.map(r => r.source),
        companies: companies.rows,
        industries: industries.rows.map(r => r.industry),
        countries: countries.rows.map(r => r.country),
        companyTypes: companyTypes.rows.map(r => r.company_type),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/meta/column-values
 * Returns distinct column values for the column header popover filter list
 */
router.get('/meta/column-values', async (req, res, next) => {
  try {
    const { column } = req.query;
    if (!column) {
      return res.status(400).json({ success: false, message: 'Column is required' });
    }
    const safeCol = column.toLowerCase() === 'coordinator' ? 'name_of_coordinator' : column.toLowerCase();
    const allowed = [
      'company_name',
      'name_of_coordinator',
      'account_manager',
      'industry',
      'technology',
      'city',
      'country',
      'probability',
      'company_type',
      'lead_type',
      'contacts',
      'lead_date',
      'status',
      'sr_no'
    ];
    if (!allowed.includes(safeCol)) {
      return res.status(400).json({ success: false, message: 'Invalid column' });
    }
    const result = await pool.query(
      `SELECT DISTINCT CAST(${safeCol} AS TEXT) as val 
       FROM leads 
       WHERE ${safeCol} IS NOT NULL AND CAST(${safeCol} AS TEXT) != '' AND CAST(${safeCol} AS TEXT) != '—'
       ORDER BY val ASC 
       LIMIT 1000`
    );
    res.json({
      success: true,
      data: result.rows.map(r => r.val).filter(Boolean)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads
 * Lead report list with filters, search, pagination, and sorting
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      company_name = '',
      account_manager = '',
      coordinator = '',
      name_of_coordinator = '',
      industry = '',
      country = '',
      technology = '',
      probability = '',
      company_type = '',
      lead_type = '',
      city = '',
      contacts = '',
      lead_date = '',
      status = '',
      limit = 50,
      offset = 0,
      sortBy = 'sr_no',
      sortOrder = 'ASC',
    } = req.query;

    const whereClauses = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const idx = values.length;
      whereClauses.push(`(
        LOWER(COALESCE(company_name, '')) LIKE $${idx} OR
        LOWER(COALESCE(name_of_coordinator, '')) LIKE $${idx} OR
        LOWER(COALESCE(account_manager, '')) LIKE $${idx} OR
        LOWER(COALESCE(industry, '')) LIKE $${idx} OR
        LOWER(COALESCE(technology, '')) LIKE $${idx} OR
        LOWER(COALESCE(city, '')) LIKE $${idx} OR
        LOWER(COALESCE(country, '')) LIKE $${idx} OR
        LOWER(COALESCE(probability, '')) LIKE $${idx} OR
        LOWER(COALESCE(company_type, '')) LIKE $${idx} OR
        LOWER(COALESCE(contacts, '')) LIKE $${idx} OR
        CAST(sr_no AS TEXT) LIKE $${idx}
      )`);
    }

    if (company_name && company_name.trim()) {
      values.push(`%${company_name.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(company_name, '')) LIKE $${values.length}`);
    }

    if (account_manager && account_manager.trim()) {
      values.push(account_manager.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(account_manager, '')) = $${values.length}`);
    }

    const coordVal = coordinator || name_of_coordinator || '';
    if (coordVal && coordVal.trim()) {
      values.push(`%${coordVal.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(name_of_coordinator, '')) LIKE $${values.length}`);
    }

    if (industry && industry.trim()) {
      values.push(`%${industry.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(industry, '')) LIKE $${values.length}`);
    }

    if (country && country.trim()) {
      values.push(`%${country.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(country, '')) LIKE $${values.length}`);
    }

    if (technology && technology.trim()) {
      values.push(`%${technology.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(technology, '')) LIKE $${values.length}`);
    }

    if (probability && probability.trim()) {
      values.push(probability.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(probability, '')) = $${values.length}`);
    }

    if (company_type && company_type.trim()) {
      values.push(company_type.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(company_type, '')) = $${values.length}`);
    }

    if (lead_type && lead_type.trim()) {
      values.push(lead_type.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(lead_type, '')) = $${values.length}`);
    }

    if (city && city.trim()) {
      values.push(`%${city.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(city, '')) LIKE $${values.length}`);
    }

    if (contacts && contacts.trim()) {
      values.push(`%${contacts.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(contacts, '')) LIKE $${values.length}`);
    }

    if (lead_date && lead_date.trim()) {
      values.push(`%${lead_date.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(lead_date, '')) LIKE $${values.length}`);
    }

    if (status && status.trim()) {
      values.push(`%${status.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(status, '')) LIKE $${values.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSort = ['sr_no', 'company_name', 'name_of_coordinator', 'account_manager', 'industry', 'technology', 'lead_date', 'city', 'country', 'probability', 'company_type', 'contacts', 'created_date', 'lead_id'];
    let safeSort = sortBy.toLowerCase();
    if (safeSort === 'coordinator') safeSort = 'name_of_coordinator';
    if (!allowedSort.includes(safeSort)) safeSort = 'sr_no';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereSql}`;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].total, 10);

    const lim = Math.max(1, parseInt(limit, 10) || 50);
    const off = Math.max(0, parseInt(offset, 10) || 0);

    const sortExpr = (safeSort === 'sr_no' || safeSort === 'lead_id') ? safeSort : `NULLIF(TRIM(CAST(${safeSort} AS TEXT)), '')`;

    const dataQuery = `
      SELECT 
        lead_id, sr_no, company_name, company_id, company_url, company_type,
        name_of_coordinator, account_manager, industry, technology,
        lead_date, lead_time, city, country, probability, lead_type,
        status, status_detail, da, source, referrer, contract_no,
        currency_id, currency_code, amount, amount_in_inr, end_client, page_url,
        proposal, connection_sent, last_followup, reason, month, year,
        lost_won, contacts, created_by, created_date, modified_by, modified_date
      FROM leads
      ${whereSql}
      ORDER BY ${sortExpr} ${safeOrder} NULLS LAST, sr_no ASC
      LIMIT ${lim} OFFSET ${off}
    `;

    const dataRes = await pool.query(dataQuery, values);

    res.json({
      success: true,
      data: dataRes.rows,
      total,
      limit: lim,
      offset: off,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/ids
 * Returns all lead IDs matching current query criteria (for Select All throughout report).
 */
router.get('/ids', async (req, res, next) => {
  try {
    const {
      search = '',
      company_name = '',
      account_manager = '',
      coordinator = '',
      name_of_coordinator = '',
      industry = '',
      country = '',
      technology = '',
      probability = '',
      company_type = '',
      lead_type = '',
      city = '',
      contacts = '',
      lead_date = '',
      status = '',
    } = req.query;

    const whereClauses = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      const idx = values.length;
      whereClauses.push(`(
        LOWER(COALESCE(company_name, '')) LIKE $${idx} OR
        LOWER(COALESCE(name_of_coordinator, '')) LIKE $${idx} OR
        LOWER(COALESCE(account_manager, '')) LIKE $${idx} OR
        LOWER(COALESCE(industry, '')) LIKE $${idx} OR
        LOWER(COALESCE(technology, '')) LIKE $${idx} OR
        LOWER(COALESCE(city, '')) LIKE $${idx} OR
        LOWER(COALESCE(country, '')) LIKE $${idx} OR
        LOWER(COALESCE(probability, '')) LIKE $${idx} OR
        LOWER(COALESCE(company_type, '')) LIKE $${idx} OR
        LOWER(COALESCE(contacts, '')) LIKE $${idx} OR
        CAST(sr_no AS TEXT) LIKE $${idx}
      )`);
    }

    if (company_name && company_name.trim()) {
      values.push(`%${company_name.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(company_name, '')) LIKE $${values.length}`);
    }

    if (account_manager && account_manager.trim()) {
      values.push(account_manager.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(account_manager, '')) = $${values.length}`);
    }

    const coordVal = coordinator || name_of_coordinator || '';
    if (coordVal && coordVal.trim()) {
      values.push(`%${coordVal.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(name_of_coordinator, '')) LIKE $${values.length}`);
    }

    if (industry && industry.trim()) {
      values.push(`%${industry.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(industry, '')) LIKE $${values.length}`);
    }

    if (country && country.trim()) {
      values.push(`%${country.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(country, '')) LIKE $${values.length}`);
    }

    if (technology && technology.trim()) {
      values.push(`%${technology.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(technology, '')) LIKE $${values.length}`);
    }

    if (probability && probability.trim()) {
      values.push(probability.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(probability, '')) = $${values.length}`);
    }

    if (company_type && company_type.trim()) {
      values.push(company_type.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(company_type, '')) = $${values.length}`);
    }

    if (lead_type && lead_type.trim()) {
      values.push(lead_type.trim().toLowerCase());
      whereClauses.push(`LOWER(COALESCE(lead_type, '')) = $${values.length}`);
    }

    if (city && city.trim()) {
      values.push(`%${city.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(city, '')) LIKE $${values.length}`);
    }

    if (contacts && contacts.trim()) {
      values.push(`%${contacts.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(contacts, '')) LIKE $${values.length}`);
    }

    if (lead_date && lead_date.trim()) {
      values.push(`%${lead_date.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(lead_date, '')) LIKE $${values.length}`);
    }

    if (status && status.trim()) {
      values.push(`%${status.trim().toLowerCase()}%`);
      whereClauses.push(`LOWER(COALESCE(status, '')) LIKE $${values.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const idRes = await pool.query(`SELECT lead_id FROM leads ${whereSql} ORDER BY lead_id ASC`, values);
    const ids = idRes.rows.map((r) => r.lead_id);

    res.json({
      success: true,
      ids,
      total: ids.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/:id
 * Get single lead details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(404).json({ success: false, message: `Invalid lead ID: ${id}` });
    }
    const result = await pool.query(`SELECT * FROM leads WHERE lead_id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Lead with ID ${id} was not found.` });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads
 * Create new lead with duplicate check and auto sr_no
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      company_name,
      company_id,
      company_url,
      company_type,
      name_of_coordinator,
      account_manager,
      industry,
      technology,
      lead_date,
      lead_time,
      city,
      country,
      probability,
      lead_type,
      status,
      status_detail,
      da,
      source,
      referrer,
      contract_no,
      currency_id,
      currency_code,
      amount,
      amount_in_inr,
      end_client,
      page_url,
      proposal,
      connection_sent,
      last_followup,
      reason,
      month,
      year,
      lost_won,
      contacts,
      created_by = 'ADMIN',
    } = req.body;

    if (!company_name && !company_id) {
      return res.status(400).json({ success: false, message: 'Company Name is required.' });
    }

    // Foreign key validation matching Oracle constraint FK_LEAD_COMPANY
    let parsedCompanyId = null;
    if (company_id !== undefined && company_id !== null && String(company_id).trim() !== '') {
      parsedCompanyId = parseInt(company_id, 10);
      if (isNaN(parsedCompanyId) || parsedCompanyId <= 0) {
        return res.status(400).json({ success: false, message: 'Company ID must be a valid positive integer.' });
      }
      const compCheck = await pool.query('SELECT id FROM companies WHERE id = $1 LIMIT 1', [parsedCompanyId]);
      if (compCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: `Company ID ${parsedCompanyId} does not exist.` });
      }
    }

    // Validate non-negative numbers on amount
    if (amount !== undefined && amount !== null && String(amount).trim() !== '') {
      const numAmt = Number(amount);
      if (isNaN(numAmt) || numAmt < 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a non-negative number.' });
      }
    }
    if (amount_in_inr !== undefined && amount_in_inr !== null && String(amount_in_inr).trim() !== '') {
      const numInr = Number(amount_in_inr);
      if (isNaN(numInr) || numInr < 0) {
        return res.status(400).json({ success: false, message: 'Amount (INR) must be a non-negative number.' });
      }
    }

    // Date format validations
    if (lead_date && !/^\d{2}\/\d{2}\/\d{4}$/.test(lead_date) && !/^\d{4}-\d{2}-\d{2}$/.test(lead_date)) {
      return res.status(400).json({ success: false, message: 'Invalid Lead Date format (expected DD/MM/YYYY).' });
    }
    if (last_followup && !/^\d{2}\/\d{2}\/\d{4}$/.test(last_followup) && !/^\d{4}-\d{2}-\d{2}$/.test(last_followup)) {
      return res.status(400).json({ success: false, message: 'Invalid Last Followup date format (expected DD/MM/YYYY).' });
    }

    // Auto-generate next sr_no
    const maxSrRes = await pool.query('SELECT COALESCE(MAX(sr_no), 0) + 1 as next_sr FROM leads');
    const nextSr = parseInt(maxSrRes.rows[0].next_sr, 10);

    // Auto-generate lead_id
    const maxIdRes = await pool.query('SELECT COALESCE(MAX(lead_id), 0) + 1 as next_id FROM leads');
    const nextId = parseInt(maxIdRes.rows[0].next_id, 10);

    // Duplicate check on contract_no if provided
    if (contract_no && contract_no.trim()) {
      const dupContract = await pool.query('SELECT lead_id FROM leads WHERE LOWER(TRIM(contract_no)) = LOWER(TRIM($1))', [contract_no.trim()]);
      if (dupContract.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Contract Number '${contract_no.trim()}' already exists for another lead.` });
      }
    }

    const createdDate = formatOracleDate(new Date());

    const insertQuery = `
      INSERT INTO leads (
        lead_id, sr_no, company_name, company_id, company_url, company_type,
        name_of_coordinator, account_manager, industry, technology,
        lead_date, lead_time, city, country, probability, lead_type,
        status, status_detail, da, source, referrer, contract_no,
        currency_id, currency_code, amount, amount_in_inr, end_client, page_url,
        proposal, connection_sent, last_followup, reason, month, year,
        lost_won, contacts, created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40
      ) RETURNING *
    `;

    const values = [
      nextId, nextSr, (company_name || '').trim(), company_id ? parseInt(company_id, 10) : null,
      company_url || '', company_type || '', name_of_coordinator || '', account_manager || '',
      industry || '', technology || '', lead_date || formatDateSlash(new Date()), lead_time || '',
      city || '', country || '', probability || '', lead_type || 'New Client',
      status || '', status_detail || status || '', da || '', source || '', referrer || '',
      contract_no || '', currency_id ? parseInt(currency_id, 10) : null, currency_code || '',
      amount ? parseFloat(amount) : null, amount_in_inr ? parseFloat(amount_in_inr) : null,
      end_client || '', page_url || '', proposal || 'No', connection_sent || 'No',
      last_followup || '', reason || '', month || '', year ? parseInt(year, 10) : new Date().getFullYear(),
      lost_won || '', contacts || '', created_by, createdDate, created_by, createdDate
    ];

    const result = await pool.query(insertQuery, values);
    res.status(201).json({ success: true, data: result.rows[0], message: 'Lead created successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leads/:id
 * Update existing lead
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      company_id,
      company_url,
      company_type,
      name_of_coordinator,
      account_manager,
      industry,
      technology,
      lead_date,
      lead_time,
      city,
      country,
      probability,
      lead_type,
      status,
      status_detail,
      da,
      source,
      referrer,
      contract_no,
      currency_id,
      currency_code,
      amount,
      amount_in_inr,
      end_client,
      page_url,
      proposal,
      connection_sent,
      last_followup,
      reason,
      month,
      year,
      lost_won,
      contacts,
      modified_by = 'ADMIN',
    } = req.body;

    const leadRes = await pool.query('SELECT * FROM leads WHERE lead_id = $1', [id]);
    if (leadRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Lead with ID ${id} not found.` });
    }

    // Foreign key validation matching Oracle constraint FK_LEAD_COMPANY
    if (company_id !== undefined && company_id !== null && String(company_id).trim() !== '') {
      const parsedCompanyId = parseInt(company_id, 10);
      if (isNaN(parsedCompanyId) || parsedCompanyId <= 0) {
        return res.status(400).json({ success: false, message: 'Company ID must be a valid positive integer.' });
      }
      const compCheck = await pool.query('SELECT id FROM companies WHERE id = $1 LIMIT 1', [parsedCompanyId]);
      if (compCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: `Company ID ${parsedCompanyId} does not exist.` });
      }
    }

    // Validate non-negative numbers on amount
    if (amount !== undefined && amount !== null && String(amount).trim() !== '') {
      const numAmt = Number(amount);
      if (isNaN(numAmt) || numAmt < 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a non-negative number.' });
      }
    }
    if (amount_in_inr !== undefined && amount_in_inr !== null && String(amount_in_inr).trim() !== '') {
      const numInr = Number(amount_in_inr);
      if (isNaN(numInr) || numInr < 0) {
        return res.status(400).json({ success: false, message: 'Amount (INR) must be a non-negative number.' });
      }
    }

    // Date format validations
    if (lead_date && !/^\d{2}\/\d{2}\/\d{4}$/.test(lead_date) && !/^\d{4}-\d{2}-\d{2}$/.test(lead_date)) {
      return res.status(400).json({ success: false, message: 'Invalid Lead Date format (expected DD/MM/YYYY).' });
    }
    if (last_followup && !/^\d{2}\/\d{2}\/\d{4}$/.test(last_followup) && !/^\d{4}-\d{2}-\d{2}$/.test(last_followup)) {
      return res.status(400).json({ success: false, message: 'Invalid Last Followup date format (expected DD/MM/YYYY).' });
    }

    // Duplicate check on contract_no if provided
    if (contract_no && contract_no.trim()) {
      const dupContract = await pool.query(
        'SELECT lead_id FROM leads WHERE LOWER(TRIM(contract_no)) = LOWER(TRIM($1)) AND lead_id != $2',
        [contract_no.trim(), id]
      );
      if (dupContract.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Contract Number '${contract_no.trim()}' is already used by another lead.` });
      }
    }

    const modifiedDate = formatOracleDate(new Date());

    const updateQuery = `
      UPDATE leads SET
        company_name = COALESCE($1, company_name),
        company_id = COALESCE($2, company_id),
        company_url = COALESCE($3, company_url),
        company_type = COALESCE($4, company_type),
        name_of_coordinator = COALESCE($5, name_of_coordinator),
        account_manager = COALESCE($6, account_manager),
        industry = COALESCE($7, industry),
        technology = COALESCE($8, technology),
        lead_date = COALESCE($9, lead_date),
        lead_time = COALESCE($10, lead_time),
        city = COALESCE($11, city),
        country = COALESCE($12, country),
        probability = COALESCE($13, probability),
        lead_type = COALESCE($14, lead_type),
        status = COALESCE($15, status),
        status_detail = COALESCE($16, status_detail),
        da = COALESCE($17, da),
        source = COALESCE($18, source),
        referrer = COALESCE($19, referrer),
        contract_no = COALESCE($20, contract_no),
        currency_id = COALESCE($21, currency_id),
        currency_code = COALESCE($22, currency_code),
        amount = COALESCE($23, amount),
        amount_in_inr = COALESCE($24, amount_in_inr),
        end_client = COALESCE($25, end_client),
        page_url = COALESCE($26, page_url),
        proposal = COALESCE($27, proposal),
        connection_sent = COALESCE($28, connection_sent),
        last_followup = COALESCE($29, last_followup),
        reason = COALESCE($30, reason),
        month = COALESCE($31, month),
        year = COALESCE($32, year),
        lost_won = COALESCE($33, lost_won),
        contacts = COALESCE($34, contacts),
        modified_by = $35,
        modified_date = $36
      WHERE lead_id = $37
      RETURNING *
    `;

    const values = [
      company_name !== undefined ? company_name : null,
      company_id !== undefined ? (company_id ? parseInt(company_id, 10) : null) : null,
      company_url !== undefined ? company_url : null,
      company_type !== undefined ? company_type : null,
      name_of_coordinator !== undefined ? name_of_coordinator : null,
      account_manager !== undefined ? account_manager : null,
      industry !== undefined ? industry : null,
      technology !== undefined ? technology : null,
      lead_date !== undefined ? lead_date : null,
      lead_time !== undefined ? lead_time : null,
      city !== undefined ? city : null,
      country !== undefined ? country : null,
      probability !== undefined ? probability : null,
      lead_type !== undefined ? lead_type : null,
      status !== undefined ? status : null,
      status_detail !== undefined ? status_detail : null,
      da !== undefined ? da : null,
      source !== undefined ? source : null,
      referrer !== undefined ? referrer : null,
      contract_no !== undefined ? contract_no : null,
      currency_id !== undefined ? (currency_id ? parseInt(currency_id, 10) : null) : null,
      currency_code !== undefined ? currency_code : null,
      amount !== undefined ? (amount !== '' ? parseFloat(amount) : null) : null,
      amount_in_inr !== undefined ? (amount_in_inr !== '' ? parseFloat(amount_in_inr) : null) : null,
      end_client !== undefined ? end_client : null,
      page_url !== undefined ? page_url : null,
      proposal !== undefined ? proposal : null,
      connection_sent !== undefined ? connection_sent : null,
      last_followup !== undefined ? last_followup : null,
      reason !== undefined ? reason : null,
      month !== undefined ? month : null,
      year !== undefined ? (year ? parseInt(year, 10) : null) : null,
      lost_won !== undefined ? lost_won : null,
      contacts !== undefined ? contacts : null,
      modified_by,
      modifiedDate,
      id
    ];

    const result = await pool.query(updateQuery, values);
    res.json({ success: true, data: result.rows[0], message: 'Lead updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/:id
 * Delete lead and child entities
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lead_lines WHERE lead_id = $1', [id]);
    await pool.query('DELETE FROM lead_contacts WHERE lead_id = $1', [id]);
    await pool.query('DELETE FROM naukri_advertisements WHERE lead_id = $1', [id]);
    await pool.query('DELETE FROM lead_proposals WHERE lead_id = $1', [id]);
    await pool.query('DELETE FROM lead_resources WHERE lead_id = $1', [id]);
    const del = await pool.query('DELETE FROM leads WHERE lead_id = $1 RETURNING lead_id', [id]);
    if (del.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Lead ${id} not found.` });
    }
    res.json({ success: true, message: 'Lead deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/change-account-manager
 * Bulk update account manager
 */
router.post('/change-account-manager', async (req, res, next) => {
  try {
    const { leadIds, accountManager } = req.body;
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads selected.' });
    }
    if (!accountManager || !accountManager.trim()) {
      return res.status(400).json({ success: false, message: 'Account Manager is required.' });
    }

    const modifiedDate = formatOracleDate(new Date());
    await pool.query(
      `UPDATE leads SET account_manager = $1, modified_by = 'ADMIN', modified_date = $2 WHERE lead_id = ANY($3)`,
      [accountManager.trim(), modifiedDate, leadIds]
    );

    res.json({ success: true, message: `Updated Account Manager for ${leadIds.length} lead(s).` });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// LEAD LINES ENDPOINTS
// ==========================================

/**
 * GET /api/leads/:id/lines
 */
router.get('/:id/lines', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM lead_lines WHERE lead_id = $1 ORDER BY lead_line_id ASC',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/:id/lines
 */
router.post('/:id/lines', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      technology,
      technology_required,
      experience,
      model,
      currency_id,
      currency_code,
      rate,
      no_of_resources,
      duration,
      amount,
      exchange_rate_value,
      amount_in_inr,
      required_service,
      requirement_description,
      cv_made_by,
      cv_sent,
      created_by = 'ADMIN',
    } = req.body;

    const maxLineId = await pool.query('SELECT COALESCE(MAX(lead_line_id), 0) + 1 as next_id FROM lead_lines');
    const nextLineId = parseInt(maxLineId.rows[0].next_id, 10);

    const createdDate = formatOracleDate(new Date());

    const result = await pool.query(`
      INSERT INTO lead_lines (
        lead_line_id, lead_id, technology, technology_required, experience, model,
        currency_id, currency_code, rate, no_of_resources, duration,
        amount, exchange_rate_value, amount_in_inr, required_service,
        requirement_description, cv_made_by, cv_sent, created_by, created_date,
        modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22
      ) RETURNING *
    `, [
      nextLineId, id, technology || '', technology_required || '', experience || '', model || '',
      currency_id ? parseInt(currency_id, 10) : null, currency_code || '',
      rate ? parseFloat(rate) : null, no_of_resources || '', duration || '',
      amount ? parseFloat(amount) : null, exchange_rate_value ? parseFloat(exchange_rate_value) : null,
      amount_in_inr ? parseFloat(amount_in_inr) : null, required_service || '',
      requirement_description || '', cv_made_by || '', cv_sent || 'No',
      created_by, createdDate, created_by, createdDate
    ]);

    // Update parent lead's technology summary if needed
    if (technology || technology_required) {
      const techName = technology || technology_required;
      await pool.query(`
        UPDATE leads SET 
          technology = CASE 
            WHEN technology IS NULL OR technology = '' THEN $1 
            WHEN LOWER(technology) NOT LIKE '%' || LOWER($1) || '%' THEN technology || ', ' || $1 
            ELSE technology 
          END 
        WHERE lead_id = $2
      `, [techName, id]);
    }

    res.status(201).json({ success: true, data: result.rows[0], message: 'Lead line created.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leads/lines/:lineId
 */
router.put('/lines/:lineId', async (req, res, next) => {
  try {
    const { lineId } = req.params;
    const {
      technology,
      technology_required,
      experience,
      model,
      currency_id,
      currency_code,
      rate,
      no_of_resources,
      duration,
      amount,
      exchange_rate_value,
      amount_in_inr,
      required_service,
      requirement_description,
      cv_made_by,
      cv_sent,
      modified_by = 'ADMIN',
    } = req.body;

    const modifiedDate = formatOracleDate(new Date());

    const result = await pool.query(`
      UPDATE lead_lines SET
        technology = COALESCE($1, technology),
        technology_required = COALESCE($2, technology_required),
        experience = COALESCE($3, experience),
        model = COALESCE($4, model),
        currency_id = COALESCE($5, currency_id),
        currency_code = COALESCE($6, currency_code),
        rate = COALESCE($7, rate),
        no_of_resources = COALESCE($8, no_of_resources),
        duration = COALESCE($9, duration),
        amount = COALESCE($10, amount),
        exchange_rate_value = COALESCE($11, exchange_rate_value),
        amount_in_inr = COALESCE($12, amount_in_inr),
        required_service = COALESCE($13, required_service),
        requirement_description = COALESCE($14, requirement_description),
        cv_made_by = COALESCE($15, cv_made_by),
        cv_sent = COALESCE($16, cv_sent),
        modified_by = $17,
        modified_date = $18
      WHERE lead_line_id = $19
      RETURNING *
    `, [
      technology !== undefined ? technology : null,
      technology_required !== undefined ? technology_required : null,
      experience !== undefined ? experience : null,
      model !== undefined ? model : null,
      currency_id !== undefined ? (currency_id ? parseInt(currency_id, 10) : null) : null,
      currency_code !== undefined ? currency_code : null,
      rate !== undefined ? (rate !== '' ? parseFloat(rate) : null) : null,
      no_of_resources !== undefined ? no_of_resources : null,
      duration !== undefined ? duration : null,
      amount !== undefined ? (amount !== '' ? parseFloat(amount) : null) : null,
      exchange_rate_value !== undefined ? (exchange_rate_value !== '' ? parseFloat(exchange_rate_value) : null) : null,
      amount_in_inr !== undefined ? (amount_in_inr !== '' ? parseFloat(amount_in_inr) : null) : null,
      required_service !== undefined ? required_service : null,
      requirement_description !== undefined ? requirement_description : null,
      cv_made_by !== undefined ? cv_made_by : null,
      cv_sent !== undefined ? cv_sent : null,
      modified_by,
      modifiedDate,
      lineId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Line not found.' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Lead line updated.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/lines/:lineId
 */
router.delete('/lines/:lineId', async (req, res, next) => {
  try {
    const { lineId } = req.params;
    await pool.query('DELETE FROM lead_lines WHERE lead_line_id = $1', [lineId]);
    res.json({ success: true, message: 'Lead line deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// LEAD CONTACTS ENDPOINTS
// ==========================================

/**
 * GET /api/leads/:id/contacts
 */
router.get('/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM lead_contacts WHERE lead_id = $1 ORDER BY lead_contact_id ASC',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/:id/contacts
 * Add contact to lead with duplicate validation
 */
router.post('/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      contact_id,
      client_full_name,
      designation,
      position,
      email,
      mobile_number,
      interview_status,
      proposal,
      connection_sent,
      linkedin_url,
      department,
      role,
      created_by = 'ADMIN',
    } = req.body;

    if (!client_full_name && !email) {
      return res.status(400).json({ success: false, message: 'Contact Name or Email is required.' });
    }

    // Duplicate validation: within same lead, same email or contact_id cannot be added twice
    if (contact_id) {
      const dupRes = await pool.query('SELECT lead_contact_id FROM lead_contacts WHERE lead_id = $1 AND contact_id = $2', [id, contact_id]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'This contact is already associated with this lead.' });
      }
    } else if (email && email.trim()) {
      const dupRes = await pool.query('SELECT lead_contact_id FROM lead_contacts WHERE lead_id = $1 AND LOWER(TRIM(email)) = LOWER(TRIM($2))', [id, email.trim()]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Contact with email '${email.trim()}' is already attached to this lead.` });
      }
    }

    const maxIdRes = await pool.query('SELECT COALESCE(MAX(lead_contact_id), 0) + 1 as next_id FROM lead_contacts');
    const nextId = parseInt(maxIdRes.rows[0].next_id, 10);
    const createdDate = formatOracleDate(new Date());

    const result = await pool.query(`
      INSERT INTO lead_contacts (
        lead_contact_id, lead_id, contact_id, client_full_name, designation,
        position, email, mobile_number, interview_status, proposal,
        connection_sent, linkedin_url, department, role,
        created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18
      ) RETURNING *
    `, [
      nextId, id, contact_id ? parseInt(contact_id, 10) : null,
      (client_full_name || '').trim(), designation || '', position || '',
      email || '', mobile_number || '', interview_status || '', proposal || '',
      connection_sent || '', linkedin_url || '', department || '', role || '',
      created_by, createdDate, created_by, createdDate
    ]);

    // Also update parent lead's contacts summary string
    if (client_full_name) {
      await pool.query(`
        UPDATE leads SET 
          contacts = CASE 
            WHEN contacts IS NULL OR contacts = '' THEN $1 
            WHEN LOWER(contacts) NOT LIKE '%' || LOWER($1) || '%' THEN contacts || ', ' || $1 
            ELSE contacts 
          END 
        WHERE lead_id = $2
      `, [client_full_name.trim(), id]);
    }

    res.status(201).json({ success: true, data: result.rows[0], message: 'Lead contact added.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leads/contacts/:leadContactId
 */
router.put('/contacts/:leadContactId', async (req, res, next) => {
  try {
    const { leadContactId } = req.params;
    const {
      client_full_name,
      designation,
      position,
      email,
      mobile_number,
      interview_status,
      proposal,
      connection_sent,
      linkedin_url,
      department,
      role,
      modified_by = 'ADMIN',
    } = req.body;

    const modifiedDate = formatOracleDate(new Date());

    const result = await pool.query(`
      UPDATE lead_contacts SET
        client_full_name = COALESCE($1, client_full_name),
        designation = COALESCE($2, designation),
        position = COALESCE($3, position),
        email = COALESCE($4, email),
        mobile_number = COALESCE($5, mobile_number),
        interview_status = COALESCE($6, interview_status),
        proposal = COALESCE($7, proposal),
        connection_sent = COALESCE($8, connection_sent),
        linkedin_url = COALESCE($9, linkedin_url),
        department = COALESCE($10, department),
        role = COALESCE($11, role),
        modified_by = $12,
        modified_date = $13
      WHERE lead_contact_id = $14
      RETURNING *
    `, [
      client_full_name !== undefined ? client_full_name : null,
      designation !== undefined ? designation : null,
      position !== undefined ? position : null,
      email !== undefined ? email : null,
      mobile_number !== undefined ? mobile_number : null,
      interview_status !== undefined ? interview_status : null,
      proposal !== undefined ? proposal : null,
      connection_sent !== undefined ? connection_sent : null,
      linkedin_url !== undefined ? linkedin_url : null,
      department !== undefined ? department : null,
      role !== undefined ? role : null,
      modified_by,
      modifiedDate,
      leadContactId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Lead contact updated.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/contacts/:leadContactId
 */
router.delete('/contacts/:leadContactId', async (req, res, next) => {
  try {
    const { leadContactId } = req.params;
    await pool.query('DELETE FROM lead_contacts WHERE lead_contact_id = $1', [leadContactId]);
    res.json({ success: true, message: 'Lead contact removed.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// NAUKRI ADVERTISEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/leads/:id/naukri-ads
 */
router.get('/:id/naukri-ads', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM naukri_advertisements WHERE lead_id = $1 ORDER BY naukri_ad_id ASC',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/:id/naukri-ads
 */
router.post('/:id/naukri-ads', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      ad_name,
      designation,
      date_of_ad_posting,
      experience,
      cv_received,
      cv_join_immediately,
      cost_of_ad,
      technology,
      attachment_filename,
      attachment_mime_type,
      attachment_description,
      attachment_type,
      created_by = 'ADMIN',
    } = req.body;

    if (!ad_name) {
      return res.status(400).json({ success: false, message: 'Ad Name is required.' });
    }

    // Duplicate check on ad_name within same lead
    const dupAd = await pool.query(
      'SELECT naukri_ad_id FROM naukri_advertisements WHERE lead_id = $1 AND LOWER(TRIM(ad_name)) = LOWER(TRIM($2))',
      [id, ad_name.trim()]
    );
    if (dupAd.rows.length > 0) {
      return res.status(400).json({ success: false, message: `Ad '${ad_name.trim()}' already exists for this lead.` });
    }

    const maxIdRes = await pool.query('SELECT COALESCE(MAX(naukri_ad_id), 0) + 1 as next_id FROM naukri_advertisements');
    const nextId = parseInt(maxIdRes.rows[0].next_id, 10);
    const createdDate = formatOracleDate(new Date());

    const result = await pool.query(`
      INSERT INTO naukri_advertisements (
        naukri_ad_id, lead_id, ad_name, designation, date_of_ad_posting,
        experience, cv_received, cv_join_immediately, cost_of_ad,
        technology, attachment_filename, attachment_mime_type, attachment_description,
        attachment_type, created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18
      ) RETURNING *
    `, [
      nextId, id, ad_name.trim(), designation || '', date_of_ad_posting || formatOracleDate(new Date()),
      experience ? parseFloat(experience) : null,
      cv_received ? parseInt(cv_received, 10) : null,
      cv_join_immediately ? parseInt(cv_join_immediately, 10) : null,
      cost_of_ad ? parseFloat(cost_of_ad) : null,
      technology || '', attachment_filename || '', attachment_mime_type || '',
      attachment_description || '', attachment_type || '',
      created_by, createdDate, created_by, createdDate
    ]);

    res.status(201).json({ success: true, data: result.rows[0], message: 'Naukri advertisement created.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leads/naukri-ads/:naukriAdId
 */
router.put('/naukri-ads/:naukriAdId', async (req, res, next) => {
  try {
    const { naukriAdId } = req.params;
    const {
      ad_name,
      designation,
      date_of_ad_posting,
      experience,
      cv_received,
      cv_join_immediately,
      cost_of_ad,
      technology,
      attachment_filename,
      attachment_description,
      modified_by = 'ADMIN',
    } = req.body;

    const modifiedDate = formatOracleDate(new Date());

    const result = await pool.query(`
      UPDATE naukri_advertisements SET
        ad_name = COALESCE($1, ad_name),
        designation = COALESCE($2, designation),
        date_of_ad_posting = COALESCE($3, date_of_ad_posting),
        experience = COALESCE($4, experience),
        cv_received = COALESCE($5, cv_received),
        cv_join_immediately = COALESCE($6, cv_join_immediately),
        cost_of_ad = COALESCE($7, cost_of_ad),
        technology = COALESCE($8, technology),
        attachment_filename = COALESCE($9, attachment_filename),
        attachment_description = COALESCE($10, attachment_description),
        modified_by = $11,
        modified_date = $12
      WHERE naukri_ad_id = $13
      RETURNING *
    `, [
      ad_name !== undefined ? ad_name : null,
      designation !== undefined ? designation : null,
      date_of_ad_posting !== undefined ? date_of_ad_posting : null,
      experience !== undefined ? (experience !== '' ? parseFloat(experience) : null) : null,
      cv_received !== undefined ? (cv_received !== '' ? parseInt(cv_received, 10) : null) : null,
      cv_join_immediately !== undefined ? (cv_join_immediately !== '' ? parseInt(cv_join_immediately, 10) : null) : null,
      cost_of_ad !== undefined ? (cost_of_ad !== '' ? parseFloat(cost_of_ad) : null) : null,
      technology !== undefined ? technology : null,
      attachment_filename !== undefined ? attachment_filename : null,
      attachment_description !== undefined ? attachment_description : null,
      modified_by,
      modifiedDate,
      naukriAdId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Naukri AD not found.' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Naukri AD updated.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/naukri-ads/:naukriAdId
 */
router.delete('/naukri-ads/:naukriAdId', async (req, res, next) => {
  try {
    const { naukriAdId } = req.params;
    await pool.query('DELETE FROM naukri_advertisements WHERE naukri_ad_id = $1', [naukriAdId]);
    res.json({ success: true, message: 'Naukri AD deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// PROPOSALS ENDPOINTS
// ==========================================

/**
 * GET /api/leads/:id/proposals
 */
router.get('/:id/proposals', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM lead_proposals WHERE lead_id = $1 ORDER BY proposal_id ASC',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/:id/proposals
 * Add proposal with unique proposal_number constraint
 */
router.post('/:id/proposals', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      proposal_number,
      date_sent,
      proposal_description,
      file_name,
      mime_type = 'application/pdf',
      created_by = 'ADMIN',
    } = req.body;

    if (!proposal_number || !proposal_number.trim()) {
      return res.status(400).json({ success: false, message: 'Proposal Number is required.' });
    }

    // Strict Case-Insensitive Unique Check on Proposal Number (matches UK_PROPOSALS_NUMBER in MCP)
    const dupRes = await pool.query(
      'SELECT proposal_id FROM lead_proposals WHERE LOWER(TRIM(proposal_number)) = LOWER(TRIM($1))',
      [proposal_number.trim()]
    );
    if (dupRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: `Proposal Number '${proposal_number.trim()}' already exists. Proposals must be unique.` });
    }

    const maxIdRes = await pool.query('SELECT COALESCE(MAX(proposal_id), 0) + 1 as next_id FROM lead_proposals');
    const nextId = parseInt(maxIdRes.rows[0].next_id, 10);
    const createdDate = formatOracleDate(new Date());

    const result = await pool.query(`
      INSERT INTO lead_proposals (
        proposal_id, lead_id, proposal_number, date_sent,
        proposal_description, file_name, mime_type,
        created_by, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      nextId, id, proposal_number.trim(), date_sent || formatOracleDate(new Date()),
      proposal_description || '', file_name || '', mime_type,
      created_by, createdDate
    ]);

    // Update parent lead proposal status to 'Yes'
    await pool.query(`UPDATE leads SET proposal = 'Yes' WHERE lead_id = $1`, [id]);

    res.status(201).json({ success: true, data: result.rows[0], message: 'Proposal created.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/leads/proposals/:proposalId
 */
router.put('/proposals/:proposalId', async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    const {
      proposal_number,
      date_sent,
      proposal_description,
      file_name,
    } = req.body;

    if (proposal_number && proposal_number.trim()) {
      const dupRes = await pool.query(
        'SELECT proposal_id FROM lead_proposals WHERE LOWER(TRIM(proposal_number)) = LOWER(TRIM($1)) AND proposal_id != $2',
        [proposal_number.trim(), proposalId]
      );
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Proposal Number '${proposal_number.trim()}' is already used by another proposal.` });
      }
    }

    const result = await pool.query(`
      UPDATE lead_proposals SET
        proposal_number = COALESCE($1, proposal_number),
        date_sent = COALESCE($2, date_sent),
        proposal_description = COALESCE($3, proposal_description),
        file_name = COALESCE($4, file_name)
      WHERE proposal_id = $5
      RETURNING *
    `, [
      proposal_number !== undefined ? proposal_number.trim() : null,
      date_sent !== undefined ? date_sent : null,
      proposal_description !== undefined ? proposal_description : null,
      file_name !== undefined ? file_name : null,
      proposalId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found.' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Proposal updated.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/proposals/:proposalId
 */
router.delete('/proposals/:proposalId', async (req, res, next) => {
  try {
    const { proposalId } = req.params;
    await pool.query('DELETE FROM lead_proposals WHERE proposal_id = $1', [proposalId]);
    res.json({ success: true, message: 'Proposal deleted.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// LEAD RESOURCES ENDPOINTS (Child of Lead Line)
// ==========================================

/**
 * GET /api/leads/:id/resources
 */
router.get('/:id/resources', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lineId } = req.query;
    let query = 'SELECT * FROM lead_resources WHERE lead_id = $1';
    const params = [id];
    if (lineId) {
      params.push(lineId);
      query += ` AND lead_line_id = $2`;
    }
    query += ' ORDER BY resource_id ASC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads/:id/resources
 */
router.post('/:id/resources', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      lead_line_id,
      resource_type = 'Iqra Employee',
      resource_name,
      designation,
      technology,
      status = 'Allocated',
      created_by = 'ADMIN',
    } = req.body;

    if (!resource_name || !resource_name.trim()) {
      return res.status(400).json({ success: false, message: 'Resource Name is required.' });
    }

    const maxIdRes = await pool.query('SELECT COALESCE(MAX(resource_id), 0) + 1 as next_id FROM lead_resources');
    const nextId = parseInt(maxIdRes.rows[0].next_id, 10);
    const createdDate = formatOracleDate(new Date());

    const result = await pool.query(`
      INSERT INTO lead_resources (
        resource_id, lead_line_id, lead_id, resource_type,
        resource_name, designation, technology, status,
        created_by, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      nextId, lead_line_id ? parseInt(lead_line_id, 10) : null, id,
      resource_type, resource_name.trim(), designation || '', technology || '',
      status, created_by, createdDate
    ]);

    res.status(201).json({ success: true, data: result.rows[0], message: 'Resource added.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/resources/:resourceId
 */
router.delete('/resources/:resourceId', async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    await pool.query('DELETE FROM lead_resources WHERE resource_id = $1', [resourceId]);
    res.json({ success: true, message: 'Resource removed.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

