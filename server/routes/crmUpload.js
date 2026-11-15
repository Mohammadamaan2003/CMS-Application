const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');
const companyUploadService = require('../services/companyUploadService');
const contactUploadService = require('../services/contactUploadService');

// ========================================================
// 0. BATCHES SUMMARY ENDPOINT
// ========================================================

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
 * Paginated interactive report for invalid company upload rows.
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
        da, com_email, remark, employee_size, salesperson, source, created_by, created_date
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
 * Paginated interactive report for invalid contact upload rows.
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

