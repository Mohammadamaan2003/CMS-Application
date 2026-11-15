const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const localStore = require('../services/localStore');
const uploadService = require('../services/companyUploadService');

/**
 * GET /api/companies
 * Retrieves paginated, searchable, and filterable companies.
 * Supports scope='local' (default synced records) or scope='all' (full connected CRM.COMPANY live query).
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      scope = 'local',
      search = '',
      id_from = '',
      id_to = '',
      name = '',
      comp_name = '',
      technology = '',
      company_type = '',
      company_categories = '',
      categories = '',
      country = '',
      city = '',
      website = '',
      lead_count = '',
      employee_size = '',
      contact_count = '',
      source = '',
      industry = '',
      remark = '',
      registration_date = '',
      registration_status = '',
      supplier_number = '',
      created_from = '',
      created_to = '',
      modified_from = '',
      modified_to = '',
      created_by = '',
      phone = '',
      companyphone = '',
      sortBy = 'id',
      sortOrder = 'DESC',
      limit = 50,
      page = 1,
      offset = null,
    } = req.query;

    const parsedLimit = (limit === 'all' || limit === 'All') ? 50000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 50000));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedOffset = offset !== null ? Math.max(0, parseInt(offset, 10)) : (parsedPage - 1) * parsedLimit;

    // Check if PostgreSQL is available and has data
    let usePostgres = false;
    try {
      const countRes = await db.query('SELECT COUNT(*)::int AS total FROM companies');
      if (countRes.rows[0] && countRes.rows[0].total > 0) {
        usePostgres = true;
      }
    } catch (e) {
      usePostgres = false;
    }

    if (!usePostgres) {
      const result = localStore.getCompanies({
        search,
        id_from,
        id_to,
        name: name || comp_name,
        comp_name: name || comp_name,
        industry,
        country,
        city,
        website,
        technology,
        company_type,
        company_categories: company_categories || categories,
        lead_count,
        employee_size,
        contact_count,
        source,
        remark,
        registration_date,
        registration_status,
        supplier_number,
        created_from,
        created_to,
        modified_from,
        modified_to,
        created_by,
        phone: phone || companyphone,
        companyphone: phone || companyphone,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        page: parsedPage,
        offset: parsedOffset,
      });

      // Strip credentials
      result.data.forEach((r) => {
        delete r.password;
        delete r.username;
      });

      return res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        source: 'local_database',
        scope: 'local',
      });
    }

    const conditions = [];
    const params = [];

    // Global Search query
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const sIndex = params.length;
      conditions.push(`(
        c.name ILIKE $${sIndex} OR 
        c.comp_name ILIKE $${sIndex} OR 
        c.industry ILIKE $${sIndex} OR 
        c.technology ILIKE $${sIndex} OR 
        c.company_type ILIKE $${sIndex} OR 
        c.employee_size ILIKE $${sIndex} OR 
        c.city ILIKE $${sIndex} OR 
        c.country ILIKE $${sIndex} OR 
        c.phone ILIKE $${sIndex} OR 
        c.companyphone ILIKE $${sIndex} OR 
        c.email ILIKE $${sIndex} OR 
        c.com_email ILIKE $${sIndex} OR 
        CAST(c.id AS TEXT) ILIKE $${sIndex}
      )`);
    }

    // ID Range
    if (id_from && !isNaN(parseInt(id_from, 10))) {
      params.push(parseInt(id_from, 10));
      conditions.push(`c.id >= $${params.length}`);
    }
    if (id_to && !isNaN(parseInt(id_to, 10))) {
      params.push(parseInt(id_to, 10));
      conditions.push(`c.id <= $${params.length}`);
    }

    // Company Name
    const targetName = (name || comp_name || '').trim();
    if (targetName) {
      params.push(`%${targetName}%`);
      conditions.push(`(c.comp_name ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }

    // Technology
    if (technology && technology.trim() !== '') {
      params.push(`%${technology.trim()}%`);
      conditions.push(`c.technology ILIKE $${params.length}`);
    }

    // Company Type
    if (company_type && company_type.trim() !== '') {
      params.push(company_type.trim());
      conditions.push(`c.company_type = $${params.length}`);
    }

    // Categories
    const targetCat = (company_categories || categories || '').trim();
    if (targetCat) {
      params.push(targetCat);
      conditions.push(`c.company_categories = $${params.length}`);
    }

    // Country
    if (country && country.trim() !== '') {
      params.push(country.trim());
      conditions.push(`c.country = $${params.length}`);
    }

    // City
    if (city && city.trim() !== '') {
      params.push(`%${city.trim()}%`);
      conditions.push(`c.city ILIKE $${params.length}`);
    }

    // Website
    if (website && website.trim() !== '') {
      params.push(`%${website.trim()}%`);
      conditions.push(`c.website ILIKE $${params.length}`);
    }

    // Lead Count
    if (lead_count !== '' && !isNaN(parseInt(lead_count, 10))) {
      params.push(parseInt(lead_count, 10));
      conditions.push(`c.lead_count = $${params.length}`);
    }

    // Employee Size
    if (employee_size && employee_size.trim() !== '') {
      params.push(employee_size.trim());
      conditions.push(`c.employee_size = $${params.length}`);
    }

    // Contact Count (dynamic filtering)
    if (contact_count !== '' && !isNaN(parseInt(contact_count, 10))) {
      params.push(parseInt(contact_count, 10));
      conditions.push(`COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) = $${params.length}`);
    }

    // Source
    if (source && source.trim() !== '') {
      params.push(source.trim());
      conditions.push(`c.source = $${params.length}`);
    }

    // Industry
    if (industry && industry.trim() !== '') {
      params.push(industry.trim());
      conditions.push(`c.industry = $${params.length}`);
    }

    // Remark
    if (remark && remark.trim() !== '') {
      params.push(`%${remark.trim()}%`);
      conditions.push(`(c.remark ILIKE $${params.length} OR c.remarks ILIKE $${params.length})`);
    }

    // Registration Date
    if (registration_date && registration_date.trim() !== '') {
      params.push(`%${registration_date.trim()}%`);
      conditions.push(`c.registration_date ILIKE $${params.length}`);
    }

    // Registration Status
    if (registration_status && registration_status.trim() !== '') {
      params.push(registration_status.trim());
      conditions.push(`c.registration_status = $${params.length}`);
    }

    // Supplier Number
    if (supplier_number && supplier_number.trim() !== '') {
      params.push(supplier_number.trim());
      conditions.push(`c.supplier_number = $${params.length}`);
    }

    // Created By
    if (created_by && created_by.trim() !== '') {
      params.push(created_by.trim());
      conditions.push(`c.created_by = $${params.length}`);
    }

    // Company Phone
    const targetPhone = (phone || companyphone || '').trim();
    if (targetPhone) {
      params.push(`%${targetPhone}%`);
      conditions.push(`(c.companyphone ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    // Date Ranges
    if (created_from && created_from.trim() !== '') {
      params.push(created_from.trim());
      conditions.push(`(c.created_date >= $${params.length} OR TO_CHAR(c.created_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (created_to && created_to.trim() !== '') {
      params.push(created_to.trim());
      conditions.push(`(c.created_date <= $${params.length} OR TO_CHAR(c.created_at, 'YYYY-MM-DD') <= $${params.length})`);
    }
    if (modified_from && modified_from.trim() !== '') {
      params.push(modified_from.trim());
      conditions.push(`(c.modified_date >= $${params.length} OR TO_CHAR(c.updated_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (modified_to && modified_to.trim() !== '') {
      params.push(modified_to.trim());
      conditions.push(`(c.modified_date <= $${params.length} OR TO_CHAR(c.updated_at, 'YYYY-MM-DD') <= $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Safe Sort
    const validSortFields = {
      id: 'c.id',
      name: 'c.comp_name',
      comp_name: 'c.comp_name',
      contact_count: 'contact_count',
      lead_count: 'c.lead_count',
      employee_size: 'c.employee_size',
      technology: 'c.technology',
      industry: 'c.industry',
      company_type: 'c.company_type',
      created_at: 'c.created_at',
      created_date: 'c.created_date',
    };
    const sortField = validSortFields[sortBy] || 'c.id';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count Total
    const countSql = `SELECT COUNT(*)::int AS total FROM companies c ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0].total;

    // Data Query with Dynamic Associated Contact Counts
    const dataSql = `
      SELECT 
        c.*,
        COALESCE(c.comp_name, c.name) AS name,
        COALESCE(c.comp_name, c.name) AS comp_name,
        COALESCE(c.companyphone, c.phone) AS phone,
        COALESCE(c.companyphone, c.phone) AS companyphone,
        COALESCE(c.com_email, c.email) AS email,
        COALESCE(c.com_email, c.email) AS com_email,
        COALESCE(c.existingcomp, c.existing_comp) AS existingcomp,
        COALESCE(c.existingcomp, c.existing_comp) AS existing_comp,
        COALESCE(c.remark, c.remarks) AS remark,
        COALESCE(c.remark, c.remarks) AS remarks,
        COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) AS contact_count,
        COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) AS contacts_count,
        COALESCE(c.lead_count, 0) AS lead_count
      FROM companies c
      ${whereClause}
      ORDER BY ${sortField} ${sortDir} NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, parsedLimit, parsedOffset];
    const dataRes = await db.query(dataSql, dataParams);

    // Securely strip credentials from company list response and normalize undefined
    dataRes.rows.forEach((r) => {
      delete r.password;
      delete r.username;
      if (r.company_type === 'undefined') r.company_type = '';
    });

    res.json({
      success: true,
      data: dataRes.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      source: 'postgresql',
    });
  } catch (error) {
    console.warn('[Companies Route Handled]:', error.message);
    const fallback = localStore.getCompanies(req.query);
    (fallback.data || []).forEach((r) => {
      delete r.password;
      delete r.username;
      if (r.company_type === 'undefined') r.company_type = '';
    });
    res.json({
      success: true,
      data: fallback.data,
      total: fallback.total,
      page: fallback.page,
      limit: fallback.limit,
      totalPages: fallback.totalPages,
      source: 'local_database',
    });
  }
});

/**
 * GET /api/companies/ids
 * Returns all company IDs matching current filter criteria (for Select All throughout report).
 */
router.get('/ids', async (req, res, next) => {
  try {
    const {
      search = '',
      id_from = '',
      id_to = '',
      name = '',
      comp_name = '',
      technology = '',
      company_type = '',
      company_categories = '',
      categories = '',
      country = '',
      city = '',
      website = '',
      lead_count = '',
      employee_size = '',
      contact_count = '',
      source = '',
      industry = '',
      remark = '',
      registration_date = '',
      registration_status = '',
      supplier_number = '',
      created_from = '',
      created_to = '',
      modified_from = '',
      modified_to = '',
      created_by = '',
      phone = '',
      companyphone = '',
    } = req.query;

    const conditions = [];
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const sIndex = params.length;
      conditions.push(`(
        c.name ILIKE $${sIndex} OR 
        c.comp_name ILIKE $${sIndex} OR 
        c.industry ILIKE $${sIndex} OR 
        c.technology ILIKE $${sIndex} OR 
        c.company_type ILIKE $${sIndex} OR 
        c.employee_size ILIKE $${sIndex} OR 
        c.city ILIKE $${sIndex} OR 
        c.country ILIKE $${sIndex} OR 
        c.phone ILIKE $${sIndex} OR 
        c.companyphone ILIKE $${sIndex} OR 
        c.email ILIKE $${sIndex} OR 
        c.com_email ILIKE $${sIndex} OR 
        CAST(c.id AS TEXT) ILIKE $${sIndex}
      )`);
    }

    if (id_from && !isNaN(parseInt(id_from, 10))) {
      params.push(parseInt(id_from, 10));
      conditions.push(`c.id >= $${params.length}`);
    }
    if (id_to && !isNaN(parseInt(id_to, 10))) {
      params.push(parseInt(id_to, 10));
      conditions.push(`c.id <= $${params.length}`);
    }

    const targetName = (name || comp_name || '').trim();
    if (targetName) {
      params.push(`%${targetName}%`);
      conditions.push(`(c.comp_name ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }

    if (technology && technology.trim() !== '') {
      params.push(`%${technology.trim()}%`);
      conditions.push(`c.technology ILIKE $${params.length}`);
    }

    if (company_type && company_type.trim() !== '') {
      params.push(company_type.trim());
      conditions.push(`c.company_type = $${params.length}`);
    }

    const targetCat = (company_categories || categories || '').trim();
    if (targetCat) {
      params.push(targetCat);
      conditions.push(`c.company_categories = $${params.length}`);
    }

    if (country && country.trim() !== '') {
      params.push(country.trim());
      conditions.push(`c.country = $${params.length}`);
    }

    if (city && city.trim() !== '') {
      params.push(`%${city.trim()}%`);
      conditions.push(`c.city ILIKE $${params.length}`);
    }

    if (website && website.trim() !== '') {
      params.push(`%${website.trim()}%`);
      conditions.push(`c.website ILIKE $${params.length}`);
    }

    if (lead_count !== '' && !isNaN(parseInt(lead_count, 10))) {
      params.push(parseInt(lead_count, 10));
      conditions.push(`c.lead_count = $${params.length}`);
    }

    if (employee_size && employee_size.trim() !== '') {
      params.push(employee_size.trim());
      conditions.push(`c.employee_size = $${params.length}`);
    }

    if (contact_count !== '' && !isNaN(parseInt(contact_count, 10))) {
      params.push(parseInt(contact_count, 10));
      conditions.push(`COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) = $${params.length}`);
    }

    if (source && source.trim() !== '') {
      params.push(source.trim());
      conditions.push(`c.source = $${params.length}`);
    }

    if (industry && industry.trim() !== '') {
      params.push(industry.trim());
      conditions.push(`c.industry = $${params.length}`);
    }

    if (remark && remark.trim() !== '') {
      params.push(`%${remark.trim()}%`);
      conditions.push(`(c.remark ILIKE $${params.length} OR c.remarks ILIKE $${params.length})`);
    }

    if (registration_date && registration_date.trim() !== '') {
      params.push(`%${registration_date.trim()}%`);
      conditions.push(`c.registration_date ILIKE $${params.length}`);
    }

    if (registration_status && registration_status.trim() !== '') {
      params.push(registration_status.trim());
      conditions.push(`c.registration_status = $${params.length}`);
    }

    if (supplier_number && supplier_number.trim() !== '') {
      params.push(supplier_number.trim());
      conditions.push(`c.supplier_number = $${params.length}`);
    }

    if (created_by && created_by.trim() !== '') {
      params.push(created_by.trim());
      conditions.push(`c.created_by = $${params.length}`);
    }

    const targetPhone = (phone || companyphone || '').trim();
    if (targetPhone) {
      params.push(`%${targetPhone}%`);
      conditions.push(`(c.companyphone ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    if (created_from && created_from.trim() !== '') {
      params.push(created_from.trim());
      conditions.push(`(c.created_date >= $${params.length} OR TO_CHAR(c.created_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (created_to && created_to.trim() !== '') {
      params.push(created_to.trim());
      conditions.push(`(c.created_date <= $${params.length} OR TO_CHAR(c.created_at, 'YYYY-MM-DD') <= $${params.length})`);
    }
    if (modified_from && modified_from.trim() !== '') {
      params.push(modified_from.trim());
      conditions.push(`(c.modified_date >= $${params.length} OR TO_CHAR(c.updated_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (modified_to && modified_to.trim() !== '') {
      params.push(modified_to.trim());
      conditions.push(`(c.modified_date <= $${params.length} OR TO_CHAR(c.updated_at, 'YYYY-MM-DD') <= $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let ids = [];
    try {
      const idRes = await db.query(`SELECT c.id FROM companies c ${whereClause} ORDER BY c.id DESC`, params);
      ids = idRes.rows.map(r => r.id);
    } catch (e) {
      const fallback = localStore.getCompanies({ ...req.query, limit: 100000, page: 1 });
      ids = fallback.data.map(c => c.id);
    }

    res.json({ success: true, ids, total: ids.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/companies/filters
 * Returns unique distinct values for filter dropdowns.
 */
router.get('/filters', async (req, res, next) => {
  try {
    let indRes = { rows: [] };
    let ctryRes = { rows: [] };
    let techRes = { rows: [] };
    let typeRes = { rows: [] };
    let nameRes = { rows: [] };
    let catRes = { rows: [] };
    let cityRes = { rows: [] };
    let sizeRes = { rows: [] };
    let sourceRes = { rows: [] };
    let statusRes = { rows: [] };
    let suppRes = { rows: [] };
    let creatorRes = { rows: [] };
    let leadRes = { rows: [] };
    let remarkRes = { rows: [] };

    try {
      [
        indRes, ctryRes, techRes, typeRes, nameRes, catRes,
        cityRes, sizeRes, sourceRes, statusRes, suppRes, creatorRes,
        leadRes, remarkRes
      ] = await Promise.all([
        db.query(`SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL AND industry != '' ORDER BY industry ASC LIMIT 100`),
        db.query(`
          SELECT DISTINCT country FROM (
            SELECT country FROM master_countries WHERE country IS NOT NULL AND country != ''
            UNION
            SELECT country FROM companies WHERE country IS NOT NULL AND country != ''
          ) sub
          ORDER BY country ASC
          LIMIT 250
        `),
        db.query(`SELECT DISTINCT technology FROM companies WHERE technology IS NOT NULL AND technology != '' ORDER BY technology ASC LIMIT 100`),
        db.query(`SELECT DISTINCT company_type FROM companies WHERE company_type IS NOT NULL AND company_type != '' ORDER BY company_type ASC LIMIT 50`),
        db.query(`SELECT DISTINCT COALESCE(comp_name, name) as name FROM companies WHERE COALESCE(comp_name, name) IS NOT NULL AND COALESCE(comp_name, name) != '' ORDER BY name ASC LIMIT 100`),
        db.query(`SELECT DISTINCT company_categories FROM companies WHERE company_categories IS NOT NULL AND company_categories != '' ORDER BY company_categories ASC LIMIT 50`),
        db.query(`SELECT DISTINCT city FROM companies WHERE city IS NOT NULL AND city != '' ORDER BY city ASC LIMIT 100`),
        db.query(`SELECT DISTINCT employee_size FROM companies WHERE employee_size IS NOT NULL AND employee_size != '' ORDER BY employee_size ASC LIMIT 50`),
        db.query(`SELECT DISTINCT source FROM companies WHERE source IS NOT NULL AND source != '' ORDER BY source ASC LIMIT 50`),
        db.query(`SELECT DISTINCT registration_status FROM companies WHERE registration_status IS NOT NULL AND registration_status != '' ORDER BY registration_status ASC LIMIT 50`),
        db.query(`SELECT DISTINCT supplier_number FROM companies WHERE supplier_number IS NOT NULL AND supplier_number != '' ORDER BY supplier_number ASC LIMIT 50`),
        db.query(`SELECT DISTINCT created_by FROM companies WHERE created_by IS NOT NULL AND created_by != '' ORDER BY created_by ASC LIMIT 50`),
        db.query(`SELECT DISTINCT lead_count FROM companies WHERE lead_count IS NOT NULL ORDER BY lead_count ASC LIMIT 20`),
        db.query(`SELECT DISTINCT COALESCE(remark, remarks) as remark FROM companies WHERE COALESCE(remark, remarks) IS NOT NULL AND COALESCE(remark, remarks) != '' ORDER BY remark ASC LIMIT 50`),
      ]);
    } catch (e) {}

    if (indRes.rows.length === 0) {
      return res.json({
        success: true,
        data: localStore.getCompanyFilters(),
      });
    }

    res.json({
      success: true,
      data: {
        industries: indRes.rows.map((r) => r.industry),
        countries: ctryRes.rows.map((r) => r.country),
        technologies: techRes.rows.map((r) => r.technology),
        companyTypes: typeRes.rows.map((r) => r.company_type),
        companyNames: nameRes.rows.map((r) => r.name),
        categories: catRes.rows.map((r) => r.company_categories),
        cities: cityRes.rows.map((r) => r.city),
        employeeSizes: sizeRes.rows.map((r) => r.employee_size),
        sources: sourceRes.rows.map((r) => r.source),
        registrationStatuses: statusRes.rows.map((r) => r.registration_status),
        supplierNumbers: suppRes.rows.map((r) => r.supplier_number),
        createdBys: creatorRes.rows.map((r) => r.created_by),
        leadCounts: leadRes.rows.map((r) => String(r.lead_count)),
        remarks: remarkRes.rows.map((r) => r.remark),
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: localStore.getCompanyFilters(),
    });
  }
});

/**
 * GET /api/companies/upload/meta
 * Master lookup reference values for validation in upload workflow.
 */
router.get('/upload/meta', async (req, res, next) => {
  try {
    const meta = await uploadService.getUploadMeta();
    res.json({ success: true, data: meta });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/companies/upload/template
 * Download pre-formatted CSV template based on selected Upload Mode (Insert vs Update).
 */
router.get('/upload/template', (req, res) => {
  const mode = (req.query.mode || 'insert').toLowerCase();
  const csvContent = uploadService.getTemplateCsv(mode);
  const filename = mode === 'update' ? 'Company_Upload_Template_Update.csv' : 'Company_Upload_Template_Insert.csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

/**
 * POST /api/companies/upload/validate
 * Validates a staged batch of company rows against application rules & database.
 */
router.post('/upload/validate', async (req, res, next) => {
  try {
    const { rows, mode } = req.body;
    const validation = await uploadService.validateCompanyBatch(rows, mode || 'insert');
    res.json(validation);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/companies/upload/import
 * Imports validated companies into database within a transaction.
 */
router.post('/upload/import', async (req, res, next) => {
  try {
    const { rows, mode, policy } = req.body;
    const result = await uploadService.importCompanyBatch(rows, mode || 'insert', policy || 'skip');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/companies/:id
 * Retrieve a company by ID with its linked contacts.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    let comp = null;
    let contacts = [];

    try {
      const compRes = await db.query(`SELECT * FROM companies WHERE id = $1`, [id]);
      if (compRes.rows.length > 0) {
        comp = compRes.rows[0];
        const contactsRes = await db.query(
          `SELECT * FROM contacts WHERE company_id = $1 ORDER BY id DESC`,
          [id]
        );
        contacts = contactsRes.rows;
      }
    } catch (e) {}

    if (!comp) {
      const localComp = localStore.getCompany(id);
      if (localComp) {
        delete localComp.password;
        delete localComp.username;
        if (localComp.company_type === 'undefined') localComp.company_type = '';
        return res.json({
          success: true,
          data: localComp,
        });
      }
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    delete comp.password;
    delete comp.username;
    if (comp.company_type === 'undefined') comp.company_type = '';

    res.json({
      success: true,
      data: {
        ...comp,
        contacts,
      },
    });
  } catch (error) {
    const localComp = localStore.getCompany(req.params.id);
    if (localComp) {
      delete localComp.password;
      delete localComp.username;
      if (localComp.company_type === 'undefined') localComp.company_type = '';
      return res.json({ success: true, data: localComp });
    }
    res.status(404).json({ success: false, message: 'Company not found' });
  }
});

/**
 * POST /api/companies
 * Create a new company.
 */
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const name = b.name || b.COMP_NAME;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const trimmedName = name.trim();

    // 0. Validate Company Name uniqueness (case-insensitive & trimmed)
    if (db.isAvailable && db.isAvailable()) {
      const nameCheck = await db.query(
        'SELECT id, comp_name FROM companies WHERE LOWER(TRIM(COALESCE(comp_name, name, \'\'))) = LOWER(TRIM($1)) LIMIT 1',
        [trimmedName]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'name',
          message: `A company with the name "${trimmedName}" already exists (Company #${nameCheck.rows[0].id}). Duplicate company records are not allowed.`,
        });
      }
    }

    // 1. Validate EXISTINGCOMP (if supplied, must be Y or N)
    const rawExisting = b.existingcomp !== undefined ? b.existingcomp : b.existing_comp;
    let existingCompVal = 'N';
    if (rawExisting !== undefined && rawExisting !== null && String(rawExisting).trim() !== '') {
      const normalized = String(rawExisting).trim().toUpperCase();
      if (normalized !== 'Y' && normalized !== 'N') {
        return res.status(400).json({ success: false, field: 'existingcomp', message: 'EXISTINGCOMP, if supplied, must be Y or N.' });
      }
      existingCompVal = normalized;
    }

    // 2. Validate JOGET_ID (unique when supplied)
    const jogetId = (b.joget_id || '').trim();
    if (jogetId) {
      const jogetCheck = await db.query('SELECT id FROM companies WHERE TRIM(joget_id) = $1 LIMIT 1', [jogetId]);
      if (jogetCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'joget_id',
          message: `JOGET_ID "${jogetId}" already exists for Company #${jogetCheck.rows[0].id}.`,
        });
      }
    }

    // 3. Validate WEBSITE (unique when supplied)
    const websiteVal = (b.website || '').trim();
    if (websiteVal) {
      const websiteCheck = await db.query('SELECT id FROM companies WHERE TRIM(website) = $1 LIMIT 1', [websiteVal]);
      if (websiteCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'website',
          message: `WEBSITE "${websiteVal}" already exists for Company #${websiteCheck.rows[0].id}.`,
        });
      }
    }

    // 4. Validate REGISTRATION_STATUS (must match approved states)
    const allowedStatuses = ['Active', 'Pending', 'Suspended', 'In Review', 'In-Review'];
    let regStatus = (b.registration_status || '').trim();
    if (regStatus) {
      const match = allowedStatuses.find((s) => s.toLowerCase() === regStatus.toLowerCase());
      if (!match) {
        return res.status(400).json({
          success: false,
          field: 'registration_status',
          message: 'Registration Status must be one of: Active, Pending, Suspended, or In Review.',
        });
      }
      regStatus = match === 'In-Review' ? 'In Review' : match;
    }

    const localCreated = localStore.createCompany({ ...b, existingcomp: existingCompVal, existing_comp: existingCompVal, registration_status: regStatus });

    let savedCompany = localCreated;
    try {
      const insertSql = `
        INSERT INTO companies (
          name, comp_name, technology, industry, city, country, website, existing_comp, existingcomp, da,
          phone, companyphone, email, com_email, company_categories, company_type, employee_size, registered_url,
          registration_status, supplier_number, username, password, registration_date,
          source, remarks, remark, salesperson, prev_salesperson, joget_id, created_by, modified_by,
          created_date, modified_date
        ) VALUES (
          $1, $1, $2, $3, $4, $5, $6, $7, $7, $8,
          $9, $9, $10, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $21, $22, $23, $24, $25, $26,
          TO_CHAR(NOW(), 'DD-MON-YYYY'), TO_CHAR(NOW(), 'DD-MON-YYYY')
        )
        RETURNING *
      `;
      const params = [
        name.trim(),
        b.technology || null,
        b.industry || null,
        b.city || null,
        b.country || null,
        b.website || null,
        b.existing_comp || 'N',
        b.da || null,
        b.phone || b.companyphone || null,
        b.email || b.com_email || null,
        b.company_categories || null,
        b.company_type || 'Direct Client',
        b.employee_size || null,
        b.registered_url || null,
        regStatus || null,
        b.supplier_number || null,
        null, // Protect credentials: do not store plaintext username
        null, // Protect credentials: do not store plaintext password
        b.registration_date || null,
        b.source || null,
        b.remarks || b.remark || null,
        b.salesperson || null,
        b.prev_salesperson || null,
        b.joget_id || null,
        b.created_by || 'APEX_PUBLIC_USER',
        b.modified_by || 'APEX_PUBLIC_USER',
      ];
      const pgRes = await db.query(insertSql, params);
      if (pgRes && pgRes.rows[0]) {
        savedCompany = pgRes.rows[0];
      }
    } catch (e) {
      console.warn('[PG Insert Warning]:', e.message);
    }

    delete savedCompany.password;
    delete savedCompany.username;

    res.status(201).json({
      success: true,
      message: `Company "${savedCompany.name || savedCompany.comp_name}" created successfully.`,
      data: savedCompany,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/companies/:id
 * Update an existing company.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const name = b.comp_name || b.name || b.COMP_NAME;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    const trimmedName = name.trim();

    // 0. Validate Company Name uniqueness (case-insensitive & trimmed, excluding current company)
    if (db.isAvailable && db.isAvailable()) {
      const nameCheck = await db.query(
        'SELECT id, comp_name FROM companies WHERE LOWER(TRIM(COALESCE(comp_name, name, \'\'))) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
        [trimmedName, parseInt(id, 10)]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'name',
          message: `A company with the name "${trimmedName}" already exists (Company #${nameCheck.rows[0].id}). Duplicate company records are not allowed.`,
        });
      }
    }

    // 1. Validate EXISTINGCOMP (if supplied, must be Y or N)
    const rawExisting = b.existingcomp !== undefined ? b.existingcomp : b.existing_comp;
    let existingCompVal = 'N';
    if (rawExisting !== undefined && rawExisting !== null && String(rawExisting).trim() !== '') {
      const normalized = String(rawExisting).trim().toUpperCase();
      if (normalized !== 'Y' && normalized !== 'N') {
        return res.status(400).json({ success: false, field: 'existingcomp', message: 'EXISTINGCOMP, if supplied, must be Y or N.' });
      }
      existingCompVal = normalized;
    }

    // 2. Validate JOGET_ID (unique when supplied)
    const jogetId = (b.joget_id || '').trim();
    if (jogetId) {
      const jogetCheck = await db.query(
        'SELECT id FROM companies WHERE TRIM(joget_id) = $1 AND id != $2 LIMIT 1',
        [jogetId, parseInt(id, 10)]
      );
      if (jogetCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'joget_id',
          message: `JOGET_ID "${jogetId}" already exists for Company #${jogetCheck.rows[0].id}.`,
        });
      }
    }

    // 3. Validate WEBSITE (unique when supplied)
    const websiteVal = (b.website || '').trim();
    if (websiteVal) {
      const websiteCheck = await db.query(
        'SELECT id FROM companies WHERE TRIM(website) = $1 AND id != $2 LIMIT 1',
        [websiteVal, parseInt(id, 10)]
      );
      if (websiteCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'website',
          message: `WEBSITE "${websiteVal}" already exists for Company #${websiteCheck.rows[0].id}.`,
        });
      }
    }

    // 4. Validate REGISTRATION_STATUS (must match approved states)
    const allowedStatuses = ['Active', 'Pending', 'Suspended', 'In Review', 'In-Review'];
    let regStatus = (b.registration_status || '').trim();
    if (regStatus) {
      const match = allowedStatuses.find((s) => s.toLowerCase() === regStatus.toLowerCase());
      if (!match) {
        return res.status(400).json({
          success: false,
          field: 'registration_status',
          message: 'Registration Status must be one of: Active, Pending, Suspended, or In Review.',
        });
      }
      regStatus = match === 'In-Review' ? 'In Review' : match;
    }

    const localUpdated = localStore.updateCompany(id, { ...b, existingcomp: existingCompVal, existing_comp: existingCompVal, registration_status: regStatus });

    try {
      const updateSql = `
        UPDATE companies
        SET
          name = $1,
          comp_name = $1,
          technology = $2,
          industry = $3,
          city = $4,
          country = $5,
          website = $6,
          existing_comp = $7,
          existingcomp = $7,
          da = $8,
          phone = $9,
          companyphone = $9,
          email = $10,
          com_email = $10,
          company_categories = $11,
          company_type = $12,
          employee_size = $13,
          registered_url = $14,
          registration_status = $15,
          supplier_number = $16,
          registration_date = $17,
          source = $18,
          remarks = $19,
          remark = $19,
          salesperson = $20,
          prev_salesperson = $21,
          joget_id = $22,
          modified_by = $23,
          modified_date = TO_CHAR(NOW(), 'DD-MON-YYYY'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $24
        RETURNING *
      `;
      const params = [
        name.trim(),
        b.technology || null,
        b.industry || null,
        b.city || null,
        b.country || null,
        b.website || null,
        b.existing_comp || 'N',
        b.da || null,
        b.phone || b.companyphone || null,
        b.email || b.com_email || null,
        b.company_categories || null,
        b.company_type || 'Direct Client',
        b.employee_size || null,
        b.registered_url || null,
        regStatus || null,
        b.supplier_number || null,
        b.registration_date || null,
        b.source || null,
        b.remarks || b.remark || null,
        b.salesperson || null,
        b.prev_salesperson || null,
        b.joget_id || null,
        b.modified_by || 'ADMIN',
        parseInt(id, 10),
      ];
      const pgRes = await db.query(updateSql, params);
      const updatedCompany = pgRes && pgRes.rows[0] ? pgRes.rows[0] : (localUpdated || b);
      delete updatedCompany.password;
      delete updatedCompany.username;
      return res.json({
        success: true,
        message: `Company #${id} updated successfully.`,
        data: updatedCompany,
      });
    } catch (e) {
      console.warn('[PG Update Warning]:', e.message);
      const resData = localUpdated || b;
      delete resData.password;
      delete resData.username;
      return res.json({
        success: true,
        message: `Company #${id} updated locally.`,
        data: resData,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/companies/:id
 * Delete a company safely.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    localStore.deleteCompany(id);

    try {
      await db.query('UPDATE contacts SET company_id = NULL WHERE company_id = $1', [id]);
      await db.query('DELETE FROM companies WHERE id = $1', [id]);
    } catch (e) {
      console.warn('[PG Delete Warning]:', e.message);
    }

    res.json({
      success: true,
      message: `Company #${id} deleted successfully. Associated contacts have been unlinked safely.`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/bulk-delete
 * Delete multiple companies safely.
 */
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of IDs to delete.' });
    }

    const deletedCount = localStore.bulkDeleteCompanies(ids);

    try {
      await db.query('UPDATE contacts SET company_id = NULL WHERE company_id = ANY($1::int[])', [ids]);
      await db.query('DELETE FROM companies WHERE id = ANY($1::int[])', [ids]);
    } catch (e) {
      console.warn('[PG Bulk Delete Warning]:', e.message);
    }

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} company record(s). Contacts preserved safely.`,
      deletedCount: ids.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
