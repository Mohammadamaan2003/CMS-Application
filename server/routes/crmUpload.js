const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');
const companyUploadService = require('../services/companyUploadService');
const contactUploadService = require('../services/contactUploadService');

// ========================================================
// 0. BATCHES SUMMARY ENDPOINT
// ========================================================

function parseArrayParam(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof val === 'string') {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [String(val).trim()].filter(Boolean);
}

function toOracleDateStr(str) {
  if (!str) return '';
  const trimmed = String(str).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return trimmed;
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const mIdx = parseInt(m[2], 10) - 1;
  const mStr = months[mIdx] || '';
  return `${m[3]}-${mStr}-${m[1]}`;
}

/**
 * GET /api/crm-upload/batches
 * Distinct batch identifiers for filtering company and contact invalid records
 */
router.get('/batches', async (req, res, next) => {
  try {
    const compBatchesRes = await pool.query(`
      SELECT batch_id, COUNT(*)::int AS count, MIN(error_date) AS min_date, MAX(error_date) AS max_date
      FROM company_incorrect_data
      WHERE batch_id IS NOT NULL
      GROUP BY batch_id
      ORDER BY batch_id DESC
    `);

    const contactBatchesRes = await pool.query(`
      SELECT batch_id, COUNT(*)::int AS count, MIN(error_date) AS min_date, MAX(error_date) AS max_date
      FROM contact_incorrect_data
      WHERE batch_id IS NOT NULL
      GROUP BY batch_id
      ORDER BY batch_id DESC
    `);

    res.json({
      success: true,
      companyBatches: compBatchesRes.rows,
      contactBatches: contactBatchesRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// 1. COMPANY INVALID DATA REPORT ENDPOINTS
// ========================================================

/**
 * GET /api/crm-upload/company-invalid-data
 * Paginated interactive report for invalid company upload rows with advanced filter criteria.
 */
router.get('/company-invalid-data', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'error_id',
      sortOrder = 'DESC',
      batch_id = '',
      mode = '',
      remark = '',
      comp_name_incorrect = '',
      website_incorrect = '',
      industry_incorrect = '',
      city_incorrect = '',
      country_incorrect = '',
      created_by = '',
      error_date = '',
      industry = '',
      created_date = '',
    } = req.query;

    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    let conditions = [];
    let params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(COALESCE(comp_name, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(error_message, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(technology, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(country, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(city, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(website, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(company_type, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(employee_size, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(salesperson, '')) LIKE $${pIdx}
      )`);
    }

    if (batch_id && batch_id.trim()) {
      params.push(parseInt(batch_id.trim(), 10) || 0);
      conditions.push(`batch_id = $${params.length}`);
    }

    // Mode filter (insert vs update vs fix_industry vs fix_technology)
    if (mode === 'insert') {
      conditions.push(`(LOWER(COALESCE(error_message, '')) NOT LIKE '%update%' OR LOWER(COALESCE(error_message, '')) LIKE '%already exists%')`);
    } else if (mode === 'update') {
      conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%update%'`);
    } else if (mode === 'fix_industry') {
      conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%industry%'`);
    } else if (mode === 'fix_technology') {
      conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%technology%'`);
    }

    // Remarks (multi-select support)
    const remarksList = parseArrayParam(remark);
    if (remarksList.length > 0) {
      const clauses = remarksList.map((r) => {
        params.push(`%${r.toLowerCase()}%`);
        return `LOWER(COALESCE(remark, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Company Name Incorrect (multi-select support)
    const compNameIncList = parseArrayParam(comp_name_incorrect).map((v) => v.toLowerCase());
    if (compNameIncList.length === 1) {
      if (compNameIncList[0] === 'yes' || compNameIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%company name%'`);
      } else if (compNameIncList[0] === 'no' || compNameIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%company name%'`);
      }
    }

    // Website Incorrect (multi-select support)
    const webIncList = parseArrayParam(website_incorrect).map((v) => v.toLowerCase());
    if (webIncList.length === 1) {
      if (webIncList[0] === 'yes' || webIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%website%'`);
      } else if (webIncList[0] === 'no' || webIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%website%'`);
      }
    }

    // Industry Incorrect (multi-select support)
    const indIncList = parseArrayParam(industry_incorrect).map((v) => v.toLowerCase());
    if (indIncList.length === 1) {
      if (indIncList[0] === 'yes' || indIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%industry%'`);
      } else if (indIncList[0] === 'no' || indIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%industry%'`);
      }
    }

    // City Incorrect (multi-select support)
    const cityIncList = parseArrayParam(city_incorrect).map((v) => v.toLowerCase());
    if (cityIncList.length === 1) {
      if (cityIncList[0] === 'yes' || cityIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%city%'`);
      } else if (cityIncList[0] === 'no' || cityIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%city%'`);
      }
    }

    // Country Incorrect (multi-select support)
    const countryIncList = parseArrayParam(country_incorrect).map((v) => v.toLowerCase());
    if (countryIncList.length === 1) {
      if (countryIncList[0] === 'yes' || countryIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%country%'`);
      } else if (countryIncList[0] === 'no' || countryIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%country%'`);
      }
    }

    // Created By (multi-select support)
    const createdByList = parseArrayParam(created_by);
    if (createdByList.length > 0) {
      const clauses = createdByList.map((c) => {
        params.push(`%${c.toLowerCase()}%`);
        return `LOWER(COALESCE(created_by, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Error Date
    if (error_date && error_date.trim()) {
      const raw = error_date.trim().toLowerCase();
      const ora = toOracleDateStr(error_date).toLowerCase();
      params.push(`%${raw}%`);
      const p1 = params.length;
      params.push(`%${ora}%`);
      const p2 = params.length;
      conditions.push(`(LOWER(COALESCE(error_date, '')) LIKE $${p1} OR LOWER(COALESCE(error_date, '')) LIKE $${p2})`);
    }

    // Industry (multi-select support)
    const indList = parseArrayParam(industry);
    if (indList.length > 0) {
      const clauses = indList.map((ind) => {
        params.push(`%${ind.toLowerCase()}%`);
        return `LOWER(COALESCE(industry, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Created Date
    if (created_date && created_date.trim()) {
      const raw = created_date.trim().toLowerCase();
      const ora = toOracleDateStr(created_date).toLowerCase();
      params.push(`%${raw}%`);
      const p1 = params.length;
      params.push(`%${ora}%`);
      const p2 = params.length;
      conditions.push(`(LOWER(COALESCE(created_date, '')) LIKE $${p1} OR LOWER(COALESCE(created_date, '')) LIKE $${p2})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortFields = [
      'error_id', 'batch_id', 'excel_row_no', 'comp_name', 'error_message',
      'technology', 'country', 'city', 'website', 'company_type', 'employee_size',
      'salesperson', 'error_date', 'created_date'
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'error_id';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*)::int AS total FROM company_incorrect_data ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataSql = `
      SELECT 
        error_id, batch_id, excel_row_no, source_id, error_message, error_date,
        comp_name, technology, country, existingcomp, companyphone, company_categories,
        company_type, registration_status, supplier_number, industry, city, website,
        da, com_email, remark, employee_size, salesperson, source, created_by, created_date,
        CASE
          WHEN LOWER(COALESCE(error_message, '')) LIKE '%industry%' THEN 'Industry "' || COALESCE(industry, '') || '" not found'
          ELSE ''
        END AS industry_incorrect,
        CASE
          WHEN LOWER(COALESCE(error_message, '')) LIKE '%technology%' THEN 'Technology "' || COALESCE(technology, '') || '" not found'
          ELSE ''
        END AS technology_incorrect
      FROM company_incorrect_data
      ${whereClause}
      ORDER BY ${sortField} ${direction}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await pool.query(dataSql, [...params, parsedLimit, offset]);

    res.json({
      success: true,
      data: dataRes.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-upload/company-invalid-data/filter-options
 * Distinct filter dropdown values for Company Invalid Data page.
 */
router.get('/company-invalid-data/filter-options', async (req, res, next) => {
  try {
    const createdByRes = await pool.query(`
      SELECT DISTINCT created_by FROM company_incorrect_data WHERE created_by IS NOT NULL AND created_by != '' ORDER BY created_by
    `);
    const industryRes = await pool.query(`
      SELECT DISTINCT industry FROM company_incorrect_data WHERE industry IS NOT NULL AND industry != '' ORDER BY industry LIMIT 200
    `);
    const compTypeRes = await pool.query(`
      SELECT DISTINCT company_type FROM company_incorrect_data WHERE company_type IS NOT NULL AND company_type != '' ORDER BY company_type
    `);
    const cityRes = await pool.query(`
      SELECT DISTINCT city FROM company_incorrect_data WHERE city IS NOT NULL AND city != '' ORDER BY city LIMIT 100
    `);
    const countryRes = await pool.query(`
      SELECT DISTINCT country FROM company_incorrect_data WHERE country IS NOT NULL AND country != '' ORDER BY country LIMIT 100
    `);

    res.json({
      success: true,
      createdByList: createdByRes.rows.map((r) => r.created_by),
      industryList: industryRes.rows.map((r) => r.industry),
      companyTypeList: compTypeRes.rows.map((r) => r.company_type).length > 0 ? compTypeRes.rows.map((r) => r.company_type) : ['Direct Client', 'IT Company', 'Partner', 'Vendor'],
      cityList: cityRes.rows.map((r) => r.city),
      countryList: countryRes.rows.map((r) => r.country),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/company-invalid-data/apply-changes
 * Bulk updates company_type or industry for selected error records.
 */
router.post('/company-invalid-data/apply-changes', async (req, res, next) => {
  try {
    const { ids, company_type, industry } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected to apply changes.' });
    }

    const updates = [];
    const params = [];
    if (company_type) {
      params.push(company_type);
      updates.push(`company_type = $${params.length}`);
    }
    if (industry) {
      params.push(industry);
      updates.push(`industry = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select a Company Type or Industry to apply.' });
    }

    params.push(ids);
    await pool.query(
      `UPDATE company_incorrect_data SET ${updates.join(', ')} WHERE error_id = ANY($${params.length}::int[])`,
      params
    );

    res.json({
      success: true,
      updatedCount: ids.length,
      message: `Successfully applied changes to ${ids.length} company error record(s).`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/crm-upload/company-invalid-data/:id
 * Delete single record by error_id
 */
router.delete('/company-invalid-data/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM company_incorrect_data WHERE error_id = $1', [id]);
    res.json({ success: true, message: `Error record #${id} removed.` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/company-invalid-data/clear
 * Clear all or bulk delete
 */
router.post('/company-invalid-data/clear', async (req, res, next) => {
  try {
    const { ids, all } = req.body;
    if (all) {
      await pool.query('DELETE FROM company_incorrect_data');
      return res.json({ success: true, message: 'All company incorrect data cleared.' });
    }
    if (Array.isArray(ids) && ids.length > 0) {
      await pool.query('DELETE FROM company_incorrect_data WHERE error_id = ANY($1::int[])', [ids]);
      return res.json({ success: true, message: `Removed ${ids.length} record(s).` });
    }
    return res.status(400).json({ success: false, message: 'Provide ids array or all=true' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/company-invalid-data/retry
 * Re-validates and imports corrected company error rows into the database.
 * Successfully imported rows are automatically removed from company_incorrect_data.
 */
router.post('/company-invalid-data/retry', async (req, res, next) => {
  try {
    const { rows, mode = 'insert' } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided for retry.' });
    }

    // 1. Re-validate rows
    const validation = await companyUploadService.validateCompanyBatch(rows, mode);
    const validItems = validation.results.filter((r) => r.isValid);
    const stillInvalidItems = validation.results.filter((r) => !r.isValid);

    let importedCount = 0;
    const resolvedErrorIds = [];

    // 2. Import valid items
    if (validItems.length > 0) {
      const importRes = await companyUploadService.importCompanyBatch(validItems, mode, 'skip');
      importedCount = importRes.importedCount;

      // Map resolved items to their original error_id
      for (const v of validItems) {
        const matchingRow = rows.find(
          (orig) => orig.excel_row_no === v.excel_row_no || orig.__sourceRowNumber === v.sourceRowNumber || (orig.error_id && (orig.comp_name === v.normalized?.comp_name || orig.company_name === v.normalized?.comp_name))
        );
        if (matchingRow && matchingRow.error_id) {
          resolvedErrorIds.push(matchingRow.error_id);
        }
      }

      // 3. Remove resolved error records from company_incorrect_data
      if (resolvedErrorIds.length > 0) {
        await pool.query(
          `DELETE FROM company_incorrect_data WHERE error_id = ANY($1::int[])`,
          [resolvedErrorIds]
        );
      }
    }

    // 4. Update error_message for still invalid records
    for (const inv of stillInvalidItems) {
      const matchingRow = rows.find(
        (orig) => orig.excel_row_no === inv.excel_row_no || orig.__sourceRowNumber === inv.sourceRowNumber || (orig.error_id && (orig.comp_name === inv.normalized?.comp_name || orig.company_name === inv.normalized?.comp_name))
      );
      if (matchingRow && matchingRow.error_id) {
        const errorMsg = inv.errors.map((e) => typeof e === 'string' ? e : e.message).join(' | ');
        await pool.query(
          `UPDATE company_incorrect_data 
           SET error_message = $1, error_date = TO_CHAR(NOW(), 'DD-MON-YYYY')
           WHERE error_id = $2`,
          [errorMsg, matchingRow.error_id]
        );
      }
    }

    res.json({
      success: true,
      importedCount,
      stillInvalidCount: stillInvalidItems.length,
      resolvedErrorIds,
      message: `Retry complete: ${importedCount} company record(s) imported into CRM database, ${stillInvalidItems.length} row(s) remain invalid.`,
      validation,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// 2. CONTACT INCORRECT DATA REPORT ENDPOINTS
// ========================================================

/**
 * GET /api/crm-upload/contact-incorrect-data
 * Paginated interactive report for invalid contact upload rows with advanced filter criteria.
 */
router.get('/contact-incorrect-data', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'error_id',
      sortOrder = 'DESC',
      batch_id = '',
      mode = '',
      pos_type_incorrect = '',
      linkedin_url_incorrect = '',
      comp_email_incorrect = '',
      preferred_linkedin_incorrect = '',
      comp_id = '',
      designation = '',
      error_date = '',
      created_by = '',
      created_from = '',
      created_to = '',
      comp_name = '',
      error_message = '',
    } = req.query;

    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    let conditions = [];
    let params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(COALESCE(contact_name, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(comp_name, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(error_message, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(designation, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(pos_type, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(country, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(comp_email, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(contact_phone, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(linkedin_url, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(salesperson, '')) LIKE $${pIdx}
      )`);
    }

    if (batch_id && batch_id.trim()) {
      params.push(parseInt(batch_id.trim(), 10) || 0);
      conditions.push(`batch_id = $${params.length}`);
    }

    // Mode filter (insert vs update vs fix_designation)
    if (mode === 'insert') {
      conditions.push(`(LOWER(COALESCE(error_message, '')) NOT LIKE '%update%' OR LOWER(COALESCE(error_message, '')) LIKE '%already exists%')`);
    } else if (mode === 'update') {
      conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%update%'`);
    } else if (mode === 'fix_designation') {
      // Focus on designation or position type errors
    }

    // Position Type Incorrect (multi-select support)
    const posIncList = parseArrayParam(pos_type_incorrect).map((v) => v.toLowerCase());
    if (posIncList.length === 1) {
      if (posIncList[0] === 'yes' || posIncList[0] === 'true') {
        conditions.push(`(LOWER(COALESCE(error_message, '')) LIKE '%position%' OR LOWER(COALESCE(error_message, '')) LIKE '%pos_type%')`);
      } else if (posIncList[0] === 'no' || posIncList[0] === 'false') {
        conditions.push(`(LOWER(COALESCE(error_message, '')) NOT LIKE '%position%' AND LOWER(COALESCE(error_message, '')) NOT LIKE '%pos_type%')`);
      }
    }

    // LinkedIn URL Incorrect (multi-select support)
    const linkIncList = parseArrayParam(linkedin_url_incorrect).map((v) => v.toLowerCase());
    if (linkIncList.length === 1) {
      if (linkIncList[0] === 'yes' || linkIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%linkedin%'`);
      } else if (linkIncList[0] === 'no' || linkIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%linkedin%'`);
      }
    }

    // Company Email Incorrect (multi-select support)
    const emailIncList = parseArrayParam(comp_email_incorrect).map((v) => v.toLowerCase());
    if (emailIncList.length === 1) {
      if (emailIncList[0] === 'yes' || emailIncList[0] === 'true') {
        conditions.push(`LOWER(COALESCE(error_message, '')) LIKE '%email%'`);
      } else if (emailIncList[0] === 'no' || emailIncList[0] === 'false') {
        conditions.push(`LOWER(COALESCE(error_message, '')) NOT LIKE '%email%'`);
      }
    }

    // Preferred LinkedIn Connected Account Incorrect (multi-select support)
    const prefIncList = parseArrayParam(preferred_linkedin_incorrect).map((v) => v.toLowerCase());
    if (prefIncList.length === 1) {
      if (prefIncList[0] === 'yes' || prefIncList[0] === 'true') {
        conditions.push(`(LOWER(COALESCE(error_message, '')) LIKE '%preferred%' OR LOWER(COALESCE(error_message, '')) LIKE '%connected%')`);
      } else if (prefIncList[0] === 'no' || prefIncList[0] === 'false') {
        conditions.push(`(LOWER(COALESCE(error_message, '')) NOT LIKE '%preferred%' AND LOWER(COALESCE(error_message, '')) NOT LIKE '%connected%')`);
      }
    }

    // Company ID (multi-select support)
    const compIdList = parseArrayParam(comp_id);
    if (compIdList.length > 0) {
      const clauses = compIdList.map((id) => {
        params.push(`%${id.toLowerCase()}%`);
        return `LOWER(COALESCE(comp_id::text, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Designation (multi-select support)
    const desigList = parseArrayParam(designation);
    if (desigList.length > 0) {
      const clauses = desigList.map((d) => {
        params.push(`%${d.toLowerCase()}%`);
        return `LOWER(COALESCE(designation, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Error Date
    if (error_date && error_date.trim()) {
      const raw = error_date.trim().toLowerCase();
      const ora = toOracleDateStr(error_date).toLowerCase();
      params.push(`%${raw}%`);
      const p1 = params.length;
      params.push(`%${ora}%`);
      const p2 = params.length;
      conditions.push(`(LOWER(COALESCE(error_date, '')) LIKE $${p1} OR LOWER(COALESCE(error_date, '')) LIKE $${p2})`);
    }

    // Created By (multi-select support)
    const contactCreatedByList = parseArrayParam(created_by);
    if (contactCreatedByList.length > 0) {
      const clauses = contactCreatedByList.map((c) => {
        params.push(`%${c.toLowerCase()}%`);
        return `LOWER(COALESCE(created_by, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Created From
    if (created_from && created_from.trim()) {
      const raw = created_from.trim().toLowerCase();
      const ora = toOracleDateStr(created_from).toLowerCase();
      params.push(`%${raw}%`);
      const p1 = params.length;
      params.push(`%${ora}%`);
      const p2 = params.length;
      conditions.push(`(LOWER(COALESCE(created_date, '')) LIKE $${p1} OR LOWER(COALESCE(created_date, '')) LIKE $${p2} OR LOWER(COALESCE(error_date, '')) LIKE $${p1} OR LOWER(COALESCE(error_date, '')) LIKE $${p2})`);
    }

    // Created To
    if (created_to && created_to.trim()) {
      const raw = created_to.trim().toLowerCase();
      const ora = toOracleDateStr(created_to).toLowerCase();
      params.push(`%${raw}%`);
      const p1 = params.length;
      params.push(`%${ora}%`);
      const p2 = params.length;
      conditions.push(`(LOWER(COALESCE(created_date, '')) LIKE $${p1} OR LOWER(COALESCE(created_date, '')) LIKE $${p2} OR LOWER(COALESCE(error_date, '')) LIKE $${p1} OR LOWER(COALESCE(error_date, '')) LIKE $${p2})`);
    }

    // Company Name (multi-select support)
    const contactCompNameList = parseArrayParam(comp_name);
    if (contactCompNameList.length > 0) {
      const clauses = contactCompNameList.map((cn) => {
        params.push(`%${cn.toLowerCase()}%`);
        return `LOWER(COALESCE(comp_name, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    // Error Message (multi-select support)
    const errMsgList = parseArrayParam(error_message);
    if (errMsgList.length > 0) {
      const clauses = errMsgList.map((msg) => {
        params.push(`%${msg.toLowerCase()}%`);
        return `LOWER(COALESCE(error_message, '')) LIKE $${params.length}`;
      });
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortFields = [
      'error_id', 'batch_id', 'excel_row_no', 'contact_name', 'comp_name',
      'error_message', 'designation', 'pos_type', 'country', 'comp_email',
      'contact_phone', 'linkedin_url', 'salesperson', 'error_date', 'created_date'
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'error_id';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*)::int AS total FROM contact_incorrect_data ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const dataSql = `
      SELECT 
        error_id, batch_id, excel_row_no, source_id, comp_id, comp_name,
        contact_name, designation, pos_type, priority_contact, country, comp_email,
        other_email, comp_email_verified, contact_phone, contact_mobile,
        linkedin_url, contactstatus, salesperson, source, remark, website,
        error_message, error_date, created_by, created_date
      FROM contact_incorrect_data
      ${whereClause}
      ORDER BY ${sortField} ${direction}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await pool.query(dataSql, [...params, parsedLimit, offset]);

    res.json({
      success: true,
      data: dataRes.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-upload/contact-incorrect-data/filter-options
 * Distinct filter dropdown values for Contact Invalid Data page.
 */
router.get('/contact-incorrect-data/filter-options', async (req, res, next) => {
  try {
    const createdByRes = await pool.query(`
      SELECT DISTINCT created_by FROM contact_incorrect_data WHERE created_by IS NOT NULL AND created_by != '' ORDER BY created_by
    `);
    const posTypeRes = await pool.query(`
      SELECT DISTINCT pos_type FROM contact_incorrect_data WHERE pos_type IS NOT NULL AND pos_type != '' ORDER BY pos_type
    `);
    const desigRes = await pool.query(`
      SELECT DISTINCT designation FROM contact_incorrect_data WHERE designation IS NOT NULL AND designation != '' ORDER BY designation LIMIT 100
    `);
    const compNameRes = await pool.query(`
      SELECT DISTINCT comp_name FROM contact_incorrect_data WHERE comp_name IS NOT NULL AND comp_name != '' ORDER BY comp_name LIMIT 100
    `);
    const errorMsgRes = await pool.query(`
      SELECT DISTINCT error_message FROM contact_incorrect_data WHERE error_message IS NOT NULL AND error_message != '' ORDER BY error_message LIMIT 100
    `);

    res.json({
      success: true,
      createdByList: createdByRes.rows.map((r) => r.created_by),
      posTypeList: posTypeRes.rows.map((r) => r.pos_type).length > 0 ? posTypeRes.rows.map((r) => r.pos_type) : [
        'Business Application', 'Digital Transformation Leader', 'Head of CRM', 'Head of IT', 'IT Manager', 'Non IT', 'Other IT', 'Procurement', 'Project Manager'
      ],
      designationList: desigRes.rows.map((r) => r.designation),
      compNameList: compNameRes.rows.map((r) => r.comp_name),
      errorMessageList: errorMsgRes.rows.map((r) => r.error_message),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/contact-incorrect-data/apply-changes
 * Bulk updates pos_type or designation for selected contact error records.
 */
router.post('/contact-incorrect-data/apply-changes', async (req, res, next) => {
  try {
    const { ids, pos_type, designation } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected to apply changes.' });
    }

    const updates = [];
    const params = [];
    if (pos_type) {
      params.push(pos_type);
      updates.push(`pos_type = $${params.length}`);
    }
    if (designation) {
      params.push(designation);
      updates.push(`designation = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select a Position Type or Designation to apply.' });
    }

    params.push(ids);
    await pool.query(
      `UPDATE contact_incorrect_data SET ${updates.join(', ')} WHERE error_id = ANY($${params.length}::int[])`,
      params
    );

    res.json({
      success: true,
      updatedCount: ids.length,
      message: `Successfully applied changes to ${ids.length} contact error record(s).`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/crm-upload/contact-incorrect-data/:id
 * Delete single record by error_id
 */
router.delete('/contact-incorrect-data/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contact_incorrect_data WHERE error_id = $1', [id]);
    res.json({ success: true, message: `Contact error record #${id} removed.` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/contact-incorrect-data/clear
 * Clear all or bulk delete
 */
router.post('/contact-incorrect-data/clear', async (req, res, next) => {
  try {
    const { ids, all } = req.body;
    if (all) {
      await pool.query('DELETE FROM contact_incorrect_data');
      return res.json({ success: true, message: 'All contact incorrect data cleared.' });
    }
    if (Array.isArray(ids) && ids.length > 0) {
      await pool.query('DELETE FROM contact_incorrect_data WHERE error_id = ANY($1::int[])', [ids]);
      return res.json({ success: true, message: `Removed ${ids.length} record(s).` });
    }
    return res.status(400).json({ success: false, message: 'Provide ids array or all=true' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/contact-incorrect-data/retry
 * Re-validates and imports corrected contact error rows into the database.
 * Successfully imported rows are automatically removed from contact_incorrect_data.
 */
router.post('/contact-incorrect-data/retry', async (req, res, next) => {
  try {
    const { rows, mode = 'insert' } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided for retry.' });
    }

    // 1. Re-validate rows
    const validation = await contactUploadService.validateContactBatch(rows, mode);
    const validItems = validation.results.filter((r) => r.isValid);
    const stillInvalidItems = validation.results.filter((r) => !r.isValid);

    let importedCount = 0;
    const resolvedErrorIds = [];

    // 2. Import valid items
    if (validItems.length > 0) {
      const importRes = await contactUploadService.importContactBatch(validItems, mode, 'skip');
      importedCount = importRes.importedCount;

      // Map resolved items to their original error_id
      for (const v of validItems) {
        const matchingRow = rows.find(
          (orig) => orig.excel_row_no === v.excel_row_no || orig.__sourceRowNumber === v.sourceRowNumber || (orig.error_id && orig.contact_name === v.normalized?.contact_name)
        );
        if (matchingRow && matchingRow.error_id) {
          resolvedErrorIds.push(matchingRow.error_id);
        }
      }

      // 3. Remove resolved error records from contact_incorrect_data
      if (resolvedErrorIds.length > 0) {
        await pool.query(
          `DELETE FROM contact_incorrect_data WHERE error_id = ANY($1::int[])`,
          [resolvedErrorIds]
        );
      }
    }

    // 4. Update error_message for still invalid records
    for (const inv of stillInvalidItems) {
      const matchingRow = rows.find(
        (orig) => orig.excel_row_no === inv.excel_row_no || orig.__sourceRowNumber === inv.sourceRowNumber || (orig.error_id && orig.contact_name === inv.normalized?.contact_name)
      );
      if (matchingRow && matchingRow.error_id) {
        const errorMsg = inv.errors.map((e) => typeof e === 'string' ? e : e.message).join(' | ');
        await pool.query(
          `UPDATE contact_incorrect_data 
           SET error_message = $1, error_date = TO_CHAR(NOW(), 'DD-MON-YYYY')
           WHERE error_id = $2`,
          [errorMsg, matchingRow.error_id]
        );
      }
    }

    res.json({
      success: true,
      importedCount,
      stillInvalidCount: stillInvalidItems.length,
      resolvedErrorIds,
      message: `Retry complete: ${importedCount} contact record(s) imported into CRM database, ${stillInvalidItems.length} row(s) remain invalid.`,
      validation,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// 3. CONTACT UPLOAD WIZARD ENDPOINTS
// ========================================================

/**
 * GET /api/crm-upload/contact/meta
 * Master lookup reference values for Contact upload validation.
 */
router.get('/contact/meta', async (req, res, next) => {
  try {
    const meta = await contactUploadService.getContactUploadMeta();
    res.json({ success: true, data: meta });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/crm-upload/contact/template
 * Download Contact Upload CSV Template (insert or update mode)
 */
router.get('/contact/template', (req, res) => {
  const mode = req.query.mode === 'update' ? 'update' : 'insert';
  const csvContent = contactUploadService.getContactTemplateCsv(mode);
  const filename = mode === 'update' ? 'Contact_Upload_Template_Update.csv' : 'Contact_Upload_Template_Insert.csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

/**
 * POST /api/crm-upload/contact/validate
 * Validate rows in Contact Upload Step 2
 */
router.post('/contact/validate', async (req, res, next) => {
  try {
    const { rows, mode } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Rows array is required.' });
    }
    const result = await contactUploadService.validateContactBatch(rows, mode || 'insert');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crm-upload/contact/import
 * Import valid Contact rows into PostgreSQL database in Step 3
 */
router.post('/contact/import', async (req, res, next) => {
  try {
    const { rows, mode, policy } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Rows array is required for import.' });
    }
    const result = await contactUploadService.importContactBatch(rows, mode || 'insert', policy || 'skip');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

