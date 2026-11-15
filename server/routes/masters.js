const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { setupMastersTable } = require('../services/setup_masters');

// Ensure tables exist on boot
setupMastersTable().catch((e) => console.warn('[Masters Setup Warning]:', e.message));

function formatServerDate(d = new Date()) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * GET /api/masters/company-size
 * Returns the Master Company Size report data:
 * Joins master_company_sizes with live dynamic counts from companies table.
 */
router.get('/company-size', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereClause = '';

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        whereClause = `WHERE LOWER(m.master_company_size) LIKE $1 OR LOWER(c.employee_size) LIKE $1`;
      }

      const countSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(employee_size), ''), '') as employee_size,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(employee_size), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM master_company_sizes m
        FULL OUTER JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.master_company_size, ''))) = LOWER(TRIM(COALESCE(c.employee_size, '')))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(employee_size), ''), '') as employee_size,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(employee_size), ''), '')
        )
        SELECT 
          COALESCE(m.id, 999000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.master_company_size, '') as master_company_size,
          CASE 
            WHEN m.master_company_size IS NOT NULL AND c.employee_size IS NOT NULL AND c.employee_size != '' THEN c.dynamic_count
            ELSE 0
          END as master_company_size_count,
          COALESCE(c.employee_size, '') as company_company_size,
          COALESCE(c.dynamic_count, 0) as company_company_size_count,
          CASE 
            WHEN m.master_company_size IS NOT NULL AND m.master_company_size != '' AND c.employee_size IS NOT NULL AND c.employee_size != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.master_company_size IS NULL OR m.master_company_size = '') AND c.employee_size IS NOT NULL THEN 'DATA IN COMPANY'
            WHEN m.master_company_size IS NOT NULL AND (c.employee_size IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'AMAAN') as modified_by,
          COALESCE(m.modified_date, '10-NOV-2026') as modified_date
        FROM master_company_sizes m
        FULL OUTER JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.master_company_size, ''))) = LOWER(TRIM(COALESCE(c.employee_size, '')))
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN m.master_company_size IS NOT NULL AND m.master_company_size != '' AND c.employee_size IS NOT NULL AND c.employee_size != '' THEN 1
            WHEN (m.master_company_size IS NULL OR m.master_company_size = '') AND c.employee_size IS NOT NULL THEN 2
            ELSE 3
          END,
          m.id ASC NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    // Fallback if db offline
    return res.json({
      success: true,
      data: [
        {
          id: 1,
          master_company_size: '1,001-5,000 employees',
          master_company_size_count: 194,
          company_company_size: '1,001-5,000 employees',
          company_company_size_count: 194,
          validation_status: 'DATA IN BOTH',
          created_by: 'APEX_PUBLIC_USER',
          created_date: '7/20/2026',
          modified_by: 'AMAAN',
          modified_date: '11/10/2026',
        },
      ],
      total: 1,
      page: 1,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/company-size/:id
 * Retrieves single master company size record with dynamic company count.
 */
router.get('/company-size/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db.isAvailable && db.isAvailable()) {
      const sql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(employee_size), ''), '') as employee_size,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(employee_size), ''), '')
        )
        SELECT 
          m.id,
          COALESCE(m.master_company_size, '') as master_company_size,
          CASE 
            WHEN m.master_company_size IS NOT NULL AND c.employee_size IS NOT NULL AND c.employee_size != '' THEN c.dynamic_count
            ELSE 0
          END as master_company_size_count,
          COALESCE(c.employee_size, '') as company_company_size,
          COALESCE(c.dynamic_count, 0) as company_company_size_count,
          CASE 
            WHEN m.master_company_size IS NOT NULL AND m.master_company_size != '' AND c.employee_size IS NOT NULL AND c.employee_size != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.master_company_size IS NULL OR m.master_company_size = '') AND c.employee_size IS NOT NULL THEN 'DATA IN COMPANY'
            WHEN m.master_company_size IS NOT NULL AND (c.employee_size IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'AMAAN') as modified_by,
          COALESCE(m.modified_date, '10-NOV-2026') as modified_date
        FROM master_company_sizes m
        LEFT JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.master_company_size, ''))) = LOWER(TRIM(COALESCE(c.employee_size, '')))
        WHERE m.id = $1
      `;

      const result = await db.query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Master company size not found.' });
      }

      return res.json({ success: true, data: result.rows[0] });
    }

    return res.status(404).json({ success: false, message: 'Master company size not found.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/company-size
 * Creates a new master company size.
 */
router.post('/company-size', async (req, res, next) => {
  try {
    const { master_company_size } = req.body;
    if (!master_company_size || master_company_size.trim() === '') {
      return res.status(400).json({ success: false, message: 'Master Company Size name is required.' });
    }

    const cleanSize = master_company_size.trim();

    // Check duplicate
    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id, master_company_size FROM master_company_sizes WHERE LOWER(TRIM(master_company_size)) = LOWER(TRIM($1)) LIMIT 1',
        [cleanSize]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Master company size "${cleanSize}" already exists. Duplicate records are not allowed.`,
        });
      }
    }

    const todayStr = formatServerDate();

    const sql = `
      INSERT INTO master_company_sizes (master_company_size, created_by, created_date, modified_by, modified_date)
      VALUES ($1, 'APEX_PUBLIC_USER', $2, 'APEX_PUBLIC_USER', $2)
      RETURNING *
    `;

    const result = await db.query(sql, [cleanSize, todayStr]);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Master company size already exists.' });
    }
    next(err);
  }
});

/**
 * PUT /api/masters/company-size/:id
 * Updates an existing master company size and synchronizes company records.
 */
router.put('/company-size/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_company_size, company_company_size, old_company_size } = req.body;

    const formattedDate = formatServerDate();
    let updatedMaster = null;

    if (master_company_size && master_company_size.trim()) {
      const cleanSize = master_company_size.trim();

      // Check duplicate
      if (db.isAvailable && db.isAvailable()) {
        const dup = await db.query(
          'SELECT id, master_company_size FROM master_company_sizes WHERE LOWER(TRIM(master_company_size)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
          [cleanSize, parseInt(id, 10)]
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Master company size "${cleanSize}" already exists. Duplicate records are not allowed.`,
          });
        }
      }
      if (parseInt(id, 10) >= 999000) {
        const insertRes = await db.query(
          `INSERT INTO master_company_sizes (master_company_size, created_by, created_date, modified_by, modified_date)
           VALUES ($1, 'APEX_PUBLIC_USER', $2, 'AMAAN', $2)
           ON CONFLICT (master_company_size) DO UPDATE SET modified_date = EXCLUDED.modified_date
           RETURNING *`,
          [master_company_size.trim(), formattedDate]
        );
        updatedMaster = insertRes.rows[0];
      } else {
        const updateRes = await db.query(
          `UPDATE master_company_sizes
           SET master_company_size = $1, modified_by = 'AMAAN', modified_date = $2
           WHERE id = $3
           RETURNING *`,
          [master_company_size.trim(), formattedDate, id]
        );
        updatedMaster = updateRes.rows[0];
      }
    }

    // If company_company_size is changed, synchronize company records
    if (company_company_size && old_company_size && company_company_size.trim() !== old_company_size.trim()) {
      await db.query(
        `UPDATE companies SET employee_size = $1 WHERE LOWER(TRIM(COALESCE(employee_size, ''))) = LOWER(TRIM($2))`,
        [company_company_size.trim(), old_company_size.trim()]
      );
    }

    return res.json({ success: true, data: updatedMaster || { id, master_company_size, company_company_size } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/company-size/:id
 * Deletes a master company size.
 */
router.delete('/company-size/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM master_company_sizes WHERE id = $1 RETURNING *`;
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Master company size not found.' });
    }

    return res.json({ success: true, message: 'Master company size deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/company-size/batch-delete
 * Bulk deletes master records by array of IDs.
 */
router.post('/company-size/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_company_sizes WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} records.` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/company-type
 * Returns Master Company Type report data:
 * Joins master_company_types with live dynamic counts from companies.company_type.
 */
router.get('/company-type', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereClause = '';

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        whereClause = `WHERE LOWER(COALESCE(m.master_company_type, '')) LIKE $1 OR LOWER(COALESCE(c.company_type, '')) LIKE $1`;
      }

      const countSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(company_type), ''), '') as company_type,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(company_type), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM master_company_types m
        FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.master_company_type)) = LOWER(TRIM(c.company_type))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(company_type), ''), '') as company_type,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(company_type), ''), '')
        )
        SELECT 
          COALESCE(m.id, 999000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.master_company_type, '') as master_company_type,
          CASE 
            WHEN m.master_company_type IS NOT NULL AND c.company_type IS NOT NULL AND c.company_type != '' THEN c.dynamic_count
            ELSE 0
          END as master_company_type_count,
          COALESCE(c.company_type, '') as company_company_type,
          COALESCE(c.dynamic_count, 0) as company_company_type_count,
          CASE 
            WHEN m.master_company_type IS NOT NULL AND m.master_company_type != '' AND c.company_type IS NOT NULL AND c.company_type != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.master_company_type IS NULL OR m.master_company_type = '') AND c.company_type IS NOT NULL THEN 'DATA IN COMPANY'
            WHEN m.master_company_type IS NOT NULL AND (c.company_type IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'ZAIN_DATEY') as modified_by,
          COALESCE(m.modified_date, '07-NOV-2026') as modified_date
        FROM master_company_types m
        FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.master_company_type)) = LOWER(TRIM(c.company_type))
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN m.master_company_type = 'Direct Client' THEN 1
            WHEN (m.master_company_type IS NULL OR m.master_company_type = '') THEN 2
            WHEN m.master_company_type = 'IT Company' THEN 3
            WHEN m.master_company_type = 'undefined' THEN 4
            ELSE 5
          END,
          m.id ASC NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({
      success: true,
      data: [
        {
          id: 1,
          master_company_type: 'Direct Client',
          master_company_type_count: 816,
          company_company_type: 'Direct Client',
          company_company_type_count: 816,
          validation_status: 'DATA IN BOTH',
          created_by: 'APEX_PUBLIC_USER',
          created_date: '20-JUL-2026',
          modified_by: 'ZAIN_DATEY',
          modified_date: '07-NOV-2026',
        },
        {
          id: 999004,
          master_company_type: '',
          master_company_type_count: 15,
          company_company_type: '',
          company_company_type_count: 15,
          validation_status: 'DATA IN COMPANY',
          created_by: '',
          created_date: '',
          modified_by: '',
          modified_date: '',
        },
        {
          id: 2,
          master_company_type: 'IT Company',
          master_company_type_count: 108,
          company_company_type: 'IT Company',
          company_company_type_count: 108,
          validation_status: 'DATA IN BOTH',
          created_by: 'APEX_PUBLIC_USER',
          created_date: '20-JUL-2026',
          modified_by: 'AMAAN',
          modified_date: '10-NOV-2026',
        },
        {
          id: 3,
          master_company_type: 'undefined',
          master_company_type_count: 62,
          company_company_type: 'undefined',
          company_company_type_count: 62,
          validation_status: 'DATA IN BOTH',
          created_by: 'APEX_PUBLIC_USER',
          created_date: '20-JUL-2026',
          modified_by: 'AMAAN',
          modified_date: '06-NOV-2026',
        },
      ],
      total: 4,
      page: 1,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/company-type/:id
 * Retrieves single master company type record with dynamic company count.
 */
router.get('/company-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (db.isAvailable && db.isAvailable()) {
      const sql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(company_type), ''), '') as company_type,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(company_type), ''), '')
        )
        SELECT 
          m.id,
          m.master_company_type,
          CASE 
            WHEN m.master_company_type IS NOT NULL AND c.company_type IS NOT NULL AND c.company_type != '' THEN c.dynamic_count
            ELSE 0
          END as master_company_type_count,
          COALESCE(c.company_type, '') as company_company_type,
          COALESCE(c.dynamic_count, 0) as company_company_type_count,
          CASE 
            WHEN m.master_company_type IS NOT NULL AND m.master_company_type != '' AND c.company_type IS NOT NULL AND c.company_type != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.master_company_type IS NULL OR m.master_company_type = '') AND c.company_type IS NOT NULL THEN 'DATA IN COMPANY'
            WHEN m.master_company_type IS NOT NULL AND (c.company_type IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'ZAIN_DATEY') as modified_by,
          COALESCE(m.modified_date, '07-NOV-2026') as modified_date
        FROM master_company_types m
        LEFT JOIN comp_counts c ON LOWER(TRIM(m.master_company_type)) = LOWER(TRIM(c.company_type))
        WHERE m.id = $1
      `;

      const result = await db.query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Master company type not found.' });
      }

      return res.json({ success: true, data: result.rows[0] });
    }

    return res.status(404).json({ success: false, message: 'Master company type not found.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/company-type
 * Creates a new master company type.
 */
router.post('/company-type', async (req, res, next) => {
  try {
    const { master_company_type } = req.body;
    if (!master_company_type || master_company_type.trim() === '') {
      return res.status(400).json({ success: false, message: 'Master Company Type name is required.' });
    }

    const cleanType = master_company_type.trim();

    // Check duplicate
    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id, master_company_type FROM master_company_types WHERE LOWER(TRIM(master_company_type)) = LOWER(TRIM($1)) LIMIT 1',
        [cleanType]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Master company type "${cleanType}" already exists. Duplicate records are not allowed.`,
        });
      }
    }

    const todayStr = formatServerDate();

    const sql = `
      INSERT INTO master_company_types (master_company_type, created_by, created_date, modified_by, modified_date)
      VALUES ($1, 'APEX_PUBLIC_USER', $2, 'AMAAN', $2)
      RETURNING *
    `;

    const result = await db.query(sql, [cleanType, todayStr]);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Master company type already exists.' });
    }
    next(err);
  }
});

/**
 * PUT /api/masters/company-type/:id
 * Updates an existing master company type and synchronizes company records.
 */
router.put('/company-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_company_type, company_company_type, old_company_type } = req.body;

    const formattedDate = formatServerDate();
    let updatedMaster = null;

    if (master_company_type && master_company_type.trim()) {
      const cleanType = master_company_type.trim();

      // Check duplicate
      if (db.isAvailable && db.isAvailable()) {
        const dup = await db.query(
          'SELECT id, master_company_type FROM master_company_types WHERE LOWER(TRIM(master_company_type)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
          [cleanType, parseInt(id, 10)]
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Master company type "${cleanType}" already exists. Duplicate records are not allowed.`,
          });
        }
      }
      if (parseInt(id, 10) >= 999000) {
        const insertRes = await db.query(
          `INSERT INTO master_company_types (master_company_type, created_by, created_date, modified_by, modified_date)
           VALUES ($1, 'APEX_PUBLIC_USER', $2, 'AMAAN', $2)
           ON CONFLICT (master_company_type) DO UPDATE SET modified_date = EXCLUDED.modified_date
           RETURNING *`,
          [master_company_type.trim(), formattedDate]
        );
        updatedMaster = insertRes.rows[0];
      } else {
        const updateRes = await db.query(
          `UPDATE master_company_types
           SET master_company_type = $1, modified_by = 'AMAAN', modified_date = $2
           WHERE id = $3
           RETURNING *`,
          [master_company_type.trim(), formattedDate, id]
        );
        updatedMaster = updateRes.rows[0];
      }
    }

    // If company_company_type is changed, synchronize company records
    if (company_company_type && old_company_type && company_company_type.trim() !== old_company_type.trim()) {
      await db.query(
        `UPDATE companies SET company_type = $1 WHERE LOWER(TRIM(COALESCE(company_type, ''))) = LOWER(TRIM($2))`,
        [company_company_type.trim(), old_company_type.trim()]
      );
    }

    return res.json({ success: true, data: updatedMaster || { id, master_company_type, company_company_type } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/company-type/:id
 * Deletes a master company type.
 */
router.delete('/company-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM master_company_types WHERE id = $1 RETURNING *`;
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Master company type not found.' });
    }

    return res.json({ success: true, message: 'Master company type deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/company-type/batch-delete
 * Bulk deletes master company types by array of IDs.
 */
router.post('/company-type/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_company_types WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} records.` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/country
 * Returns Master Country report data with reconciliation:
 * Joins master_countries with live dynamic counts from companies.country.
 * Supports filtering by validation_status and returns reconciliation metrics.
 */
router.get('/country', async (req, res, next) => {
  try {
    const {
      search = '',
      validation_status = '',
      status = '',
      page = 1,
      limit = 50,
      sortBy = 'master_country_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      const activeStatus = (validation_status || status || '').trim().toUpperCase();

      const baseCte = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(country), ''), '') as country,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(country), ''), '')
        ),
        reconciled AS (
          SELECT 
            COALESCE(m.id, 999000 + ROW_NUMBER() OVER ()) as id,
            COALESCE(m.country, '') as master_country,
            CASE 
              WHEN m.country IS NOT NULL AND c.country IS NOT NULL AND c.country != '' THEN c.dynamic_count
              ELSE 0
            END as master_country_count,
            COALESCE(c.country, '') as company_country,
            COALESCE(c.dynamic_count, 0) as company_country_count,
            CASE 
              WHEN m.country IS NOT NULL AND m.country != '' AND c.country IS NOT NULL AND c.country != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN (m.country IS NULL OR m.country = '') AND c.country IS NOT NULL THEN 'DATA IN COMPANY'
              WHEN m.country IS NOT NULL AND (c.country IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN BOTH'
            END as validation_status,
            COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
            COALESCE(m.created_date, '20-JUL-2026') as created_date,
            COALESCE(m.modified_by, 'AMAAN') as modified_by,
            COALESCE(m.modified_date, '10-NOV-2026') as modified_date
          FROM master_countries m
          FULL OUTER JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
        )
      `;

      // Get global reconciliation metrics
      const countsSql = `
        ${baseCte}
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE validation_status = 'DATA IN BOTH')::int as total_both,
          COUNT(*) FILTER (WHERE validation_status = 'DATA IN MASTER')::int as total_master_only,
          COUNT(*) FILTER (WHERE validation_status = 'DATA IN COMPANY')::int as total_company_only
        FROM reconciled
      `;
      const countsRes = await db.query(countsSql);
      const {
        total: totalAll = 0,
        total_both: totalBoth = 0,
        total_master_only: totalMasterOnly = 0,
        total_company_only: totalCompanyOnly = 0,
      } = countsRes.rows[0] || {};

      const whereClauses = [];
      const queryParams = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        whereClauses.push(`(LOWER(master_country) LIKE $${queryParams.length} OR LOWER(company_country) LIKE $${queryParams.length})`);
      }

      if (activeStatus && activeStatus !== 'ALL') {
        queryParams.push(activeStatus);
        whereClauses.push(`validation_status = $${queryParams.length}`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countFilteredSql = `
        ${baseCte}
        SELECT COUNT(*)::int as total FROM reconciled ${whereSql}
      `;
      const filteredRes = await db.query(countFilteredSql, queryParams);
      const totalFiltered = filteredRes.rows[0]?.total || 0;

      const dataSql = `
        ${baseCte}
        SELECT * FROM reconciled
        ${whereSql}
        ORDER BY 
          CASE 
            WHEN validation_status = 'DATA IN BOTH' THEN 1
            WHEN validation_status = 'DATA IN COMPANY' THEN 2
            ELSE 3
          END,
          company_country_count DESC,
          master_country ASC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total: totalFiltered,
        page: parsedPage,
        limit: parsedLimit,
        reconciliation: {
          total: totalAll,
          totalBoth,
          totalMasterOnly,
          totalCompanyOnly,
        },
      });
    }

    return res.json({
      success: true,
      data: [],
      total: 0,
      page: parsedPage,
      limit: parsedLimit,
      reconciliation: {
        total: 0,
        totalBoth: 0,
        totalMasterOnly: 0,
        totalCompanyOnly: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/country/:id
 * Returns single master country with dynamic counts.
 */
router.get('/country/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const sql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(country), ''), '') as country,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(country), ''), '')
        )
        SELECT 
          m.id,
          COALESCE(m.country, '') as master_country,
          CASE 
            WHEN m.country IS NOT NULL AND c.country IS NOT NULL AND c.country != '' THEN c.dynamic_count
            ELSE 0
          END as master_country_count,
          COALESCE(c.country, '') as company_country,
          COALESCE(c.dynamic_count, 0) as company_country_count,
          CASE 
            WHEN m.country IS NOT NULL AND m.country != '' AND c.country IS NOT NULL AND c.country != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.country IS NULL OR m.country = '') AND c.country IS NOT NULL THEN 'DATA IN COMPANY'
            WHEN m.country IS NOT NULL AND (c.country IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'AMAAN') as modified_by,
          COALESCE(m.modified_date, '10-NOV-2026') as modified_date
        FROM master_countries m
        LEFT JOIN comp_counts c ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
        WHERE m.id = $1
      `;
      const result = await db.query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Master country not found.' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    return res.status(404).json({ success: false, message: 'Master country not found.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/country
 * Creates a new master country. Validates uniqueness of country name.
 */
router.post('/country', async (req, res, next) => {
  try {
    const { master_country, country } = req.body;
    const countryName = (master_country || country || '').trim();

    if (!countryName) {
      return res.status(400).json({ success: false, message: 'Country name is required.' });
    }

    // Verify uniqueness (ignoring extra whitespace)
    const existing = await db.query(
      `SELECT id, country FROM master_countries WHERE LOWER(TRIM(country)) = LOWER($1) LIMIT 1`,
      [countryName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'country',
        message: `Country "${countryName}" already exists in Master with ID #${existing.rows[0].id}.`,
      });
    }

    const todayStr = formatServerDate();

    const insertSql = `
      INSERT INTO master_countries (country, master_count, created_by, created_date, modified_by, modified_date)
      VALUES ($1, 0, 'APEX_PUBLIC_USER', $2, 'APEX_PUBLIC_USER', $2)
      RETURNING *
    `;

    const result = await db.query(insertSql, [countryName, todayStr]);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, field: 'country', message: 'Country already exists in master.' });
    }
    next(err);
  }
});

/**
 * PUT /api/masters/country/:id
 * Updates an existing master country and synchronizes company records.
 */
router.put('/country/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_country, country, company_country, old_company_country } = req.body;
    const countryName = (master_country || country || '').trim();

    const formattedDate = formatServerDate();
    let updatedMaster = null;

    if (countryName) {
      if (parseInt(id, 10) >= 999000) {
        const insertRes = await db.query(
          `INSERT INTO master_countries (country, master_count, created_by, created_date, modified_by, modified_date)
           VALUES ($1, 0, 'APEX_PUBLIC_USER', $2, 'AMAAN', $2)
           ON CONFLICT (country) DO UPDATE SET modified_date = EXCLUDED.modified_date
           RETURNING *`,
          [countryName, formattedDate]
        );
        updatedMaster = insertRes.rows[0];
      } else {
        const duplicate = await db.query(
          `SELECT id, country FROM master_countries WHERE LOWER(TRIM(country)) = LOWER($1) AND id != $2 LIMIT 1`,
          [countryName, id]
        );

        if (duplicate.rows.length > 0) {
          return res.status(409).json({
            success: false,
            field: 'country',
            message: `Country "${countryName}" already exists in Master with ID #${duplicate.rows[0].id}.`,
          });
        }

        const updateRes = await db.query(
          `UPDATE master_countries
           SET country = $1, modified_by = 'AMAAN', modified_date = $2
           WHERE id = $3
           RETURNING *`,
          [countryName, formattedDate, id]
        );
        updatedMaster = updateRes.rows[0];
      }
    }

    // If company_country is changed, synchronize company records in real-time
    if (company_country && old_company_country && company_country.trim() !== old_company_country.trim()) {
      await db.query(
        `UPDATE companies SET country = $1 WHERE LOWER(TRIM(COALESCE(country, ''))) = LOWER(TRIM($2))`,
        [company_country.trim(), old_company_country.trim()]
      );
    }

    return res.json({ success: true, data: updatedMaster || { id, country: countryName, company_country } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/country/:id
 * Deletes a master country.
 */
router.delete('/country/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM master_countries WHERE id = $1 RETURNING *`;
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Master country not found.' });
    }

    return res.json({ success: true, message: 'Master country deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/country/batch-delete
 * Bulk deletes master countries by array of IDs.
 */
router.post('/country/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_countries WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} records.` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/cities
 * Returns city suggestions for a selected country from country_city_mapping and companies.
 */
router.get('/cities', async (req, res, next) => {
  try {
    const { country } = req.query;
    if (!country || !country.trim()) {
      return res.json({ success: true, cities: [] });
    }

    const trimmedCountry = country.trim();
    const sql = `
      SELECT DISTINCT city FROM (
        SELECT city FROM country_city_mapping WHERE LOWER(TRIM(country)) = LOWER($1) AND city IS NOT NULL AND city != ''
        UNION
        SELECT city FROM companies WHERE LOWER(TRIM(country)) = LOWER($1) AND city IS NOT NULL AND city != ''
      ) c
      ORDER BY city ASC
      LIMIT 100
    `;
    const result = await db.query(sql, [trimmedCountry]);
    return res.json({ success: true, cities: result.rows.map((r) => r.city) });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// MASTERS: Country & City Mapping Endpoints
// ==========================================

/**
 * GET /api/masters/country-city-mapping/filter-options
 * Returns distinct lists of countries and cities for the filter dropdowns.
 */
router.get('/country-city-mapping/filter-options', async (req, res, next) => {
  try {
    const { country } = req.query;
    let countries = [];
    let cities = [];

    if (db.isAvailable && db.isAvailable()) {
      const ctrySql = `
        SELECT DISTINCT country FROM (
          SELECT country FROM country_city_mapping WHERE country IS NOT NULL AND TRIM(country) != ''
          UNION
          SELECT country FROM companies WHERE country IS NOT NULL AND TRIM(country) != ''
        ) sub ORDER BY country ASC
      `;
      const ctryRes = await db.query(ctrySql);
      countries = ctryRes.rows.map((r) => r.country);

      let citySql = '';
      let cityParams = [];
      if (country && country.trim() !== '') {
        citySql = `
          SELECT DISTINCT city FROM (
            SELECT city FROM country_city_mapping WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND city IS NOT NULL AND TRIM(city) != ''
            UNION
            SELECT city FROM companies WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND city IS NOT NULL AND TRIM(city) != ''
          ) sub ORDER BY city ASC
        `;
        cityParams = [country.trim()];
      } else {
        citySql = `
          SELECT DISTINCT city FROM (
            SELECT city FROM country_city_mapping WHERE city IS NOT NULL AND TRIM(city) != ''
            UNION
            SELECT city FROM companies WHERE city IS NOT NULL AND TRIM(city) != ''
          ) sub ORDER BY city ASC
        `;
      }
      const cityRes = await db.query(citySql, cityParams);
      cities = cityRes.rows.map((r) => r.city);
    }

    return res.json({ success: true, countries, cities });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/country-city-mapping
 * Returns Country & City Mapping report rows:
 * Joins country_city_mapping with live dynamic counts from companies table.
 * Supports filters: search, country, city, createdDate, modifiedDate, validationStatus, page, limit, sortBy, sortOrder
 */
router.get('/country-city-mapping', async (req, res, next) => {
  try {
    const {
      search = '',
      country = '',
      city = '',
      createdDate = '',
      modifiedDate = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'master_stored_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.country, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.city, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.country, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.city, '')) LIKE $${idx}
        )`);
      }

      if (country && country.trim() !== '') {
        queryParams.push(`%${country.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.country, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.country, '')) LIKE $${idx}
        )`);
      }

      if (city && city.trim() !== '') {
        queryParams.push(`%${city.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.city, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.city, '')) LIKE $${idx}
        )`);
      }

      if (createdDate && createdDate.trim() !== '') {
        queryParams.push(`%${createdDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.created_date ILIKE $${idx}`);
      }

      if (modifiedDate && modifiedDate.trim() !== '') {
        queryParams.push(`%${modifiedDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.modified_date ILIKE $${idx}`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`m.country IS NOT NULL AND m.city IS NOT NULL AND c.country IS NOT NULL AND c.city IS NOT NULL AND c.dynamic_count > 0`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`(m.country IS NOT NULL OR m.city IS NOT NULL) AND (c.country IS NULL OR c.city IS NULL OR c.dynamic_count = 0)`);
        } else if (valUpper === 'DATA IN COMPANY') {
          whereConditions.push(`(m.country IS NULL OR m.city IS NULL) AND (c.country IS NOT NULL OR c.city IS NOT NULL)`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(country), ''), '') as country,
            COALESCE(NULLIF(TRIM(city), ''), '') as city,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE country IS NOT NULL AND TRIM(country) != '' AND city IS NOT NULL AND TRIM(city) != ''
          GROUP BY COALESCE(NULLIF(TRIM(country), ''), ''), COALESCE(NULLIF(TRIM(city), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM country_city_mapping m
        FULL OUTER JOIN comp_counts c 
          ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
          AND LOWER(TRIM(COALESCE(m.city, ''))) = LOWER(TRIM(COALESCE(c.city, '')))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = `
        ORDER BY 
          CASE 
            WHEN m.country IS NOT NULL AND m.city IS NOT NULL AND c.country IS NOT NULL AND c.city IS NOT NULL AND c.dynamic_count > 0 THEN 1
            WHEN (m.country IS NULL OR m.city IS NULL) AND (c.country IS NOT NULL OR c.city IS NOT NULL) THEN 2
            ELSE 3
          END,
          COALESCE(c.dynamic_count, 0) DESC,
          COALESCE(m.country, c.country) ASC,
          COALESCE(m.city, c.city) ASC
      `;

      if (sortBy === 'master_country') {
        orderByClause = `ORDER BY COALESCE(m.country, '') ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}, COALESCE(m.city, '') ASC`;
      } else if (sortBy === 'master_city') {
        orderByClause = `ORDER BY COALESCE(m.city, '') ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'master_stored_count' || sortBy === 'actual_company_count') {
        orderByClause = `
          ORDER BY 
            CASE 
              WHEN m.country IS NOT NULL AND m.city IS NOT NULL AND c.country IS NOT NULL AND c.city IS NOT NULL AND c.dynamic_count > 0 THEN 1
              WHEN (m.country IS NULL OR m.city IS NULL) AND (c.country IS NOT NULL OR c.city IS NOT NULL) THEN 2
              ELSE 3
            END ASC,
            COALESCE(c.dynamic_count, 0) ${sortOrder === 'ASC' ? 'ASC' : 'DESC'},
            COALESCE(m.country, c.country) ASC,
            COALESCE(m.city, c.city) ASC
        `;
      } else if (sortBy === 'company_country') {
        orderByClause = `ORDER BY COALESCE(c.country, '') ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'company_city') {
        orderByClause = `ORDER BY COALESCE(c.city, '') ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'created_date') {
        orderByClause = `ORDER BY m.created_date ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'modified_date') {
        orderByClause = `ORDER BY m.modified_date ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      }

      const dataSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(country), ''), '') as country,
            COALESCE(NULLIF(TRIM(city), ''), '') as city,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE country IS NOT NULL AND TRIM(country) != '' AND city IS NOT NULL AND TRIM(city) != ''
          GROUP BY COALESCE(NULLIF(TRIM(country), ''), ''), COALESCE(NULLIF(TRIM(city), ''), '')
        )
        SELECT 
          COALESCE(m.id, 999000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.country, '') as master_country,
          COALESCE(m.city, '') as master_city,
          CASE 
            WHEN m.country IS NOT NULL AND m.city IS NOT NULL AND c.country IS NOT NULL AND c.city IS NOT NULL AND c.dynamic_count > 0 THEN c.dynamic_count
            ELSE 0
          END as master_stored_count,
          COALESCE(c.country, '') as company_country,
          COALESCE(c.city, '') as company_city,
          COALESCE(c.dynamic_count, 0) as actual_company_count,
          CASE 
            WHEN m.country IS NOT NULL AND m.city IS NOT NULL AND c.country IS NOT NULL AND c.city IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.country IS NULL OR m.city IS NULL OR m.country = '' OR m.city = '') AND (c.country IS NOT NULL OR c.city IS NOT NULL) THEN 'DATA IN COMPANY'
            WHEN (m.country IS NOT NULL OR m.city IS NOT NULL) AND (c.country IS NULL OR c.city IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '08-SEP-2026') as created_date,
          COALESCE(m.modified_by, 'MARIYA_BADAR') as modified_by,
          COALESCE(m.modified_date, '12-NOV-2026') as modified_date
        FROM country_city_mapping m
        FULL OUTER JOIN comp_counts c 
          ON LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(c.country, '')))
          AND LOWER(TRIM(COALESCE(m.city, ''))) = LOWER(TRIM(COALESCE(c.city, '')))
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({
      success: true,
      data: [],
      total: 0,
      page: parsedPage,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/country-city-mapping/:id
 * Returns a single mapping record by ID with real-time dynamic count.
 */
router.get('/country-city-mapping/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (numId < 999000) {
      const sql = `
        SELECT 
          m.id,
          m.country as master_country,
          m.city as master_city,
          COALESCE(c.dynamic_count, 0) as master_stored_count,
          CASE WHEN c.dynamic_count > 0 THEN m.country ELSE '' END as company_country,
          CASE WHEN c.dynamic_count > 0 THEN m.city ELSE '' END as company_city,
          COALESCE(c.dynamic_count, 0) as actual_company_count,
          CASE 
            WHEN c.dynamic_count > 0 THEN 'DATA IN BOTH'
            ELSE 'DATA IN MASTER'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '08-SEP-2026') as created_date,
          COALESCE(m.modified_by, 'MARIYA_BADAR') as modified_by,
          COALESCE(m.modified_date, '12-NOV-2026') as modified_date
        FROM country_city_mapping m
        LEFT JOIN (
          SELECT country, city, COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY country, city
        ) c ON LOWER(TRIM(m.country)) = LOWER(TRIM(c.country)) AND LOWER(TRIM(m.city)) = LOWER(TRIM(c.city))
        WHERE m.id = $1
      `;
      const result = await db.query(sql, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Country & City Mapping record not found.' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      // Virtual record for DATA IN COMPANY
      const { country = '', city = '' } = req.query;
      const countRes = await db.query(
        `SELECT COUNT(*)::int as count FROM companies WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND LOWER(TRIM(city)) = LOWER(TRIM($2))`,
        [country, city]
      );
      const count = countRes.rows[0]?.count || 0;
      return res.json({
        success: true,
        data: {
          id: numId,
          master_country: '',
          master_city: '',
          master_stored_count: 0,
          company_country: country,
          company_city: city,
          actual_company_count: count,
          validation_status: 'DATA IN COMPANY',
          created_by: 'APEX_PUBLIC_USER',
          created_date: '08-SEP-2026',
          modified_by: 'MARIYA_BADAR',
          modified_date: '12-NOV-2026',
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/country-city-mapping
 * Creates a new country and city pair in country_city_mapping.
 */
router.post('/country-city-mapping', async (req, res, next) => {
  try {
    const { country, city, master_country, master_city } = req.body;
    const targetCountry = (master_country || country || '').trim();
    const targetCity = (master_city || city || '').trim();

    if (!targetCountry || !targetCity) {
      return res.status(400).json({ success: false, message: 'Country and City are both required.' });
    }

    const checkSql = `SELECT id FROM country_city_mapping WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND LOWER(TRIM(city)) = LOWER(TRIM($2))`;
    const checkRes = await db.query(checkSql, [targetCountry, targetCity]);
    if (checkRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Mapping for '${targetCountry}' - '${targetCity}' already exists.` });
    }

    const createdDate = formatServerDate();
    const insertSql = `
      INSERT INTO country_city_mapping (country, city, created_by, created_date, modified_by, modified_date)
      VALUES ($1, $2, 'APEX_PUBLIC_USER', $3, 'MARIYA_BADAR', $3)
      RETURNING *
    `;
    const insertRes = await db.query(insertSql, [targetCountry, targetCity, createdDate]);
    const row = insertRes.rows[0];

    const countRes = await db.query(
      `SELECT COUNT(*)::int as count FROM companies WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND LOWER(TRIM(city)) = LOWER(TRIM($2))`,
      [targetCountry, targetCity]
    );
    const count = countRes.rows[0]?.count || 0;

    return res.status(201).json({
      success: true,
      data: {
        id: row.id,
        master_country: row.country,
        master_city: row.city,
        master_stored_count: count,
        company_country: count > 0 ? row.country : '',
        company_city: count > 0 ? row.city : '',
        actual_company_count: count,
        validation_status: count > 0 ? 'DATA IN BOTH' : 'DATA IN MASTER',
        created_by: row.created_by,
        created_date: row.created_date,
        modified_by: row.modified_by,
        modified_date: row.modified_date,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/masters/country-city-mapping/:id
 * Updates country_city_mapping record and synchronizes company records in real-time.
 */
router.put('/country-city-mapping/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const {
      master_country,
      master_city,
      company_country,
      company_city,
      old_company_country,
      old_company_city,
      updateRecords,
    } = req.body;

    const formattedDate = formatServerDate();
    let updatedMaster = null;

    if (numId < 999000) {
      if (master_country !== undefined || master_city !== undefined) {
        const targetCountry = (master_country || '').trim();
        const targetCity = (master_city || '').trim();

        if (targetCountry && targetCity) {
          const dup = await db.query(
            'SELECT id FROM country_city_mapping WHERE LOWER(TRIM(country)) = LOWER(TRIM($1)) AND LOWER(TRIM(city)) = LOWER(TRIM($2)) AND id != $3 LIMIT 1',
            [targetCountry, targetCity, numId]
          );
          if (dup.rows.length > 0) {
            return res.status(409).json({
              success: false,
              message: `Mapping for '${targetCountry}' - '${targetCity}' already exists. Duplicate records are not allowed.`,
            });
          }
        }

        const updateRes = await db.query(
          `UPDATE country_city_mapping
           SET country = COALESCE($1, country),
               city = COALESCE($2, city),
               modified_by = 'MARIYA_BADAR',
               modified_date = $3
           WHERE id = $4
           RETURNING *`,
          [
            master_country !== undefined ? master_country.trim() : null,
            master_city !== undefined ? master_city.trim() : null,
            formattedDate,
            numId,
          ]
        );
        updatedMaster = updateRes.rows[0];
      }
    } else {
      // Virtual ID from DATA IN COMPANY -> insert into country_city_mapping
      const targetCountry = (master_country || company_country || '').trim();
      const targetCity = (master_city || company_city || '').trim();
      if (targetCountry && targetCity) {
        const insertRes = await db.query(
          `INSERT INTO country_city_mapping (country, city, created_by, created_date, modified_by, modified_date)
           VALUES ($1, $2, 'APEX_PUBLIC_USER', $3, 'MARIYA_BADAR', $3)
           RETURNING *`,
          [targetCountry, targetCity, formattedDate]
        );
        updatedMaster = insertRes.rows[0];
      }
    }

    // Synchronize company records in real-time if updateRecords or values changed
    if (
      updateRecords ||
      (company_country && old_company_country && (company_country.trim() !== old_company_country.trim() || (company_city && old_company_city && company_city.trim() !== old_company_city.trim())))
    ) {
      const fromCountry = (old_company_country || master_country || '').trim();
      const fromCity = (old_company_city || master_city || '').trim();
      const toCountry = (company_country || master_country || '').trim();
      const toCity = (company_city || master_city || '').trim();

      if (fromCountry && toCountry) {
        let updateCompanySql = `UPDATE companies SET country = $1`;
        let updateCompanyParams = [toCountry];

        if (toCity) {
          updateCompanySql += `, city = $2`;
          updateCompanyParams.push(toCity);
        }

        updateCompanySql += ` WHERE LOWER(TRIM(COALESCE(country, ''))) = LOWER(TRIM($${updateCompanyParams.length + 1}))`;
        updateCompanyParams.push(fromCountry);

        if (fromCity) {
          updateCompanySql += ` AND LOWER(TRIM(COALESCE(city, ''))) = LOWER(TRIM($${updateCompanyParams.length + 1}))`;
          updateCompanyParams.push(fromCity);
        }

        await db.query(updateCompanySql, updateCompanyParams);
      }
    }

    return res.json({
      success: true,
      data: updatedMaster || { id: numId, country: master_country, city: master_city },
      message: 'Updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/country-city-mapping/:id
 * Deletes a mapping record.
 */
router.delete('/country-city-mapping/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    if (numId < 999000) {
      const result = await db.query(`DELETE FROM country_city_mapping WHERE id = $1 RETURNING *`, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Mapping record not found.' });
      }
    }
    return res.json({ success: true, message: 'Country & City Mapping deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/country-city-mapping/batch-delete
 * Bulk deletes mapping records by array of IDs.
 */
router.post('/country-city-mapping/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 999000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM country_city_mapping WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} mappings.` });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// DESIGNATION & POSITION MASTER ENDPOINTS
// ============================================================================

/**
 * GET /api/masters/designation-position/filter-options
 * Returns filter options for top filter card (Designation, Position Type, Count Group).
 */
router.get('/designation-position/filter-options', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const [desigRes, posRes] = await Promise.all([
        db.query(`
          SELECT DISTINCT designation 
          FROM master_designation_positions 
          WHERE designation IS NOT NULL AND TRIM(designation) != '' 
          ORDER BY designation ASC 
          LIMIT 300
        `),
        db.query(`
          SELECT DISTINCT position_type 
          FROM master_designation_positions 
          WHERE position_type IS NOT NULL AND TRIM(position_type) != '' 
          ORDER BY position_type ASC
        `),
      ]);

      const designations = desigRes.rows.map((r) => r.designation);
      const positionTypes = posRes.rows.map((r) => r.position_type);
      const countGroups = ['All', 'High (>1000)', 'Medium (100 - 1000)', 'Low (1 - 99)', 'Zero (0)'];

      return res.json({
        success: true,
        data: {
          designations,
          positionTypes,
          countGroups,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        designations: ['IT Manager', 'Head of IT', 'IT Head', 'IT Project Manager', 'Procurement Manager'],
        positionTypes: ['IT Manager', 'Head of IT', 'IT Project Manager', 'Director', 'VP', 'Manager'],
        countGroups: ['All', 'High (>1000)', 'Medium (100 - 1000)', 'Low (1 - 99)', 'Zero (0)'],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/designation-position
 * Returns Designation & Position Master report rows:
 * Full outer joins master_designation_positions with live dynamic counts from contacts table.
 */
router.get('/designation-position', async (req, res, next) => {
  try {
    const {
      search = '',
      designation = '',
      position_type = '',
      count_group = '',
      createdDate = '',
      modifiedDate = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'master_designation_position_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.designation, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.position_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.designation, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.pos_type, '')) LIKE $${idx}
        )`);
      }

      if (designation && designation.trim() !== '') {
        queryParams.push(`%${designation.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.designation, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.designation, '')) LIKE $${idx}
        )`);
      }

      if (position_type && position_type.trim() !== '') {
        queryParams.push(`%${position_type.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.position_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.pos_type, '')) LIKE $${idx}
        )`);
      }

      if (createdDate && createdDate.trim() !== '') {
        queryParams.push(`%${createdDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.created_date ILIKE $${idx}`);
      }

      if (modifiedDate && modifiedDate.trim() !== '') {
        queryParams.push(`%${modifiedDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.modified_date ILIKE $${idx}`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`m.designation IS NOT NULL AND m.designation != '' AND c.designation IS NOT NULL AND c.designation != '' AND c.dynamic_count > 0`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`m.designation IS NOT NULL AND (c.designation IS NULL OR c.dynamic_count = 0)`);
        } else if (valUpper === 'DATA IN CONTACT' || valUpper === 'DATA IN COMPANY') {
          whereConditions.push(`(m.designation IS NULL OR m.designation = '') AND c.designation IS NOT NULL`);
        }
      }

      if (count_group && count_group.trim() !== '' && count_group !== 'All') {
        if (count_group.includes('>1000')) {
          whereConditions.push(`COALESCE(m.designation_count, c.dynamic_count, 0) > 1000`);
        } else if (count_group.includes('100 - 1000')) {
          whereConditions.push(`COALESCE(m.designation_count, c.dynamic_count, 0) BETWEEN 100 AND 1000`);
        } else if (count_group.includes('1 - 99')) {
          whereConditions.push(`COALESCE(m.designation_count, c.dynamic_count, 0) BETWEEN 1 AND 99`);
        } else if (count_group.includes('Zero') || count_group === '0') {
          whereConditions.push(`COALESCE(m.designation_count, c.dynamic_count, 0) = 0`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(designation), ''), '') as designation,
            COALESCE(NULLIF(TRIM(pos_type), ''), '') as pos_type,
            COUNT(*)::int as dynamic_count
          FROM contacts
          GROUP BY COALESCE(NULLIF(TRIM(designation), ''), ''), COALESCE(NULLIF(TRIM(pos_type), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM master_designation_positions m
        FULL OUTER JOIN contact_counts c 
          ON LOWER(TRIM(COALESCE(m.designation, ''))) = LOWER(TRIM(COALESCE(c.designation, '')))
         AND LOWER(TRIM(COALESCE(m.position_type, ''))) = LOWER(TRIM(COALESCE(c.pos_type, '')))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = 'ORDER BY COALESCE(m.designation_count, c.dynamic_count, 0) DESC, m.id ASC NULLS LAST';
      if (sortBy === 'master_designation') {
        orderByClause = `ORDER BY COALESCE(m.designation, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'master_position_type') {
        orderByClause = `ORDER BY COALESCE(m.position_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'contact_designation') {
        orderByClause = `ORDER BY COALESCE(c.designation, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'contact_position_type') {
        orderByClause = `ORDER BY COALESCE(c.pos_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'contact_designation_position_count') {
        orderByClause = `ORDER BY COALESCE(c.dynamic_count, 0) ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'master_designation_position_count') {
        orderByClause = `ORDER BY COALESCE(m.designation_count, c.dynamic_count, 0) ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} NULLS LAST`;
      } else if (sortBy === 'id') {
        orderByClause = `ORDER BY m.id ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      }

      const dataSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(designation), ''), '') as designation,
            COALESCE(NULLIF(TRIM(pos_type), ''), '') as pos_type,
            COUNT(*)::int as dynamic_count
          FROM contacts
          GROUP BY COALESCE(NULLIF(TRIM(designation), ''), ''), COALESCE(NULLIF(TRIM(pos_type), ''), '')
        )
        SELECT 
          COALESCE(m.id, 9900000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.designation, '') as master_designation,
          COALESCE(m.position_type, '') as master_position_type,
          COALESCE(m.designation_count, c.dynamic_count, 0) as master_designation_position_count,
          COALESCE(c.designation, '') as contact_designation,
          COALESCE(c.pos_type, '') as contact_position_type,
          COALESCE(c.dynamic_count, 0) as contact_designation_position_count,
          CASE
            WHEN m.designation IS NOT NULL AND m.designation != '' AND c.designation IS NOT NULL AND c.designation != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.designation IS NULL OR m.designation = '') AND c.designation IS NOT NULL THEN 'DATA IN CONTACT'
            WHEN m.designation IS NOT NULL AND (c.designation IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'ADMIN') as created_by,
          COALESCE(m.created_date, '09-SEP-2026') as created_date,
          COALESCE(m.modified_by, '') as modified_by,
          COALESCE(m.modified_date, '') as modified_date
        FROM master_designation_positions m
        FULL OUTER JOIN contact_counts c 
          ON LOWER(TRIM(COALESCE(m.designation, ''))) = LOWER(TRIM(COALESCE(c.designation, '')))
         AND LOWER(TRIM(COALESCE(m.position_type, ''))) = LOWER(TRIM(COALESCE(c.pos_type, '')))
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/designation-position/:id
 * Retrieves single master designation & position record with dynamic contact counts.
 */
router.get('/designation-position/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      if (numId < 9900000 && !isNaN(numId)) {
        const masterRes = await db.query('SELECT * FROM master_designation_positions WHERE id = $1', [numId]);
        if (masterRes.rows.length > 0) {
          const m = masterRes.rows[0];
          const cCountRes = await db.query(`
            SELECT COUNT(*)::int as cnt 
            FROM contacts 
            WHERE LOWER(TRIM(COALESCE(designation, ''))) = LOWER(TRIM($1))
          `, [m.designation || '']);
          const contactCount = cCountRes.rows[0]?.cnt || 0;

          return res.json({
            success: true,
            data: {
              id: m.id,
              master_designation: m.designation || '',
              master_position_type: m.position_type || '',
              master_designation_position_count: m.designation_count || contactCount,
              contact_designation: m.designation || '',
              contact_position_type: m.position_type || '',
              contact_designation_position_count: contactCount,
              validation_status: contactCount > 0 ? 'DATA IN BOTH' : 'DATA IN MASTER',
              created_by: m.created_by || 'ADMIN',
              created_date: m.created_date || '09-SEP-2026',
              modified_by: m.modified_by || '',
              modified_date: m.modified_date || '',
            },
          });
        }
      }

      // Fallback
      return res.status(404).json({ success: false, message: 'Designation and Position record not found.' });
    }

    return res.status(404).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/designation-position/:id/contacts
 * Returns linked contacts drilldown sub-report matching this record's designation/position.
 */
router.get('/designation-position/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let designation = req.query.designation || '';
      let positionType = req.query.position_type || '';

      if (!designation) {
        const numId = parseInt(id, 10);
        if (numId < 9900000) {
          const mRes = await db.query('SELECT designation, position_type FROM master_designation_positions WHERE id = $1', [numId]);
          if (mRes.rows.length > 0) {
            designation = mRes.rows[0].designation;
            positionType = mRes.rows[0].position_type;
          }
        }
      }

      let queryParams = [designation.toLowerCase().trim()];
      let whereSql = `WHERE LOWER(TRIM(COALESCE(c.designation, ''))) = $1`;

      if (search && search.trim()) {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        whereSql += ` AND (LOWER(COALESCE(c.contact_name, '')) LIKE $${queryParams.length} OR LOWER(COALESCE(c.comp_name, '')) LIKE $${queryParams.length} OR TO_CHAR(c.id) LIKE $${queryParams.length})`;
      }

      const countRes = await db.query(`SELECT COUNT(*)::int as total FROM contacts c ${whereSql}`, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          c.id, 
          COALESCE(c.contact_name, 'Unknown') as contact_name, 
          COALESCE(c.comp_name, '') as comp_name, 
          COALESCE(c.designation, '') as designation, 
          COALESCE(c.pos_type, '') as pos_type, 
          COALESCE(c.comp_email, c.email, '') as comp_email, 
          COALESCE(c.contact_phone, c.phone, '') as contact_phone, 
          COALESCE(c.country, '') as country
        FROM contacts c
        ${whereSql}
        ORDER BY c.id DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/designation-position
 * Creates a new Master Designation & Position record.
 */
router.post('/designation-position', async (req, res, next) => {
  try {
    const { master_designation, master_position_type } = req.body;
    if (!master_designation || !master_designation.trim()) {
      return res.status(400).json({ success: false, message: 'Master Designation is required.' });
    }

    const cleanDesig = master_designation.trim();
    const cleanPos = (master_position_type || '').trim();
    const today = formatServerDate();
    const createdBy = req.body.created_by || 'ADMIN';

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_designation_positions WHERE LOWER(TRIM(designation)) = LOWER(TRIM($1)) AND LOWER(TRIM(COALESCE(position_type, \'\'))) = LOWER(TRIM($2)) LIMIT 1',
        [cleanDesig, cleanPos]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Designation "${cleanDesig}" with position type "${cleanPos}" already exists. Duplicate records are not allowed.`,
        });
      }

      const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 200000) + 1 as next_id FROM master_designation_positions');
      const newId = nextIdRes.rows[0].next_id;

      const insertRes = await db.query(`
        INSERT INTO master_designation_positions (id, designation, position_type, created_by, created_date, modified_by, modified_date, designation_count, position_type_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [newId, cleanDesig, cleanPos, createdBy, today, 'AMAAN', today, 0, 0]);

      return res.status(201).json({
        success: true,
        message: 'Master Designation & Position created successfully.',
        data: insertRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/designation-position/:id
 * Updates Designation & Position record. If updateContacts is true ("Update Records" button),
 * updates matching contacts in real-time.
 */
router.put('/designation-position/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const {
      master_designation,
      master_position_type,
      contact_designation,
      contact_position_type,
      updateContacts = false,
      old_designation = '',
    } = req.body;

    const modifiedDate = formatServerDate();
    const modifiedBy = 'AMAAN';

    if (db.isAvailable && db.isAvailable()) {
      // Duplicate check if renaming
      if (master_designation && numId < 9900000 && !isNaN(numId)) {
        const cleanDesig = master_designation.trim();
        const cleanPos = (master_position_type || '').trim();
        const dup = await db.query(
          'SELECT id FROM master_designation_positions WHERE LOWER(TRIM(designation)) = LOWER(TRIM($1)) AND LOWER(TRIM(COALESCE(position_type, \'\'))) = LOWER(TRIM($2)) AND id != $3 LIMIT 1',
          [cleanDesig, cleanPos, numId]
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Designation "${cleanDesig}" with position type "${cleanPos}" already exists. Duplicate records are not allowed.`,
          });
        }
      }

      // 1. If it's a real master record, update master_designation_positions
      if (numId < 9900000 && !isNaN(numId)) {
        await db.query(`
          UPDATE master_designation_positions
          SET designation = COALESCE($1, designation),
              position_type = COALESCE($2, position_type),
              modified_by = $3,
              modified_date = $4
          WHERE id = $5
        `, [
          master_designation !== undefined ? master_designation.trim() : null,
          master_position_type !== undefined ? master_position_type.trim() : null,
          modifiedBy,
          modifiedDate,
          numId
        ]);
      }

      // 2. If updateContacts is requested ("Update Records" button or changing contact pos_type)
      let contactsUpdated = 0;
      if (updateContacts || contact_position_type || contact_designation) {
        const targetOldDesig = old_designation || master_designation || contact_designation || '';
        const newDesig = (contact_designation || master_designation || '').trim();
        const newPos = (contact_position_type || master_position_type || '').trim();

        if (targetOldDesig && (newDesig || newPos)) {
          const upRes = await db.query(`
            UPDATE contacts
            SET designation = COALESCE(NULLIF($1, ''), designation),
                pos_type = COALESCE(NULLIF($2, ''), pos_type),
                position_type = COALESCE(NULLIF($2, ''), position_type),
                modified_by = $3,
                modified_date = $4
            WHERE LOWER(TRIM(COALESCE(designation, ''))) = LOWER(TRIM($5))
          `, [newDesig, newPos, modifiedBy, modifiedDate, targetOldDesig]);
          contactsUpdated = upRes.rowCount || 0;
        }
      }

      return res.json({
        success: true,
        message: updateContacts 
          ? `Designation & Position updated. ${contactsUpdated} contact records updated in real time.`
          : 'Record updated successfully.',
        contactsUpdated,
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/designation-position/:id
 * Deletes single master designation and position record.
 */
router.delete('/designation-position/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    if (numId < 9900000 && !isNaN(numId)) {
      const result = await db.query(`DELETE FROM master_designation_positions WHERE id = $1 RETURNING *`, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }
    }
    return res.json({ success: true, message: 'Designation and Position record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/designation-position/batch-delete
 * Bulk deletes master records by array of IDs.
 */
router.post('/designation-position/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_designation_positions WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} records.` });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// LINKEDIN ACCOUNTS & COUNTRIES MASTER ENDPOINTS
// ============================================================================

/**
 * GET /api/masters/linkedin-accounts
 * Returns all LinkedIn Accounts & Countries master records with live dynamic contact counts.
 */
router.get('/linkedin-accounts', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 1000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.linkedin_conn_acc, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.linked_id, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.country, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.linked_in_url, '')) LIKE $${idx}
        )`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*)::int as total FROM master_linkedin_accounts m ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = 'ORDER BY m.id ASC';
      if (sortBy === 'master_linkedin_connected_account') {
        orderByClause = `ORDER BY m.linkedin_conn_acc ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'master_contact_count') {
        orderByClause = `ORDER BY m.contact_count ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'country') {
        orderByClause = `ORDER BY m.country ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'account_status') {
        orderByClause = `ORDER BY m.is_active ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      }

      const dataSql = `
        SELECT 
          m.id,
          m.linkedin_conn_acc as master_linkedin_connected_account,
          COALESCE((
            SELECT COUNT(*)::int FROM contacts c 
            WHERE LOWER(COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '')) LIKE '%' || LOWER(TRIM(m.linkedin_conn_acc)) || '%'
          ), m.contact_count) as master_contact_count,
          m.linked_id as linkedin_id,
          m.linked_in_url as linkedin_url,
          CASE WHEN m.is_active = 'Y' THEN 'Active' ELSE 'Inactive' END as account_status,
          m.is_active,
          m.country,
          m.linked_in_updated_date as linkedin_updated_date,
          m.created_by,
          m.created_date,
          m.modified_by,
          m.modified_date
        FROM master_linkedin_accounts m
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/linkedin-accounts/:id
 * Retrieves single LinkedIn account master record.
 */
router.get('/linkedin-accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      const masterRes = await db.query('SELECT * FROM master_linkedin_accounts WHERE id = $1', [numId]);
      if (masterRes.rows.length > 0) {
        const m = masterRes.rows[0];
        const cCountRes = await db.query(`
          SELECT COUNT(*)::int as cnt FROM contacts 
          WHERE LOWER(COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc, '')) LIKE '%' || LOWER(TRIM($1)) || '%'
        `, [m.linkedin_conn_acc]);
        const dynamicCount = cCountRes.rows[0]?.cnt || m.contact_count || 0;

        return res.json({
          success: true,
          data: {
            id: m.id,
            linkedin_conn_acc: m.linkedin_conn_acc,
            master_linkedin_connected_account: m.linkedin_conn_acc,
            linked_id: m.linked_id,
            linkedin_id: m.linked_id,
            linked_in_url: m.linked_in_url,
            linkedin_url: m.linked_in_url,
            is_active: m.is_active === 'Y',
            account_status: m.is_active === 'Y' ? 'Active' : 'Inactive',
            country: m.country,
            linked_in_updated_date: m.linked_in_updated_date,
            linkedin_updated_date: m.linked_in_updated_date,
            contact_count: dynamicCount,
            master_contact_count: dynamicCount,
            created_by: m.created_by,
            created_date: m.created_date,
            modified_by: m.modified_by,
            modified_date: m.modified_date,
          },
        });
      }
      return res.status(404).json({ success: false, message: 'LinkedIn account not found.' });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/linkedin-accounts/:id/contacts
 * Returns drilldown contacts matching this LinkedIn connected account.
 */
router.get('/linkedin-accounts/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let accountName = req.query.account || '';

      if (!accountName) {
        const numId = parseInt(id, 10);
        const mRes = await db.query('SELECT linkedin_conn_acc FROM master_linkedin_accounts WHERE id = $1', [numId]);
        if (mRes.rows.length > 0) {
          accountName = mRes.rows[0].linkedin_conn_acc;
        }
      }

      let queryParams = [`%${(accountName || '').toLowerCase().trim()}%`];
      let whereSql = `WHERE LOWER(COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '')) LIKE $1`;

      if (search && search.trim()) {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereSql += ` AND (
          LOWER(COALESCE(c.contact_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, '')) LIKE $${sIdx} OR
          TO_CHAR(c.id) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_email, c.email, '')) LIKE $${sIdx}
        )`;
      }

      const countRes = await db.query(`SELECT COUNT(*)::int as total FROM contacts c ${whereSql}`, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          c.id, 
          COALESCE(c.contact_name, 'Unknown') as contact_name, 
          COALESCE(c.comp_name, '') as comp_name, 
          COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '') as linkedin_cnnctd_acc,
          COALESCE(c.source, '') as source,
          COALESCE(c.designation, '') as designation, 
          COALESCE(c.comp_email, c.email, '') as comp_email, 
          COALESCE(c.contact_phone, c.phone, '') as contact_phone, 
          COALESCE(c.country, '') as country
        FROM contacts c
        ${whereSql}
        ORDER BY c.id DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/linkedin-accounts
 * Creates a new master LinkedIn account record.
 */
router.post('/linkedin-accounts', async (req, res, next) => {
  try {
    const {
      linkedin_conn_acc,
      linked_id,
      linked_in_url,
      country,
      linked_in_updated_date,
      is_active,
    } = req.body;

    if (!linkedin_conn_acc || !linkedin_conn_acc.trim()) {
      return res.status(400).json({ success: false, message: 'LinkedIn Connected Account name is required.' });
    }

    const cleanAcc = linkedin_conn_acc.trim();
    const cleanId = (linked_id || '').trim();
    const today = formatServerDate();
    const createdBy = req.body.created_by || 'APEX_PUBLIC_USER';
    const activeStr = is_active === true || is_active === 'Y' || is_active === 'Active' ? 'Y' : 'N';

    if (db.isAvailable && db.isAvailable()) {
      let dupSql = 'SELECT id FROM master_linkedin_accounts WHERE LOWER(TRIM(linkedin_conn_acc)) = LOWER(TRIM($1))';
      let dupParams = [cleanAcc];
      if (cleanId) {
        dupSql += ' OR LOWER(TRIM(linked_id)) = LOWER(TRIM($2))';
        dupParams.push(cleanId);
      }
      const dup = await db.query(dupSql, dupParams);
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `LinkedIn account "${cleanAcc}" already exists. Duplicate records are not allowed.`,
        });
      }

      const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 10) + 1 as next_id FROM master_linkedin_accounts');
      const newId = nextIdRes.rows[0].next_id;

      const insertRes = await db.query(`
        INSERT INTO master_linkedin_accounts (
          id, linkedin_conn_acc, linked_id, linked_in_url, country,
          linked_in_updated_date, created_by, created_date, modified_by, modified_date,
          is_active, contact_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MARIYA_BADAR', $8, $9, 0)
        RETURNING *
      `, [
        newId,
        linkedin_conn_acc.trim(),
        (linked_id || '').trim(),
        (linked_in_url || '').trim(),
        (country || '').trim(),
        linked_in_updated_date || today,
        createdBy,
        today,
        activeStr
      ]);

      return res.status(201).json({
        success: true,
        message: 'LinkedIn account created successfully.',
        data: insertRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/linkedin-accounts/:id
 * Updates master LinkedIn account record.
 */
router.put('/linkedin-accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const {
      linkedin_conn_acc,
      linked_id,
      linked_in_url,
      country,
      linked_in_updated_date,
      is_active,
    } = req.body;

    const modifiedDate = formatServerDate();
    const modifiedBy = 'MARIYA_BADAR';
    const activeStr = is_active === true || is_active === 'Y' || is_active === 'Active' ? 'Y' : 'N';

    if (db.isAvailable && db.isAvailable()) {
      if (linkedin_conn_acc) {
        const cleanAcc = linkedin_conn_acc.trim();
        const cleanId = (linked_id || '').trim();
        let dupSql = 'SELECT id FROM master_linkedin_accounts WHERE (LOWER(TRIM(linkedin_conn_acc)) = LOWER(TRIM($1))';
        let dupParams = [cleanAcc];
        if (cleanId) {
          dupSql += ' OR LOWER(TRIM(linked_id)) = LOWER(TRIM($2))';
          dupParams.push(cleanId);
        }
        dupSql += `) AND id != $${dupParams.length + 1} LIMIT 1`;
        dupParams.push(numId);
        const dup = await db.query(dupSql, dupParams);
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `LinkedIn account "${cleanAcc}" already exists. Duplicate records are not allowed.`,
          });
        }
      }

      const updateRes = await db.query(`
        UPDATE master_linkedin_accounts
        SET linkedin_conn_acc = COALESCE($1, linkedin_conn_acc),
            linked_id = COALESCE($2, linked_id),
            linked_in_url = COALESCE($3, linked_in_url),
            country = COALESCE($4, country),
            linked_in_updated_date = COALESCE($5, linked_in_updated_date),
            is_active = COALESCE($6, is_active),
            modified_by = $7,
            modified_date = $8
        WHERE id = $9
        RETURNING *
      `, [
        linkedin_conn_acc !== undefined ? linkedin_conn_acc.trim() : null,
        linked_id !== undefined ? linked_id.trim() : null,
        linked_in_url !== undefined ? linked_in_url.trim() : null,
        country !== undefined ? country.trim() : null,
        linked_in_updated_date !== undefined ? linked_in_updated_date : null,
        is_active !== undefined ? activeStr : null,
        modifiedBy,
        modifiedDate,
        numId
      ]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'LinkedIn account not found.' });
      }

      return res.json({
        success: true,
        message: 'LinkedIn account updated successfully.',
        data: updateRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



// ============================================================================
// INDUSTRY MASTER ENDPOINTS
// ============================================================================

/**
 * GET /api/masters/industry/filter-options
 * Returns filter options for top filter card (Industry, Company Type).
 */
router.get('/industry/filter-options', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const [indRes, typeRes] = await Promise.all([
        db.query(`
          SELECT DISTINCT industry 
          FROM master_industries 
          WHERE industry IS NOT NULL AND TRIM(industry) != '' 
          ORDER BY industry ASC 
          LIMIT 500
        `),
        db.query(`
          SELECT DISTINCT master_company_type as company_type 
          FROM master_company_types 
          WHERE master_company_type IS NOT NULL AND TRIM(master_company_type) != '' 
          ORDER BY master_company_type ASC
        `),
      ]);

      const industries = indRes.rows.map((r) => r.industry);
      const companyTypes = typeRes.rows.map((r) => r.company_type);

      return res.json({
        success: true,
        data: {
          industries,
          companyTypes,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        industries: [],
        companyTypes: ['Direct Client', 'IT Company', 'Staffing Firm'],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/industry
 * Returns Industry Master report rows:
 * Full outer joins master_industries with live dynamic counts from companies table.
 */
router.get('/industry', async (req, res, next) => {
  try {
    const {
      search = '',
      industry = '',
      company_type = '',
      createdDate = '',
      modifiedDate = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'company_industry_company_type_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.industry, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.company_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.industry, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.company_type, '')) LIKE $${idx}
        )`);
      }

      if (industry && industry.trim() !== '') {
        queryParams.push(`%${industry.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.industry, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.industry, '')) LIKE $${idx}
        )`);
      }

      if (company_type && company_type.trim() !== '') {
        queryParams.push(`%${company_type.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.company_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.company_type, '')) LIKE $${idx}
        )`);
      }

      if (createdDate && createdDate.trim() !== '') {
        queryParams.push(`%${createdDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.created_date ILIKE $${idx}`);
      }

      if (modifiedDate && modifiedDate.trim() !== '') {
        queryParams.push(`%${modifiedDate.trim()}%`);
        const idx = queryParams.length;
        whereConditions.push(`m.modified_date ILIKE $${idx}`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`m.industry IS NOT NULL AND m.industry != '' AND c.industry IS NOT NULL AND c.industry != '' AND c.dynamic_count > 0`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`m.industry IS NOT NULL AND m.industry != '' AND (c.industry IS NULL OR c.dynamic_count = 0)`);
        } else if (valUpper === 'DATA IN COMPANY') {
          whereConditions.push(`(m.industry IS NULL OR m.industry = '') AND (c.industry IS NOT NULL OR c.company_type IS NOT NULL)`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH company_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(industry), ''), '') as industry,
            COALESCE(NULLIF(TRIM(company_type), ''), '') as company_type,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(industry), ''), ''), COALESCE(NULLIF(TRIM(company_type), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM master_industries m
        FULL OUTER JOIN company_counts c 
          ON LOWER(TRIM(COALESCE(m.industry, ''))) = LOWER(TRIM(COALESCE(c.industry, '')))
         AND LOWER(TRIM(COALESCE(m.company_type, ''))) = LOWER(TRIM(COALESCE(c.company_type, '')))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = 'ORDER BY COALESCE(c.dynamic_count, 0) DESC, m.id ASC NULLS LAST';
      if (sortBy === 'master_industry') {
        orderByClause = `ORDER BY COALESCE(m.industry, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'master_company_type') {
        orderByClause = `ORDER BY COALESCE(m.company_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'company_industry') {
        orderByClause = `ORDER BY COALESCE(c.industry, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'company_company_type') {
        orderByClause = `ORDER BY COALESCE(c.company_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'company_industry_company_type_count' || sortBy === 'master_industry_company_type_count') {
        orderByClause = `ORDER BY COALESCE(c.dynamic_count, 0) ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} NULLS LAST`;
      } else if (sortBy === 'id') {
        orderByClause = `ORDER BY m.id ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      }

      const dataSql = `
        WITH company_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(industry), ''), '') as industry,
            COALESCE(NULLIF(TRIM(company_type), ''), '') as company_type,
            COUNT(*)::int as dynamic_count
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(industry), ''), ''), COALESCE(NULLIF(TRIM(company_type), ''), '')
        )
        SELECT 
          COALESCE(m.id, 9900000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.industry, '') as master_industry,
          COALESCE(m.company_type, '') as master_company_type,
          COALESCE(c.dynamic_count, 0) as master_industry_company_type_count,
          COALESCE(c.industry, '') as company_industry,
          COALESCE(c.company_type, '') as company_company_type,
          COALESCE(c.dynamic_count, 0) as company_industry_company_type_count,
          CASE
            WHEN m.industry IS NOT NULL AND m.industry != '' AND c.industry IS NOT NULL AND c.industry != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.industry IS NULL OR m.industry = '') AND (c.industry IS NOT NULL OR c.company_type IS NOT NULL) THEN 'DATA IN COMPANY'
            WHEN m.industry IS NOT NULL AND (c.industry IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, '') as modified_by,
          COALESCE(m.modified_date, '') as modified_date
        FROM master_industries m
        FULL OUTER JOIN company_counts c 
          ON LOWER(TRIM(COALESCE(m.industry, ''))) = LOWER(TRIM(COALESCE(c.industry, '')))
         AND LOWER(TRIM(COALESCE(m.company_type, ''))) = LOWER(TRIM(COALESCE(c.company_type, '')))
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/industry/:id
 * Retrieves single master industry record with dynamic company counts.
 */
router.get('/industry/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      if (numId < 9900000 && !isNaN(numId)) {
        const masterRes = await db.query('SELECT * FROM master_industries WHERE id = $1', [numId]);
        if (masterRes.rows.length > 0) {
          const m = masterRes.rows[0];
          const cCountRes = await db.query(`
            SELECT COUNT(*)::int as cnt 
            FROM companies 
            WHERE LOWER(TRIM(COALESCE(industry, ''))) = LOWER(TRIM($1))
              AND (
                $2 = '' OR LOWER(TRIM(COALESCE(company_type, ''))) = LOWER(TRIM($2))
              )
          `, [m.industry || '', m.company_type || '']);
          const compCount = cCountRes.rows[0]?.cnt || 0;

          return res.json({
            success: true,
            data: {
              id: m.id,
              master_industry: m.industry || '',
              master_company_type: m.company_type || '',
              master_total_company: compCount,
              master_industry_company_type_count: compCount,
              company_industry: m.industry || '',
              company_company_type: m.company_type || '',
              company_company_count: compCount,
              company_industry_company_type_count: compCount,
              validation_status: compCount > 0 ? 'DATA IN BOTH' : 'DATA IN MASTER',
              created_by: m.created_by || 'APEX_PUBLIC_USER',
              created_date: m.created_date || '20-JUL-2026',
              modified_by: m.modified_by || '',
              modified_date: m.modified_date || '',
            },
          });
        }
      }

      return res.status(404).json({ success: false, message: 'Industry record not found.' });
    }

    return res.status(404).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/industry/:id/companies
 * Returns linked companies drilldown sub-report matching this record's industry/company_type.
 */
router.get('/industry/:id/companies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let industry = req.query.industry || '';
      let companyType = req.query.company_type || '';

      if (!industry && !companyType) {
        const numId = parseInt(id, 10);
        if (numId < 9900000) {
          const mRes = await db.query('SELECT industry, company_type FROM master_industries WHERE id = $1', [numId]);
          if (mRes.rows.length > 0) {
            industry = mRes.rows[0].industry;
            companyType = mRes.rows[0].company_type;
          }
        }
      }

      let queryParams = [];
      let whereConditions = [];

      if (industry && industry.trim()) {
        queryParams.push(industry.toLowerCase().trim());
        whereConditions.push(`LOWER(TRIM(COALESCE(c.industry, ''))) = $${queryParams.length}`);
      } else {
        // Industry is empty (matching DATA IN COMPANY row with empty industry)
        whereConditions.push(`(c.industry IS NULL OR TRIM(c.industry) = '')`);
      }

      if (companyType && companyType.trim()) {
        queryParams.push(companyType.toLowerCase().trim());
        whereConditions.push(`LOWER(TRIM(COALESCE(c.company_type, ''))) = $${queryParams.length}`);
      }

      if (search && search.trim()) {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.comp_name, c.name, '')) LIKE $${idx} OR
          TO_CHAR(c.id) LIKE $${idx} OR
          LOWER(COALESCE(c.industry, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.company_type, '')) LIKE $${idx}
        )`);
      }

      const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countRes = await db.query(`SELECT COUNT(*)::int as total FROM companies c ${whereSql}`, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          c.id, 
          COALESCE(c.comp_name, c.name, 'Unknown') as company_name, 
          COALESCE(c.industry, '') as industry, 
          COALESCE(c.company_type, '') as company_type, 
          COALESCE(c.contact_count, c.contacts_count, 0) as contact_count, 
          COALESCE(c.lead_count, 0) as lead_count,
          COALESCE(c.country, '') as country,
          COALESCE(c.city, '') as city,
          COALESCE(c.website, '') as website
        FROM companies c
        ${whereSql}
        ORDER BY c.id DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/industry
 * Creates a new Master Industry record.
 */
router.post('/industry', async (req, res, next) => {
  try {
    const { master_industry, master_company_type } = req.body;
    if (!master_industry || !master_industry.trim()) {
      return res.status(400).json({ success: false, message: 'Master Industry is required.' });
    }

    const cleanInd = master_industry.trim();
    const cleanType = (master_company_type || '').trim();
    const today = formatServerDate();
    const createdBy = req.body.created_by || 'APEX_PUBLIC_USER';

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_industries WHERE LOWER(TRIM(industry)) = LOWER(TRIM($1)) AND LOWER(TRIM(COALESCE(company_type, \'\'))) = LOWER(TRIM(COALESCE($2, \'\'))) LIMIT 1',
        [cleanInd, cleanType]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Industry "${cleanInd}" already exists. Duplicate records are not allowed.`,
        });
      }

      const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 50000) + 1 as next_id FROM master_industries');
      const newId = nextIdRes.rows[0].next_id;

      const insertRes = await db.query(`
        INSERT INTO master_industries (id, industry, company_type, created_by, created_date, modified_by, modified_date, company_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [newId, cleanInd, cleanType, createdBy, today, 'ADMIN', today, 0]);

      return res.status(201).json({
        success: true,
        message: 'Master Industry created successfully.',
        data: insertRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/industry/:id
 * Updates Industry record. If updateCompany is true ("Update Company" button),
 * updates matching companies in real-time.
 */
router.put('/industry/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const {
      master_industry,
      master_company_type,
      company_industry,
      company_company_type,
      updateCompany = false,
      old_industry = '',
      old_company_type = '',
    } = req.body;

    const modifiedDate = formatServerDate();
    const modifiedBy = 'AMAAN';

    if (db.isAvailable && db.isAvailable()) {
      // Duplicate check if updating master record
      if (master_industry && numId < 9900000 && !isNaN(numId)) {
        const cleanInd = master_industry.trim();
        const cleanType = (master_company_type || '').trim();
        const dup = await db.query(
          'SELECT id FROM master_industries WHERE LOWER(TRIM(industry)) = LOWER(TRIM($1)) AND LOWER(TRIM(COALESCE(company_type, \'\'))) = LOWER(TRIM(COALESCE($2, \'\'))) AND id != $3 LIMIT 1',
          [cleanInd, cleanType, numId]
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Industry "${cleanInd}" already exists. Duplicate records are not allowed.`,
          });
        }
      }

      // 1. If it's a real master record, update master_industries
      if (numId < 9900000 && !isNaN(numId)) {
        await db.query(`
          UPDATE master_industries
          SET industry = COALESCE($1, industry),
              company_type = COALESCE($2, company_type),
              modified_by = $3,
              modified_date = $4
          WHERE id = $5
        `, [
          master_industry !== undefined ? master_industry.trim() : null,
          master_company_type !== undefined ? master_company_type.trim() : null,
          modifiedBy,
          modifiedDate,
          numId
        ]);
      } else {
        // Virtual ID from DATA IN COMPANY -> insert into master_industries if not exists
        const targetInd = (master_industry || company_industry || '').trim();
        const targetType = (master_company_type || company_company_type || '').trim();
        if (targetInd || targetType) {
          const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 50000) + 1 as next_id FROM master_industries');
          const newId = nextIdRes.rows[0].next_id;
          await db.query(`
            INSERT INTO master_industries (id, industry, company_type, created_by, created_date, modified_by, modified_date)
            VALUES ($1, $2, $3, 'APEX_PUBLIC_USER', $4, $5, $4)
            ON CONFLICT (id) DO NOTHING
          `, [newId, targetInd, targetType, modifiedDate, modifiedBy]);
        }
      }

      // 2. If updateCompany is requested ("Update Company" button)
      let companiesUpdated = 0;
      if (updateCompany || company_company_type || company_industry) {
        const fromInd = (old_industry || master_industry || company_industry || '').trim();
        const fromType = (old_company_type || '').trim();
        const toInd = (company_industry || master_industry || '').trim();
        const toType = (company_company_type || master_company_type || '').trim();

        let updateSql = `UPDATE companies SET modified_by = $1, modified_date = $2`;
        let updateParams = [modifiedBy, modifiedDate];

        if (toInd) {
          updateSql += `, industry = $${updateParams.length + 1}`;
          updateParams.push(toInd);
        }
        if (toType) {
          updateSql += `, company_type = $${updateParams.length + 1}`;
          updateParams.push(toType);
        }

        let whereClauses = [];
        if (fromInd) {
          whereClauses.push(`LOWER(TRIM(COALESCE(industry, ''))) = LOWER(TRIM($${updateParams.length + 1}))`);
          updateParams.push(fromInd);
        } else {
          whereClauses.push(`(industry IS NULL OR TRIM(industry) = '')`);
        }

        if (fromType) {
          whereClauses.push(`LOWER(TRIM(COALESCE(company_type, ''))) = LOWER(TRIM($${updateParams.length + 1}))`);
          updateParams.push(fromType);
        }

        updateSql += ` WHERE ${whereClauses.join(' AND ')}`;
        const upRes = await db.query(updateSql, updateParams);
        companiesUpdated = upRes.rowCount || 0;
      }

      return res.json({
        success: true,
        message: updateCompany 
          ? `Industry updated. ${companiesUpdated} company record(s) updated in real time.`
          : 'Record updated successfully.',
        companiesUpdated,
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/industry/:id
 * Deletes single master industry record.
 */
router.delete('/industry/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    if (numId < 9900000 && !isNaN(numId)) {
      const result = await db.query(`DELETE FROM master_industries WHERE id = $1 RETURNING *`, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }
    }
    return res.json({ success: true, message: 'Industry record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/industry/batch-delete
 * Bulk deletes master records by array of IDs.
 */
router.post('/industry/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_industries WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} records.` });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// LINKEDIN ACCOUNTS & COUNTRIES MASTER ENDPOINTS
// ============================================================================

/**
 * GET /api/masters/linkedin-accounts
 * Returns all LinkedIn Accounts & Countries master records with live dynamic contact counts.
 */
router.get('/linkedin-accounts', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 1000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.linkedin_conn_acc, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.linked_id, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.country, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.linked_in_url, '')) LIKE $${idx}
        )`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*)::int as total FROM master_linkedin_accounts m ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = 'ORDER BY m.id ASC';
      if (sortBy === 'master_linkedin_connected_account') {
        orderByClause = `ORDER BY m.linkedin_conn_acc ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'master_contact_count') {
        orderByClause = `ORDER BY m.contact_count ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'country') {
        orderByClause = `ORDER BY m.country ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      } else if (sortBy === 'account_status') {
        orderByClause = `ORDER BY m.is_active ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      }

      const dataSql = `
        SELECT 
          m.id,
          m.linkedin_conn_acc as master_linkedin_connected_account,
          COALESCE((
            SELECT COUNT(*)::int FROM contacts c 
            WHERE LOWER(COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '')) LIKE '%' || LOWER(TRIM(m.linkedin_conn_acc)) || '%'
          ), m.contact_count) as master_contact_count,
          m.linked_id as linkedin_id,
          m.linked_in_url as linkedin_url,
          CASE WHEN m.is_active = 'Y' THEN 'Active' ELSE 'Inactive' END as account_status,
          m.is_active,
          m.country,
          m.linked_in_updated_date as linkedin_updated_date,
          m.created_by,
          m.created_date,
          m.modified_by,
          m.modified_date
        FROM master_linkedin_accounts m
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/linkedin-accounts/:id
 * Retrieves single LinkedIn account master record.
 */
router.get('/linkedin-accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      const masterRes = await db.query('SELECT * FROM master_linkedin_accounts WHERE id = $1', [numId]);
      if (masterRes.rows.length > 0) {
        const m = masterRes.rows[0];
        const cCountRes = await db.query(`
          SELECT COUNT(*)::int as cnt FROM contacts 
          WHERE LOWER(COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc, '')) LIKE '%' || LOWER(TRIM($1)) || '%'
        `, [m.linkedin_conn_acc]);
        const dynamicCount = cCountRes.rows[0]?.cnt || m.contact_count || 0;

        return res.json({
          success: true,
          data: {
            id: m.id,
            linkedin_conn_acc: m.linkedin_conn_acc,
            master_linkedin_connected_account: m.linkedin_conn_acc,
            linked_id: m.linked_id,
            linkedin_id: m.linked_id,
            linked_in_url: m.linked_in_url,
            linkedin_url: m.linked_in_url,
            is_active: m.is_active === 'Y',
            account_status: m.is_active === 'Y' ? 'Active' : 'Inactive',
            country: m.country,
            linked_in_updated_date: m.linked_in_updated_date,
            linkedin_updated_date: m.linked_in_updated_date,
            contact_count: dynamicCount,
            master_contact_count: dynamicCount,
            created_by: m.created_by,
            created_date: m.created_date,
            modified_by: m.modified_by,
            modified_date: m.modified_date,
          },
        });
      }
      return res.status(404).json({ success: false, message: 'LinkedIn account not found.' });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/linkedin-accounts/:id/contacts
 * Returns drilldown contacts matching this LinkedIn connected account.
 */
router.get('/linkedin-accounts/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let accountName = req.query.account || '';

      if (!accountName) {
        const numId = parseInt(id, 10);
        const mRes = await db.query('SELECT linkedin_conn_acc FROM master_linkedin_accounts WHERE id = $1', [numId]);
        if (mRes.rows.length > 0) {
          accountName = mRes.rows[0].linkedin_conn_acc;
        }
      }

      let queryParams = [`%${(accountName || '').toLowerCase().trim()}%`];
      let whereSql = `WHERE LOWER(COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '')) LIKE $1`;

      if (search && search.trim()) {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereSql += ` AND (
          LOWER(COALESCE(c.contact_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, '')) LIKE $${sIdx} OR
          TO_CHAR(c.id) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_email, c.email, '')) LIKE $${sIdx}
        )`;
      }

      const countRes = await db.query(`SELECT COUNT(*)::int as total FROM contacts c ${whereSql}`, queryParams);
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          c.id, 
          COALESCE(c.contact_name, 'Unknown') as contact_name, 
          COALESCE(c.comp_name, '') as comp_name, 
          COALESCE(c.linkedin_cnnctd_acc, c.linkedin_connected_acc, '') as linkedin_cnnctd_acc,
          COALESCE(c.source, '') as source,
          COALESCE(c.designation, '') as designation, 
          COALESCE(c.comp_email, c.email, '') as comp_email, 
          COALESCE(c.contact_phone, c.phone, '') as contact_phone, 
          COALESCE(c.country, '') as country
        FROM contacts c
        ${whereSql}
        ORDER BY c.id DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/linkedin-accounts
 * Creates a new master LinkedIn account record.
 */
router.post('/linkedin-accounts', async (req, res, next) => {
  try {
    const {
      linkedin_conn_acc,
      linked_id,
      linked_in_url,
      country,
      linked_in_updated_date,
      is_active,
    } = req.body;

    if (!linkedin_conn_acc || !linkedin_conn_acc.trim()) {
      return res.status(400).json({ success: false, message: 'LinkedIn Connected Account name is required.' });
    }

    const cleanAcc = linkedin_conn_acc.trim();
    const cleanId = (linked_id || '').trim();
    const today = formatServerDate();
    const createdBy = req.body.created_by || 'APEX_PUBLIC_USER';
    const activeStr = is_active === true || is_active === 'Y' || is_active === 'Active' ? 'Y' : 'N';

    if (db.isAvailable && db.isAvailable()) {
      let dupSql = 'SELECT id FROM master_linkedin_accounts WHERE LOWER(TRIM(linkedin_conn_acc)) = LOWER(TRIM($1))';
      let dupParams = [cleanAcc];
      if (cleanId) {
        dupSql += ' OR LOWER(TRIM(linked_id)) = LOWER(TRIM($2))';
        dupParams.push(cleanId);
      }
      const dup = await db.query(dupSql, dupParams);
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `LinkedIn account "${cleanAcc}" already exists. Duplicate records are not allowed.`,
        });
      }

      const nextIdRes = await db.query('SELECT COALESCE(MAX(id), 10) + 1 as next_id FROM master_linkedin_accounts');
      const newId = nextIdRes.rows[0].next_id;

      const insertRes = await db.query(`
        INSERT INTO master_linkedin_accounts (
          id, linkedin_conn_acc, linked_id, linked_in_url, country,
          linked_in_updated_date, created_by, created_date, modified_by, modified_date,
          is_active, contact_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MARIYA_BADAR', $8, $9, 0)
        RETURNING *
      `, [
        newId,
        linkedin_conn_acc.trim(),
        (linked_id || '').trim(),
        (linked_in_url || '').trim(),
        (country || '').trim(),
        linked_in_updated_date || today,
        createdBy,
        today,
        activeStr
      ]);

      return res.status(201).json({
        success: true,
        message: 'LinkedIn account created successfully.',
        data: insertRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/linkedin-accounts/:id
 * Updates master LinkedIn account record.
 */
router.put('/linkedin-accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    const {
      linkedin_conn_acc,
      linked_id,
      linked_in_url,
      country,
      linked_in_updated_date,
      is_active,
    } = req.body;

    const modifiedDate = formatServerDate();
    const modifiedBy = 'MARIYA_BADAR';
    const activeStr = is_active === true || is_active === 'Y' || is_active === 'Active' ? 'Y' : 'N';

    if (db.isAvailable && db.isAvailable()) {
      if (linkedin_conn_acc) {
        const cleanAcc = linkedin_conn_acc.trim();
        const cleanId = (linked_id || '').trim();
        let dupSql = 'SELECT id FROM master_linkedin_accounts WHERE (LOWER(TRIM(linkedin_conn_acc)) = LOWER(TRIM($1))';
        let dupParams = [cleanAcc];
        if (cleanId) {
          dupSql += ' OR LOWER(TRIM(linked_id)) = LOWER(TRIM($2))';
          dupParams.push(cleanId);
        }
        dupSql += `) AND id != $${dupParams.length + 1} LIMIT 1`;
        dupParams.push(numId);
        const dup = await db.query(dupSql, dupParams);
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `LinkedIn account "${cleanAcc}" already exists. Duplicate records are not allowed.`,
          });
        }
      }

      const updateRes = await db.query(`
        UPDATE master_linkedin_accounts
        SET linkedin_conn_acc = COALESCE($1, linkedin_conn_acc),
            linked_id = COALESCE($2, linked_id),
            linked_in_url = COALESCE($3, linked_in_url),
            country = COALESCE($4, country),
            linked_in_updated_date = COALESCE($5, linked_in_updated_date),
            is_active = COALESCE($6, is_active),
            modified_by = $7,
            modified_date = $8
        WHERE id = $9
        RETURNING *
      `, [
        linkedin_conn_acc !== undefined ? linkedin_conn_acc.trim() : null,
        linked_id !== undefined ? linked_id.trim() : null,
        linked_in_url !== undefined ? linked_in_url.trim() : null,
        country !== undefined ? country.trim() : null,
        linked_in_updated_date !== undefined ? linked_in_updated_date : null,
        is_active !== undefined ? activeStr : null,
        modifiedBy,
        modifiedDate,
        numId
      ]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'LinkedIn account not found.' });
      }

      return res.json({
        success: true,
        message: 'LinkedIn account updated successfully.',
        data: updateRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/linkedin-accounts/:id
 * Deletes single master LinkedIn account record.
 */
router.delete('/linkedin-accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    if (db.isAvailable && db.isAvailable()) {
      const result = await db.query(`DELETE FROM master_linkedin_accounts WHERE id = $1 RETURNING *`, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }
      return res.json({ success: true, message: 'LinkedIn account deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/linkedin-accounts/batch-delete
 * Bulk deletes LinkedIn accounts by array of IDs.
 */
router.post('/linkedin-accounts/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (realIds.length > 0 && db.isAvailable && db.isAvailable()) {
      await db.query(`DELETE FROM master_linkedin_accounts WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} LinkedIn accounts.` });
  } catch (err) {
    next(err);
  }
});
    



// ============================================================================
// POSITION TYPE MASTER ENDPOINTS
// ============================================================================

/**
 * GET /api/masters/position-type
 * Returns Position Type Master report rows:
 * Full outer joins master_position_types with live dynamic counts from contacts table.
 */
router.get('/position-type', async (req, res, next) => {
  try {
    const {
      search = '',
      position_type = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'master_position_type_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.pos_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.contact_pos_type, '')) LIKE $${idx}
        )`);
      }

      if (position_type && position_type.trim() !== '') {
        queryParams.push(`%${position_type.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.pos_type, '')) LIKE $${idx} OR
          LOWER(COALESCE(c.contact_pos_type, '')) LIKE $${idx}
        )`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`m.pos_type IS NOT NULL AND m.pos_type != '' AND c.contact_pos_type IS NOT NULL AND c.contact_pos_type != '' AND c.dynamic_count > 0`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`m.pos_type IS NOT NULL AND (c.contact_pos_type IS NULL OR c.dynamic_count = 0)`);
        } else if (valUpper === 'DATA IN CONTACT') {
          whereConditions.push(`(m.pos_type IS NULL OR m.pos_type = '') AND c.contact_pos_type IS NOT NULL`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(pos_type), ''), '') as contact_pos_type,
            COUNT(*)::int as dynamic_count
          FROM contacts
          WHERE pos_type IS NOT NULL AND TRIM(pos_type) != ''
          GROUP BY COALESCE(NULLIF(TRIM(pos_type), ''), '')
        )
        SELECT COUNT(*)::int as total
        FROM master_position_types m
        FULL OUTER JOIN contact_counts c 
          ON LOWER(TRIM(COALESCE(m.pos_type, ''))) = LOWER(TRIM(COALESCE(c.contact_pos_type, '')))
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderByClause = 'ORDER BY COALESCE(c.dynamic_count, m.contact_count, 0) DESC, m.id ASC NULLS LAST';
      if (sortBy === 'master_position_type') {
        orderByClause = `ORDER BY COALESCE(m.pos_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'contact_position_type') {
        orderByClause = `ORDER BY COALESCE(c.contact_pos_type, '') ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'contact_position_type_count') {
        orderByClause = `ORDER BY COALESCE(c.dynamic_count, 0) ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'master_position_type_count') {
        orderByClause = `ORDER BY COALESCE(c.dynamic_count, m.contact_count, 0) ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'} NULLS LAST`;
      } else if (sortBy === 'created_date') {
        orderByClause = `ORDER BY m.created_date ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'modified_date') {
        orderByClause = `ORDER BY m.modified_date ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      } else if (sortBy === 'id') {
        orderByClause = `ORDER BY m.id ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'} NULLS LAST`;
      }

      const dataSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(pos_type), ''), '') as contact_pos_type,
            COUNT(*)::int as dynamic_count
          FROM contacts
          WHERE pos_type IS NOT NULL AND TRIM(pos_type) != ''
          GROUP BY COALESCE(NULLIF(TRIM(pos_type), ''), '')
        )
        SELECT 
          COALESCE(m.id, 9900000 + ROW_NUMBER() OVER ()) as id,
          COALESCE(m.pos_type, '') as master_position_type,
          COALESCE(c.dynamic_count, m.contact_count, 0) as master_position_type_count,
          COALESCE(c.contact_pos_type, '') as contact_position_type,
          COALESCE(c.dynamic_count, 0) as contact_position_type_count,
          CASE
            WHEN m.pos_type IS NOT NULL AND m.pos_type != '' AND c.contact_pos_type IS NOT NULL AND c.contact_pos_type != '' AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
            WHEN (m.pos_type IS NULL OR m.pos_type = '') AND c.contact_pos_type IS NOT NULL THEN 'DATA IN CONTACT'
            WHEN m.pos_type IS NOT NULL AND (c.contact_pos_type IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
            ELSE 'DATA IN BOTH'
          END as validation_status,
          COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(m.created_date, '20-JUL-2026') as created_date,
          COALESCE(m.modified_by, 'MARIYA_BADAR') as modified_by,
          COALESCE(m.modified_date, '12-NOV-2026') as modified_date
        FROM master_position_types m
        FULL OUTER JOIN contact_counts c 
          ON LOWER(TRIM(COALESCE(m.pos_type, ''))) = LOWER(TRIM(COALESCE(c.contact_pos_type, '')))
        ${whereClause}
        ${orderByClause}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/position-type/options
 * Returns distinct position types for dropdowns.
 */
router.get('/position-type/options', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const resData = await db.query(`
        SELECT DISTINCT pos_type 
        FROM (
          SELECT pos_type FROM master_position_types WHERE pos_type IS NOT NULL AND TRIM(pos_type) != ''
          UNION
          SELECT pos_type FROM contacts WHERE pos_type IS NOT NULL AND TRIM(pos_type) != ''
        ) t
        ORDER BY pos_type ASC
      `);
      return res.json({
        success: true,
        data: resData.rows.map((r) => r.pos_type),
      });
    }
    return res.json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/position-type/:id
 * Returns single position type record with live count.
 */
router.get('/position-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      let record = null;
      if (numId < 9900000) {
        const r = await db.query(`SELECT * FROM master_position_types WHERE id = $1`, [numId]);
        if (r.rows.length > 0) record = r.rows[0];
      }

      if (!record) {
        const r2 = await db.query(`SELECT * FROM master_position_types WHERE LOWER(TRIM(pos_type)) = LOWER(TRIM($1))`, [id]);
        if (r2.rows.length > 0) record = r2.rows[0];
      }

      const targetPos = record ? record.pos_type : id;
      const countRes = await db.query(`
        SELECT COUNT(*)::int as cnt FROM contacts WHERE LOWER(TRIM(COALESCE(pos_type, ''))) = LOWER(TRIM($1))
      `, [targetPos]);
      const dynamicCount = countRes.rows[0]?.cnt || 0;

      return res.json({
        success: true,
        data: {
          id: record ? record.id : numId,
          pos_type: record ? record.pos_type : targetPos,
          master_position_type: record ? record.pos_type : '',
          master_position_type_count: dynamicCount,
          contact_position_type: targetPos,
          contact_position_type_count: dynamicCount,
          validation_status: record && dynamicCount > 0 ? 'DATA IN BOTH' : (!record ? 'DATA IN CONTACT' : 'DATA IN MASTER'),
          created_by: record?.created_by || 'APEX_PUBLIC_USER',
          created_date: record?.created_date || '20-JUL-2026',
          modified_by: record?.modified_by || 'MARIYA_BADAR',
          modified_date: record?.modified_date || '12-NOV-2026',
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/position-type/:id/contacts
 * Returns contacts linked to this position type.
 */
router.get('/position-type/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      pos_type = '',
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let targetPos = pos_type;
      const numId = parseInt(id, 10);
      if (!targetPos && !isNaN(numId) && numId < 9900000) {
        const m = await db.query(`SELECT pos_type FROM master_position_types WHERE id = $1`, [numId]);
        if (m.rows.length > 0) targetPos = m.rows[0].pos_type;
      }
      if (!targetPos) targetPos = id;

      let queryParams = [targetPos.trim()];
      let whereConditions = [`LOWER(TRIM(COALESCE(c.pos_type, ''))) = LOWER(TRIM($1))`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.contact_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.designation, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_email, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.country, '')) LIKE $${sIdx} OR
          c.id::text LIKE $${sIdx} OR
          COALESCE(c.comp_id, '')::text LIKE $${sIdx}
        )`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const countSql = `SELECT COUNT(*)::int as total FROM contacts c ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderCol = 'c.id';
      if (sortBy === 'contact_name') orderCol = 'c.contact_name';
      else if (sortBy === 'comp_name') orderCol = 'c.comp_name';
      else if (sortBy === 'comp_id') orderCol = 'c.comp_id';
      else if (sortBy === 'designation') orderCol = 'c.designation';
      else if (sortBy === 'country') orderCol = 'c.country';

      const dataSql = `
        SELECT 
          c.id,
          c.contact_name,
          COALESCE(c.comp_id::text, '') as company_id,
          COALESCE(c.comp_name, '') as company_name,
          COALESCE(c.pos_type, '') as position_type,
          COALESCE(c.designation, '') as designation,
          COALESCE(c.comp_email, '') as comp_email,
          COALESCE(c.contact_phone, '') as contact_phone,
          COALESCE(c.country, '') as country,
          COALESCE(c.source, '') as source
        FROM contacts c
        ${whereClause}
        ORDER BY ${orderCol} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/position-type
 * Creates a new master position type.
 */
router.post('/position-type', async (req, res, next) => {
  try {
    const { pos_type, created_by } = req.body;
    if (!pos_type || !pos_type.trim()) {
      return res.status(400).json({ success: false, message: 'Position Type is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const existing = await db.query(`
        SELECT * FROM master_position_types WHERE LOWER(TRIM(pos_type)) = LOWER(TRIM($1))
      `, [pos_type.trim()]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: `Position Type "${pos_type.trim()}" already exists.` });
      }

      const createdDate = formatServerDate();
      const modifiedDate = formatServerDate();
      const creator = created_by || 'APEX_PUBLIC_USER';

      const cntRes = await db.query(`
        SELECT COUNT(*)::int as cnt FROM contacts WHERE LOWER(TRIM(COALESCE(pos_type, ''))) = LOWER(TRIM($1))
      `, [pos_type.trim()]);
      const initialCount = cntRes.rows[0]?.cnt || 0;

      const insertRes = await db.query(`
        INSERT INTO master_position_types (pos_type, created_by, created_date, modified_by, modified_date, contact_count)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [pos_type.trim(), creator, createdDate, creator, modifiedDate, initialCount]);

      return res.status(201).json({
        success: true,
        message: 'Position Type created successfully.',
        data: insertRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/position-type/:id
 * Updates an existing master position type.
 */
router.put('/position-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pos_type, modified_by } = req.body;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      const modifiedDate = formatServerDate();
      const modifier = modified_by || 'MARIYA_BADAR';

      let updateRes;
      if (numId < 9900000) {
        if (pos_type && pos_type.trim()) {
          const dup = await db.query(
            'SELECT id FROM master_position_types WHERE LOWER(TRIM(pos_type)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
            [pos_type.trim(), numId]
          );
          if (dup.rows.length > 0) {
            return res.status(409).json({
              success: false,
              message: `Position Type "${pos_type.trim()}" already exists. Duplicate records are not allowed.`,
            });
          }
        }
        updateRes = await db.query(`
          UPDATE master_position_types
          SET pos_type = COALESCE($1, pos_type),
              modified_by = $2,
              modified_date = $3
          WHERE id = $4
          RETURNING *
        `, [pos_type ? pos_type.trim() : null, modifier, modifiedDate, numId]);
      } else {
        const check = await db.query(`SELECT * FROM master_position_types WHERE LOWER(TRIM(pos_type)) = LOWER(TRIM($1))`, [pos_type.trim()]);
        if (check.rows.length === 0) {
          updateRes = await db.query(`
            INSERT INTO master_position_types (pos_type, created_by, created_date, modified_by, modified_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [pos_type.trim(), modifier, modifiedDate, modifier, modifiedDate]);
        } else {
          updateRes = check;
        }
      }

      return res.json({
        success: true,
        message: 'Position Type updated successfully.',
        data: updateRes.rows[0],
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/position-type/:id/update-records
 * "Update Records" button from Screenshot 2:
 * Updates contacts associated with old_pos_type to new_pos_type.
 */
router.post('/position-type/:id/update-records', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { old_pos_type, new_pos_type } = req.body;

    if (!new_pos_type || !new_pos_type.trim()) {
      return res.status(400).json({ success: false, message: 'Target Position Type is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      let sourcePos = old_pos_type;
      const numId = parseInt(id, 10);
      if (!sourcePos && !isNaN(numId) && numId < 9900000) {
        const m = await db.query(`SELECT pos_type FROM master_position_types WHERE id = $1`, [numId]);
        if (m.rows.length > 0) sourcePos = m.rows[0].pos_type;
      }
      if (!sourcePos) sourcePos = new_pos_type;

      // Update contacts table
      const updateResult = await db.query(`
        UPDATE contacts
        SET pos_type = $1
        WHERE LOWER(TRIM(COALESCE(pos_type, ''))) = LOWER(TRIM($2))
        RETURNING id
      `, [new_pos_type.trim(), sourcePos.trim()]);

      // Re-sync contact_count in master
      await db.query(`
        UPDATE master_position_types
        SET contact_count = (
          SELECT COUNT(*)::int FROM contacts WHERE LOWER(TRIM(COALESCE(pos_type, ''))) = LOWER(TRIM(master_position_types.pos_type))
        ),
        modified_date = $1
        WHERE LOWER(TRIM(pos_type)) IN (LOWER(TRIM($2)), LOWER(TRIM($3)))
      `, [formatServerDate(), new_pos_type.trim(), sourcePos.trim()]);

      return res.json({
        success: true,
        message: `Successfully updated ${updateResult.rowCount} contacts to "${new_pos_type.trim()}".`,
        updatedCount: updateResult.rowCount,
      });
    }

    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/position-type/:id
 * Deletes single master position type record.
 */
router.delete('/position-type/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    if (db.isAvailable && db.isAvailable()) {
      const result = await db.query(`DELETE FROM master_position_types WHERE id = $1 RETURNING *`, [numId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }
      return res.json({ success: true, message: 'Position Type deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/position-type/batch-delete
 * Bulk deletes position type records by array of IDs.
 */
router.post('/position-type/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => id < 9900000 && !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_position_types WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} position types.` });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// SALES PERSON MASTER ENDPOINTS
// =========================================================================

/**
 * GET /api/masters/sales-person
 * Returns Master Sales Person report data matching Screenshot 1:
 * salesperson, jobposition, mobile, emails, address, is_active, created_date, modified_date, contact_count.
 */
router.get('/sales-person', async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'ASC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(m.salesperson, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.jobposition, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.mobile, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.emails, '')) LIKE $${idx} OR
          LOWER(COALESCE(m.address, '')) LIKE $${idx}
        )`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        SELECT COUNT(*)::int as total
        FROM master_salespersons m
        ${whereClause}
      `;
      const countRes = await db.query(countSql, queryParams);
      const totalCount = countRes.rows[0]?.total || 0;

      // Safe sorting column
      const validSortCols = {
        id: 'm.id',
        salesperson: 'm.salesperson',
        jobposition: 'm.jobposition',
        mobile: 'm.mobile',
        emails: 'm.emails',
        address: 'm.address',
        is_active: 'm.is_active',
        created_date: 'm.created_date',
        modified_date: 'm.modified_date',
        contact_count: 'contact_count',
      };
      const orderCol = validSortCols[sortBy] || 'm.id';
      const orderDir = (sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      queryParams.push(parsedLimit);
      const limitIdx = queryParams.length;
      queryParams.push(offset);
      const offsetIdx = queryParams.length;

      const dataSql = `
        SELECT 
          m.id,
          m.salesperson,
          m.jobposition,
          m.mobile,
          m.address,
          m.is_active,
          m.left_date,
          m.replaced_by_id,
          m.created_by,
          m.created_date,
          m.modified_by,
          m.modified_date,
          m.emails,
          COALESCE(cc.cnt, 0)::int as contact_count
        FROM master_salespersons m
        LEFT JOIN (
          SELECT LOWER(TRIM(salesperson)) as sp, COUNT(*)::int as cnt
          FROM contacts
          WHERE salesperson IS NOT NULL AND TRIM(salesperson) != ''
          GROUP BY LOWER(TRIM(salesperson))
        ) cc ON LOWER(TRIM(m.salesperson)) = cc.sp
        ${whereClause}
        ORDER BY ${orderCol} ${orderDir}
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const dataRes = await db.query(dataSql, queryParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit) || 1,
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/sales-person/:id
 */
router.get('/sales-person/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);

    if (db.isAvailable && db.isAvailable()) {
      let record = null;
      if (!isNaN(numId)) {
        const r = await db.query(`SELECT * FROM master_salespersons WHERE id = $1`, [numId]);
        if (r.rows.length > 0) record = r.rows[0];
      }

      if (!record) {
        const r2 = await db.query(`SELECT * FROM master_salespersons WHERE LOWER(TRIM(salesperson)) = LOWER(TRIM($1))`, [id]);
        if (r2.rows.length > 0) record = r2.rows[0];
      }

      if (!record) {
        return res.status(404).json({ success: false, message: 'Salesperson record not found.' });
      }

      const countRes = await db.query(`
        SELECT COUNT(*)::int as cnt FROM contacts WHERE LOWER(TRIM(COALESCE(salesperson, ''))) = LOWER(TRIM($1))
      `, [record.salesperson]);
      const dynamicCount = countRes.rows[0]?.cnt || 0;

      return res.json({
        success: true,
        data: {
          ...record,
          contact_count: dynamicCount,
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/sales-person/:id/contacts
 * Fetches contacts associated with the salesperson for sub-report.
 */
router.get('/sales-person/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let targetName = '';
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const m = await db.query(`SELECT salesperson FROM master_salespersons WHERE id = $1`, [numId]);
        if (m.rows.length > 0) targetName = m.rows[0].salesperson;
      }
      if (!targetName) targetName = id;

      let queryParams = [targetName.trim()];
      let whereConditions = [`LOWER(TRIM(COALESCE(c.salesperson, ''))) = LOWER(TRIM($1))`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.contact_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.company_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.designation, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.pos_type, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.position_type, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.email, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_email, '')) LIKE $${sIdx} OR
          c.id::text LIKE $${sIdx} OR
          COALESCE(c.comp_id, c.company_id, '')::text LIKE $${sIdx}
        )`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const countSql = `SELECT COUNT(*)::int as total FROM contacts c ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const totalCount = countRes.rows[0]?.total || 0;

      const validSort = {
        id: 'c.id',
        contact_name: 'c.contact_name',
        company_name: 'c.comp_name',
        designation: 'c.designation',
        position_type: 'c.pos_type',
        email: 'c.comp_email',
        mobile: 'c.contact_mobile',
      };
      const orderCol = validSort[sortBy] || 'c.id';
      const orderDir = (sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      queryParams.push(parsedLimit);
      const lIdx = queryParams.length;
      queryParams.push(offset);
      const oIdx = queryParams.length;

      const sql = `
        SELECT 
          c.id,
          c.contact_name,
          COALESCE(c.company_id, c.comp_id) as company_id,
          COALESCE(c.company_name, c.comp_name) as company_name,
          c.designation,
          COALESCE(c.position_type, c.pos_type) as position_type,
          COALESCE(c.email, c.comp_email) as email,
          COALESCE(c.mobile, c.contact_mobile) as mobile,
          c.salesperson,
          c.created_date,
          c.modified_date
        FROM contacts c
        ${whereClause}
        ORDER BY ${orderCol} ${orderDir}
        LIMIT $${lIdx} OFFSET $${oIdx}
      `;

      const dataRes = await db.query(sql, queryParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          total: totalCount,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalCount / parsedLimit) || 1,
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/sales-person
 */
router.post('/sales-person', async (req, res, next) => {
  try {
    const {
      salesperson,
      jobposition = '',
      mobile = '',
      address = '',
      is_active = 'Y',
      left_date = '',
      replaced_by_id = '',
      emails = '',
    } = req.body;

    if (!salesperson || !salesperson.trim()) {
      return res.status(400).json({ success: false, message: 'Salesperson name is required.' });
    }

    const cleanSalesperson = salesperson.trim();

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_salespersons WHERE LOWER(TRIM(salesperson)) = LOWER(TRIM($1)) LIMIT 1',
        [cleanSalesperson]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `A salesperson with the name "${cleanSalesperson}" already exists. Duplicate records are not allowed.`,
        });
      }

      const todayStr = formatServerDate();

      const insertSql = `
        INSERT INTO master_salespersons (
          salesperson, jobposition, mobile, address, is_active,
          left_date, replaced_by_id, emails, created_by, created_date,
          modified_by, modified_date, contact_count, company_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'APEX_PUBLIC_USER', $9, 'ADMIN', $9, 0, 0)
        RETURNING *
      `;

      const result = await db.query(insertSql, [
        salesperson.trim(),
        jobposition ? jobposition.trim() : '',
        mobile ? mobile.trim() : '',
        address ? address.trim() : '',
        is_active === 'N' ? 'N' : 'Y',
        left_date ? left_date.trim() : '',
        replaced_by_id ? String(replaced_by_id).trim() : '',
        emails ? emails.trim() : '',
        todayStr,
      ]);

      return res.json({
        success: true,
        message: 'Salesperson created successfully.',
        data: result.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/sales-person/:id
 */
router.put('/sales-person/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      salesperson,
      jobposition = '',
      mobile = '',
      address = '',
      is_active = 'Y',
      left_date = '',
      replaced_by_id = '',
      emails = '',
    } = req.body;

    if (!salesperson || !salesperson.trim()) {
      return res.status(400).json({ success: false, message: 'Salesperson name is required.' });
    }

    const cleanSalesperson = salesperson.trim();

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_salespersons WHERE LOWER(TRIM(salesperson)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
        [cleanSalesperson, parseInt(id, 10)]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `A salesperson with the name "${cleanSalesperson}" already exists. Duplicate records are not allowed.`,
        });
      }

      const todayStr = formatServerDate();

      // Check current record
      const cur = await db.query(`SELECT * FROM master_salespersons WHERE id = $1`, [id]);
      if (cur.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Salesperson not found.' });
      }

      const updateSql = `
        UPDATE master_salespersons
        SET 
          salesperson = $1,
          jobposition = $2,
          mobile = $3,
          address = $4,
          is_active = $5,
          left_date = $6,
          replaced_by_id = $7,
          emails = $8,
          modified_by = 'ADMIN',
          modified_date = $9
        WHERE id = $10
        RETURNING *
      `;

      const result = await db.query(updateSql, [
        salesperson.trim(),
        jobposition ? jobposition.trim() : '',
        mobile ? mobile.trim() : '',
        address ? address.trim() : '',
        is_active === 'N' ? 'N' : 'Y',
        left_date ? left_date.trim() : '',
        replaced_by_id ? String(replaced_by_id).trim() : '',
        emails ? emails.trim() : '',
        todayStr,
        id,
      ]);

      return res.json({
        success: true,
        message: 'Salesperson updated successfully.',
        data: result.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/sales-person/:id
 */
router.delete('/sales-person/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      await db.query(`DELETE FROM master_salespersons WHERE id = $1`, [id]);
      return res.json({ success: true, message: 'Salesperson deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/sales-person/batch-delete
 */
router.post('/sales-person/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of ids required.' });
    }
    const realIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (realIds.length > 0) {
      await db.query(`DELETE FROM master_salespersons WHERE id = ANY($1::int[])`, [realIds]);
    }
    return res.json({ success: true, message: `Successfully deleted ${realIds.length} salespersons.` });
  } catch (err) {
    next(err);
  }
});

// =========================================================================
// SALES PERSON EMAILS CHILD ENDPOINTS
// =========================================================================

async function refreshSalespersonEmailsText(salesPersonId) {
  try {
    await db.query(`
      WITH numbered AS (
        SELECT 
          ROW_NUMBER() OVER(ORDER BY email_id) as rn,
          email_address
        FROM master_salesperson_emails
        WHERE sales_person_id = $1
      ),
      aggregated AS (
        SELECT STRING_AGG(rn || '. ' || email_address, E'\n' ORDER BY rn) as email_list
        FROM numbered
      )
      UPDATE master_salespersons
      SET emails = COALESCE((SELECT email_list FROM aggregated), '')
      WHERE id = $1;
    `, [salesPersonId]);
  } catch (e) {
    console.warn('[refreshSalespersonEmailsText Error]:', e.message);
  }
}

/**
 * GET /api/masters/sales-person/:id/emails
 * Returns emails belonging to the specific salesperson
 */
router.get('/sales-person/:id/emails', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search = '' } = req.query;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [parseInt(id, 10)];
      let whereConditions = [`sales_person_id = $1`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(email_address) LIKE $${idx} OR
          LOWER(COALESCE(created_by, '')) LIKE $${idx}
        )`);
      }

      const sql = `
        SELECT 
          email_id,
          sales_person_id,
          email_address,
          smtp_password,
          email_daily_limit,
          is_active,
          created_by,
          created_date
        FROM master_salesperson_emails
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY email_id ASC
      `;

      const result = await db.query(sql, queryParams);
      return res.json({ success: true, data: result.rows });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/sales-person-emails/:emailId
 */
router.get('/sales-person-emails/:emailId', async (req, res, next) => {
  try {
    const { emailId } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const result = await db.query(
        `SELECT * FROM master_salesperson_emails WHERE email_id = $1`,
        [parseInt(emailId, 10)]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Email not found.' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * POST /api/masters/sales-person/:id/emails
 */
router.post('/sales-person/:id/emails', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      email_address,
      smtp_password = '',
      email_daily_limit = 10,
      is_active = 'Y',
      created_date = '',
    } = req.body;

    if (!email_address || !email_address.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const salesPersonId = parseInt(id, 10);
      const cleanEmail = email_address.trim();

      const dup = await db.query(
        'SELECT email_id FROM master_salesperson_emails WHERE sales_person_id = $1 AND LOWER(TRIM(email_address)) = LOWER(TRIM($2)) LIMIT 1',
        [salesPersonId, cleanEmail]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Email "${cleanEmail}" already exists for this salesperson. Duplicate records are not allowed.`,
        });
      }

      const todayStr = created_date || formatServerDate();

      const insertSql = `
        INSERT INTO master_salesperson_emails (
          email_id, sales_person_id, email_address, smtp_password,
          email_daily_limit, is_active, created_by, created_date
        ) VALUES (
          COALESCE((SELECT MAX(email_id) FROM master_salesperson_emails), 0) + 1,
          $1, $2, $3, $4, $5, 'APEX_PUBLIC_USER', $6
        )
        RETURNING *
      `;

      const result = await db.query(insertSql, [
        salesPersonId,
        email_address.trim(),
        smtp_password ? smtp_password.trim() : '',
        parseInt(email_daily_limit, 10) || 10,
        is_active === 'N' ? 'N' : 'Y',
        todayStr,
      ]);

      await refreshSalespersonEmailsText(salesPersonId);

      return res.json({
        success: true,
        message: 'Email created successfully.',
        data: result.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * PUT /api/masters/sales-person-emails/:emailId
 */
router.put('/sales-person-emails/:emailId', async (req, res, next) => {
  try {
    const { emailId } = req.params;
    const {
      email_address,
      smtp_password = '',
      email_daily_limit = 10,
      is_active = 'Y',
    } = req.body;

    if (!email_address || !email_address.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const emailNum = parseInt(emailId, 10);
      const cur = await db.query(`SELECT * FROM master_salesperson_emails WHERE email_id = $1`, [emailNum]);
      if (cur.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Email record not found.' });
      }

      const cleanEmail = email_address.trim();
      const dup = await db.query(
        'SELECT email_id FROM master_salesperson_emails WHERE sales_person_id = $1 AND LOWER(TRIM(email_address)) = LOWER(TRIM($2)) AND email_id != $3 LIMIT 1',
        [cur.rows[0].sales_person_id, cleanEmail, emailNum]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Email "${cleanEmail}" already exists for this salesperson. Duplicate records are not allowed.`,
        });
      }

      const updateSql = `
        UPDATE master_salesperson_emails
        SET 
          email_address = $1,
          smtp_password = $2,
          email_daily_limit = $3,
          is_active = $4
        WHERE email_id = $5
        RETURNING *
      `;

      const result = await db.query(updateSql, [
        email_address.trim(),
        smtp_password !== undefined ? smtp_password.trim() : cur.rows[0].smtp_password,
        parseInt(email_daily_limit, 10) || 10,
        is_active === 'N' ? 'N' : 'Y',
        emailNum,
      ]);

      const salesPersonId = cur.rows[0].sales_person_id;
      if (salesPersonId) {
        await refreshSalespersonEmailsText(salesPersonId);
      }

      return res.json({
        success: true,
        message: 'Email updated successfully.',
        data: result.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * DELETE /api/masters/sales-person-emails/:emailId
 */
router.delete('/sales-person-emails/:emailId', async (req, res, next) => {
  try {
    const { emailId } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const emailNum = parseInt(emailId, 10);
      const cur = await db.query(`SELECT sales_person_id FROM master_salesperson_emails WHERE email_id = $1`, [emailNum]);
      const salesPersonId = cur.rows[0]?.sales_person_id;

      await db.query(`DELETE FROM master_salesperson_emails WHERE email_id = $1`, [emailNum]);

      if (salesPersonId) {
        await refreshSalespersonEmailsText(salesPersonId);
      }

      return res.json({ success: true, message: 'Email deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database not available.' });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/masters/company-categories
 * Returns authentic master company categories from master_company_categories.
 */
router.get('/company-categories', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const result = await db.query(
        `SELECT id, company_categories as category, company_categories, master_count FROM master_company_categories ORDER BY id ASC`
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, data: result.rows });
      }
    }
    return res.json({
      success: true,
      data: [
        { id: 1, category: 'Partner Company', company_categories: 'Partner Company' },
        { id: 2, category: 'Client Company', company_categories: 'Client Company' },
        { id: 3, category: 'Supplier Company', company_categories: 'Supplier Company' },
      ],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/technologies
 * Returns authentic master technologies from master_technologies (with fallback to companies).
 */
router.get('/technologies', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const result = await db.query(
        `SELECT DISTINCT technology FROM master_technologies WHERE technology IS NOT NULL AND TRIM(technology) != '' ORDER BY technology ASC`
      );
      if (result.rows.length > 0) {
        return res.json({ success: true, data: result.rows.map((r) => r.technology) });
      }
      const fallback = await db.query(
        `SELECT DISTINCT technology FROM companies WHERE technology IS NOT NULL AND TRIM(technology) != '' ORDER BY technology ASC`
      );
      return res.json({ success: true, data: fallback.rows.map((r) => r.technology) });
    }
    return res.json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
});


// ============================================================================
// SOURCE MASTER ROUTES
// ============================================================================

/**
 * GET /api/masters/source
 * Returns Master Source report rows joined with dynamic counts from contacts.
 */
router.get('/source', async (req, res, next) => {
  try {
    const {
      search = '',
      source = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'master_source_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_source, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.contact_source, '')) LIKE $${idx}
        )`);
      }

      if (source && source.trim() !== '') {
        queryParams.push(`%${source.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_source, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.contact_source, '')) LIKE $${idx}
        )`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`comb.validation_status = 'DATA IN BOTH'`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`comb.validation_status = 'DATA IN MASTER'`);
        } else if (valUpper === 'DATA IN CONTACT') {
          whereConditions.push(`comb.validation_status = 'DATA IN CONTACT'`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(source), ''), '') as contact_source,
            COUNT(*)::int as dynamic_count
          FROM contacts
          WHERE source IS NOT NULL AND TRIM(source) != ''
          GROUP BY COALESCE(NULLIF(TRIM(source), ''), '')
        ),
        combined AS (
          SELECT 
            m.id,
            m.source as master_source,
            COALESCE(c.dynamic_count, m.contact_count, 0) as master_source_count,
            COALESCE(c.contact_source, m.source) as contact_source,
            COALESCE(c.dynamic_count, 0) as contact_source_count,
            CASE 
              WHEN m.source IS NOT NULL AND c.contact_source IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.source IS NOT NULL AND (c.contact_source IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN CONTACT'
            END as validation_status,
            m.created_by,
            COALESCE(m.created_date, '20-JUL-2026') as created_date,
            m.modified_by,
            COALESCE(m.modified_date, '12-NOV-2026') as modified_date
          FROM master_sources m
          FULL OUTER JOIN contact_counts c ON LOWER(TRIM(m.source)) = LOWER(TRIM(c.contact_source))
        )
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN validation_status = 'DATA IN BOTH' THEN 1 END)::int as total_both,
          COUNT(CASE WHEN validation_status = 'DATA IN MASTER' THEN 1 END)::int as total_master,
          COUNT(CASE WHEN validation_status = 'DATA IN CONTACT' THEN 1 END)::int as total_contact
        FROM combined comb
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const totalFiltered = countRes.rows[0]?.total || 0;
      const totalBoth = countRes.rows[0]?.total_both || 0;
      const totalMasterOnly = countRes.rows[0]?.total_master || 0;
      const totalContactOnly = countRes.rows[0]?.total_contact || 0;

      let orderColumn = 'comb.master_source_count';
      if (sortBy === 'master_source') orderColumn = 'comb.master_source';
      else if (sortBy === 'contact_source') orderColumn = 'comb.contact_source';
      else if (sortBy === 'contact_source_count') orderColumn = 'comb.contact_source_count';
      else if (sortBy === 'validation_status') orderColumn = 'comb.validation_status';
      else if (sortBy === 'created_date') orderColumn = 'comb.created_date';
      else if (sortBy === 'modified_date') orderColumn = 'comb.modified_date';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        WITH contact_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(source), ''), '') as contact_source,
            COUNT(*)::int as dynamic_count
          FROM contacts
          WHERE source IS NOT NULL AND TRIM(source) != ''
          GROUP BY COALESCE(NULLIF(TRIM(source), ''), '')
        ),
        combined AS (
          SELECT 
            COALESCE(m.id, (9900000 + ROW_NUMBER() OVER (ORDER BY c.contact_source))::int) as id,
            m.source as master_source,
            COALESCE(c.dynamic_count, m.contact_count, 0) as master_source_count,
            COALESCE(c.contact_source, m.source) as contact_source,
            COALESCE(c.dynamic_count, 0) as contact_source_count,
            CASE 
              WHEN m.source IS NOT NULL AND c.contact_source IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.source IS NOT NULL AND (c.contact_source IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN CONTACT'
            END as validation_status,
            COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
            COALESCE(m.created_date, '20-JUL-2026') as created_date,
            COALESCE(m.modified_by, 'ZEBA_KHAN') as modified_by,
            COALESCE(m.modified_date, '12-NOV-2026') as modified_date
          FROM master_sources m
          FULL OUTER JOIN contact_counts c ON LOWER(TRIM(m.source)) = LOWER(TRIM(c.contact_source))
        )
        SELECT *
        FROM combined comb
        ${whereClause}
        ORDER BY ${orderColumn} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total: totalFiltered,
        page: parsedPage,
        limit: parsedLimit,
        reconciliation: {
          total: totalFiltered,
          totalBoth,
          totalMasterOnly,
          totalContactOnly,
        },
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/source/options
 * Returns distinct sources for dropdown choices.
 */
router.get('/source/options', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const q = `
        SELECT DISTINCT s FROM (
          SELECT source as s FROM master_sources WHERE source IS NOT NULL AND TRIM(source) != ''
          UNION
          SELECT source as s FROM contacts WHERE source IS NOT NULL AND TRIM(source) != ''
        ) sub
        ORDER BY s ASC
      `;
      const result = await db.query(q);
      return res.json({ success: true, data: result.rows.map(r => r.s) });
    }
    return res.json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/source/:id
 * Returns single master source with contact counts.
 */
router.get('/source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      let masterRow = null;
      if (!isNaN(numId) && numId < 9900000) {
        const mRes = await db.query('SELECT * FROM master_sources WHERE id = $1', [numId]);
        if (mRes.rows.length > 0) masterRow = mRes.rows[0];
      }

      const targetSource = masterRow ? masterRow.source : id;

      const cCountRes = await db.query(
        `SELECT COUNT(*)::int as count FROM contacts WHERE LOWER(TRIM(COALESCE(source, ''))) = LOWER(TRIM($1))`,
        [targetSource]
      );
      const contactCount = cCountRes.rows[0]?.count || 0;

      const validation_status = masterRow && contactCount > 0
        ? 'DATA IN BOTH'
        : masterRow
        ? 'DATA IN MASTER'
        : 'DATA IN CONTACT';

      return res.json({
        success: true,
        data: {
          id: masterRow ? masterRow.id : id,
          master_source: masterRow ? masterRow.source : targetSource,
          total_contact_count: contactCount || (masterRow ? masterRow.contact_count : 0) || 0,
          contact_source: targetSource,
          contact_source_count: contactCount,
          validation_status,
          created_by: masterRow?.created_by || 'APEX_PUBLIC_USER',
          created_date: masterRow?.created_date || '7/20/2026',
          modified_by: masterRow?.modified_by || 'ZEBA_KHAN',
          modified_date: masterRow?.modified_date || '11/12/2026',
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/source/:id/contacts
 * Returns contacts linked to this source.
 */
router.get('/source/:id/contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      source = '',
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let targetSource = source;
      const numId = parseInt(id, 10);
      if (!targetSource && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT source FROM master_sources WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetSource = m.rows[0].source;
      }
      if (!targetSource) targetSource = id;

      let queryParams = [targetSource.trim()];
      let whereConditions = [`LOWER(TRIM(COALESCE(c.source, ''))) = LOWER(TRIM($1))`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.contact_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, c.company_name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.designation, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_email, c.email, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.country, '')) LIKE $${sIdx} OR
          c.id::text LIKE $${sIdx}
        )`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const countSql = `SELECT COUNT(*)::int as total FROM contacts c ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderCol = 'c.id';
      if (sortBy === 'contact_name') orderCol = 'c.contact_name';
      else if (sortBy === 'comp_name') orderCol = 'c.comp_name';
      else if (sortBy === 'designation') orderCol = 'c.designation';
      else if (sortBy === 'country') orderCol = 'c.country';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        SELECT 
          c.id,
          COALESCE(c.contact_name, '') as contact_name,
          COALESCE(c.comp_name, c.company_name, '') as comp_name,
          COALESCE(c.designation, '') as designation,
          COALESCE(c.pos_type, c.position_type, '') as pos_type,
          COALESCE(c.country, '') as country,
          COALESCE(c.comp_email, c.email, '') as comp_email,
          COALESCE(c.mobile, c.phone, '') as contact_mobile,
          COALESCE(c.linkedin_url, '') as linkedin_url,
          c.source
        FROM contacts c
        ${whereClause}
        ORDER BY ${orderCol} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/source
 * Create new master source.
 */
router.post('/source', async (req, res, next) => {
  try {
    const { master_source, source } = req.body;
    const val = (master_source || source || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_sources WHERE LOWER(TRIM(source)) = LOWER(TRIM($1))',
        [val]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Source "${val}" already exists.` });
      }

      const insertSql = `
        INSERT INTO master_sources (source, master_count, contact_count, created_by, created_date, modified_by, modified_date)
        VALUES ($1, 0, 0, $2, $3, $2, $3)
        RETURNING *
      `;
      const createdDate = formatServerDate();
      const insertRes = await db.query(insertSql, [val, 'ADMIN', createdDate]);
      return res.status(201).json({
        success: true,
        message: `Source "${val}" created successfully.`,
        data: insertRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/masters/source/:id
 * Update master source.
 */
router.put('/source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_source, source } = req.body;
    const val = (master_source || source || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      const modifiedDate = formatServerDate();

      const dup = await db.query(
        'SELECT id FROM master_sources WHERE LOWER(TRIM(source)) = LOWER(TRIM($1)) AND id != $2',
        [val, numId]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Source "${val}" already exists.` });
      }

      const updateSql = `
        UPDATE master_sources
        SET source = $1, modified_by = $2, modified_date = $3
        WHERE id = $4
        RETURNING *
      `;
      const updateRes = await db.query(updateSql, [val, 'ADMIN', modifiedDate, numId]);
      return res.json({
        success: true,
        message: `Source updated successfully to "${val}".`,
        data: updateRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/source/:id/update-records
 * Updates all linked contact records with the new source value.
 */
router.post('/source/:id/update-records', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { old_source, new_source } = req.body;
    const oldVal = (old_source || '').trim();
    const newVal = (new_source || '').trim();

    if (!newVal) {
      return res.status(400).json({ success: false, message: 'New source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      let targetOld = oldVal;
      const numId = parseInt(id, 10);
      if (!targetOld && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT source FROM master_sources WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetOld = m.rows[0].source;
      }
      if (!targetOld) targetOld = id;

      const updateSql = `
        UPDATE contacts
        SET source = $1
        WHERE LOWER(TRIM(COALESCE(source, ''))) = LOWER(TRIM($2))
      `;
      const result = await db.query(updateSql, [newVal, targetOld]);
      return res.json({
        success: true,
        message: `Updated ${result.rowCount} contact record(s) to "${newVal}".`,
        updatedCount: result.rowCount,
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/source/:id
 */
router.delete('/source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      await db.query('DELETE FROM master_sources WHERE id = $1', [numId]);
      return res.json({ success: true, message: 'Source deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/source/batch-delete
 */
router.post('/source/batch-delete', async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided.' });
    }
    if (db.isAvailable && db.isAvailable()) {
      const validIds = ids.map(Number).filter(n => !isNaN(n) && n < 9900000);
      if (validIds.length > 0) {
        await db.query(`DELETE FROM master_sources WHERE id = ANY($1::int[])`, [validIds]);
      }
      return res.json({ success: true, message: `Deleted ${validIds.length} source record(s).` });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});


// ============================================================================
// TECHNOLOGY MASTER ROUTES
// ============================================================================

/**
 * GET /api/masters/technology/filter-options
 * Returns distinct technologies and categories for top filter bar.
 */
router.get('/technology/filter-options', async (req, res, next) => {
  try {
    if (db.isAvailable && db.isAvailable()) {
      const [techRes, catRes] = await Promise.all([
        db.query(`SELECT DISTINCT technology FROM master_technologies WHERE technology IS NOT NULL AND TRIM(technology) != '' ORDER BY technology ASC`),
        db.query(`SELECT DISTINCT technology_category FROM master_technologies WHERE technology_category IS NOT NULL AND TRIM(technology_category) != '' ORDER BY technology_category ASC`),
      ]);
      return res.json({
        success: true,
        data: {
          technologies: techRes.rows.map(r => r.technology),
          categories: catRes.rows.map(r => r.technology_category),
        },
      });
    }
    return res.json({ success: true, data: { technologies: [], categories: [] } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/technology
 * Returns Technology Master report rows joined with dynamic counts from companies.
 */
router.get('/technology', async (req, res, next) => {
  try {
    const {
      search = '',
      technology = '',
      technology_category = '',
      created_date = '',
      modified_date = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'company_technology_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_technology, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.master_technology_category, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.company_technology, '')) LIKE $${idx}
        )`);
      }

      if (technology && technology.trim() !== '') {
        queryParams.push(`%${technology.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_technology, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.company_technology, '')) LIKE $${idx}
        )`);
      }

      if (technology_category && technology_category.trim() !== '') {
        queryParams.push(`%${technology_category.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`LOWER(COALESCE(comb.master_technology_category, '')) LIKE $${idx}`);
      }

      if (created_date && created_date.trim() !== '') {
        queryParams.push(`%${created_date.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`LOWER(COALESCE(comb.created_date, '')) LIKE $${idx}`);
      }

      if (modified_date && modified_date.trim() !== '') {
        queryParams.push(`%${modified_date.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`LOWER(COALESCE(comb.modified_date, '')) LIKE $${idx}`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`comb.validation_status = 'DATA IN BOTH'`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`comb.validation_status = 'DATA IN MASTER'`);
        } else if (valUpper === 'DATA IN COMPANY') {
          whereConditions.push(`comb.validation_status = 'DATA IN COMPANY'`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(technology), ''), '') as company_technology,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE technology IS NOT NULL AND TRIM(technology) != ''
          GROUP BY COALESCE(NULLIF(TRIM(technology), ''), '')
        ),
        combined AS (
          SELECT 
            m.id,
            m.technology as master_technology,
            COALESCE(m.technology_category, '') as master_technology_category,
            COALESCE(m.master_count, 0) as master_technology_count,
            COALESCE(c.company_technology, m.technology) as company_technology,
            COALESCE(c.dynamic_count, 0) as company_technology_count,
            CASE 
              WHEN m.technology IS NOT NULL AND c.company_technology IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.technology IS NOT NULL AND (c.company_technology IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN COMPANY'
            END as validation_status,
            m.created_date,
            m.modified_date
          FROM master_technologies m
          FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.technology)) = LOWER(TRIM(c.company_technology))
        )
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN validation_status = 'DATA IN BOTH' THEN 1 END)::int as total_both,
          COUNT(CASE WHEN validation_status = 'DATA IN MASTER' THEN 1 END)::int as total_master,
          COUNT(CASE WHEN validation_status = 'DATA IN COMPANY' THEN 1 END)::int as total_company
        FROM combined comb
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const totalFiltered = countRes.rows[0]?.total || 0;
      const totalBoth = countRes.rows[0]?.total_both || 0;
      const totalMasterOnly = countRes.rows[0]?.total_master || 0;
      const totalCompanyOnly = countRes.rows[0]?.total_company || 0;

      let orderColumn = 'comb.company_technology_count';
      if (sortBy === 'master_technology') orderColumn = 'comb.master_technology';
      else if (sortBy === 'master_technology_category') orderColumn = 'comb.master_technology_category';
      else if (sortBy === 'master_technology_count') orderColumn = 'comb.master_technology_count';
      else if (sortBy === 'company_technology') orderColumn = 'comb.company_technology';
      else if (sortBy === 'validation_status') orderColumn = 'comb.validation_status';
      else if (sortBy === 'created_date') orderColumn = 'comb.created_date';
      else if (sortBy === 'modified_date') orderColumn = 'comb.modified_date';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(technology), ''), '') as company_technology,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE technology IS NOT NULL AND TRIM(technology) != ''
          GROUP BY COALESCE(NULLIF(TRIM(technology), ''), '')
        ),
        combined AS (
          SELECT 
            COALESCE(m.id, (9900000 + ROW_NUMBER() OVER (ORDER BY c.company_technology))::int) as id,
            m.technology as master_technology,
            COALESCE(m.technology_category, '') as master_technology_category,
            COALESCE(m.master_count, 0) as master_technology_count,
            COALESCE(c.company_technology, m.technology) as company_technology,
            COALESCE(c.dynamic_count, 0) as company_technology_count,
            CASE 
              WHEN m.technology IS NOT NULL AND c.company_technology IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.technology IS NOT NULL AND (c.company_technology IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN COMPANY'
            END as validation_status,
            COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
            COALESCE(m.created_date, '20-JUL-2026') as created_date,
            COALESCE(m.modified_by, 'AMAAN') as modified_by,
            COALESCE(m.modified_date, '12-NOV-2026') as modified_date
          FROM master_technologies m
          FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.technology)) = LOWER(TRIM(c.company_technology))
        )
        SELECT *
        FROM combined comb
        ${whereClause}
        ORDER BY ${orderColumn} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total: totalFiltered,
        page: parsedPage,
        limit: parsedLimit,
        reconciliation: {
          total: totalFiltered,
          totalBoth,
          totalMasterOnly,
          totalCompanyOnly,
        },
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/technology/:id
 * Returns single master technology with dynamic counts.
 */
router.get('/technology/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      let masterRow = null;
      if (!isNaN(numId) && numId < 9900000) {
        const mRes = await db.query('SELECT * FROM master_technologies WHERE id = $1', [numId]);
        if (mRes.rows.length > 0) masterRow = mRes.rows[0];
      }

      const targetTech = masterRow ? masterRow.technology : id;

      const cCountRes = await db.query(
        `SELECT COUNT(*)::int as count FROM companies WHERE LOWER(TRIM(COALESCE(technology, ''))) = LOWER(TRIM($1))`,
        [targetTech]
      );
      const companyCount = cCountRes.rows[0]?.count || 0;

      const validation_status = masterRow && companyCount > 0
        ? 'DATA IN BOTH'
        : masterRow
        ? 'DATA IN MASTER'
        : 'DATA IN COMPANY';

      return res.json({
        success: true,
        data: {
          id: masterRow ? masterRow.id : id,
          master_technology: masterRow ? masterRow.technology : targetTech,
          technology_category: masterRow?.technology_category || 'CRM',
          total_count: companyCount || (masterRow ? masterRow.master_count : 0) || 0,
          contact_technology: targetTech,
          contact_technology_count: companyCount,
          company_technology: targetTech,
          company_technology_count: companyCount,
          validation_status,
          created_by: masterRow?.created_by || 'APEX_PUBLIC_USER',
          created_date: masterRow?.created_date || '7/20/2026',
          modified_by: masterRow?.modified_by || 'AMAAN',
          modified_date: masterRow?.modified_date || '11/10/2026',
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/technology/:id/companies
 * Returns companies linked to this technology.
 */
router.get('/technology/:id/companies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      technology = '',
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let targetTech = technology;
      const numId = parseInt(id, 10);
      if (!targetTech && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT technology FROM master_technologies WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetTech = m.rows[0].technology;
      }
      if (!targetTech) targetTech = id;

      let queryParams = [targetTech.trim()];
      let whereConditions = [`LOWER(TRIM(COALESCE(c.technology, ''))) = LOWER(TRIM($1))`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.comp_name, c.name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.industry, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.city, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.country, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.website, '')) LIKE $${sIdx} OR
          c.id::text LIKE $${sIdx}
        )`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const countSql = `SELECT COUNT(*)::int as total FROM companies c ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderCol = 'c.id';
      if (sortBy === 'name' || sortBy === 'company_name') orderCol = 'c.comp_name';
      else if (sortBy === 'employee_size') orderCol = 'c.employee_size';
      else if (sortBy === 'company_type') orderCol = 'c.company_type';
      else if (sortBy === 'country') orderCol = 'c.country';
      else if (sortBy === 'city') orderCol = 'c.city';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        SELECT 
          c.id,
          COALESCE((SELECT COUNT(*)::int FROM contacts ct WHERE ct.company_id = c.id OR ct.comp_id = c.id), 0) AS contact_count,
          COALESCE(c.comp_name, c.name, '') as company_name,
          COALESCE(c.employee_size, '') as employee_size,
          COALESCE(c.company_type, '') as company_type,
          COALESCE(c.country, '') as country,
          COALESCE(c.city, '') as city,
          COALESCE(c.technology, '') as technology,
          COALESCE(c.industry, '') as industry,
          COALESCE(c.com_email, c.email, '') as email,
          COALESCE(c.website, '') as website
        FROM companies c
        ${whereClause}
        ORDER BY ${orderCol} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/technology
 * Create new master technology.
 */
router.post('/technology', async (req, res, next) => {
  try {
    const { master_technology, technology, technology_category } = req.body;
    const val = (master_technology || technology || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Technology name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_technologies WHERE LOWER(TRIM(technology)) = LOWER(TRIM($1))',
        [val]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Technology "${val}" already exists.` });
      }

      const insertSql = `
        INSERT INTO master_technologies (technology, technology_category, master_count, created_by, created_date, modified_by, modified_date)
        VALUES ($1, $2, 0, $3, $4, $3, $4)
        RETURNING *
      `;
      const createdDate = formatServerDate();
      const insertRes = await db.query(insertSql, [val, (technology_category || 'General').trim(), 'ADMIN', createdDate]);
      return res.status(201).json({
        success: true,
        message: `Technology "${val}" created successfully.`,
        data: insertRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/masters/technology/:id
 * Update master technology.
 */
router.put('/technology/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_technology, technology, technology_category } = req.body;
    const val = (master_technology || technology || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Technology name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      const modifiedDate = formatServerDate();

      const dup = await db.query(
        'SELECT id FROM master_technologies WHERE LOWER(TRIM(technology)) = LOWER(TRIM($1)) AND id != $2',
        [val, numId]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Technology "${val}" already exists.` });
      }

      const updateSql = `
        UPDATE master_technologies
        SET technology = $1, technology_category = COALESCE($2, technology_category), modified_by = $3, modified_date = $4
        WHERE id = $5
        RETURNING *
      `;
      const updateRes = await db.query(updateSql, [val, (technology_category || '').trim() || null, 'ADMIN', modifiedDate, numId]);
      return res.json({
        success: true,
        message: `Technology updated successfully to "${val}".`,
        data: updateRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/technology/:id/update-records
 * Updates all linked company records with the new technology value.
 */
router.post('/technology/:id/update-records', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { old_technology, new_technology } = req.body;
    const oldVal = (old_technology || '').trim();
    const newVal = (new_technology || '').trim();

    if (!newVal) {
      return res.status(400).json({ success: false, message: 'New technology name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      let targetOld = oldVal;
      const numId = parseInt(id, 10);
      if (!targetOld && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT technology FROM master_technologies WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetOld = m.rows[0].technology;
      }
      if (!targetOld) targetOld = id;

      const updateSql = `
        UPDATE companies
        SET technology = $1
        WHERE LOWER(TRIM(COALESCE(technology, ''))) = LOWER(TRIM($2))
      `;
      const result = await db.query(updateSql, [newVal, targetOld]);
      return res.json({
        success: true,
        message: `Updated ${result.rowCount} company record(s) to "${newVal}".`,
        updatedCount: result.rowCount,
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/technology/:id
 */
router.delete('/technology/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      await db.query('DELETE FROM master_technologies WHERE id = $1', [numId]);
      return res.json({ success: true, message: 'Technology deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/technology/batch-delete
 */
router.post('/technology/batch-delete', async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided.' });
    }
    if (db.isAvailable && db.isAvailable()) {
      const validIds = ids.map(Number).filter(n => !isNaN(n) && n < 9900000);
      if (validIds.length > 0) {
        await db.query(`DELETE FROM master_technologies WHERE id = ANY($1::int[])`, [validIds]);
      }
      return res.json({ success: true, message: `Deleted ${validIds.length} technology record(s).` });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});


// ============================================================================
// LEAD SOURCE MASTER ROUTES
// ============================================================================

/**
 * GET /api/masters/lead-source
 * Returns Lead Source Master report rows joined with dynamic counts from companies.
 */
router.get('/lead-source', async (req, res, next) => {
  try {
    const {
      search = '',
      source = '',
      validationStatus = '',
      page = 1,
      limit = 50,
      sortBy = 'master_source_count',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let queryParams = [];
      let whereConditions = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_source, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.lead_source, '')) LIKE $${idx}
        )`);
      }

      if (source && source.trim() !== '') {
        queryParams.push(`%${source.trim().toLowerCase()}%`);
        const idx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(comb.master_source, '')) LIKE $${idx} OR
          LOWER(COALESCE(comb.lead_source, '')) LIKE $${idx}
        )`);
      }

      if (validationStatus && validationStatus.trim() !== '') {
        const valUpper = validationStatus.trim().toUpperCase();
        if (valUpper === 'DATA IN BOTH') {
          whereConditions.push(`comb.validation_status = 'DATA IN BOTH'`);
        } else if (valUpper === 'DATA IN MASTER') {
          whereConditions.push(`comb.validation_status = 'DATA IN MASTER'`);
        } else if (valUpper === 'DATA IN COMPANY') {
          whereConditions.push(`comb.validation_status = 'DATA IN COMPANY'`);
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const countSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(source), ''), '') as company_source,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE source IS NOT NULL AND TRIM(source) != ''
          GROUP BY COALESCE(NULLIF(TRIM(source), ''), '')
        ),
        combined AS (
          SELECT 
            m.id,
            m.source as master_source,
            COALESCE(c.dynamic_count, m.master_count, 0) as master_source_count,
            COALESCE(c.company_source, m.source) as lead_source,
            COALESCE(c.dynamic_count, 0) as lead_source_count,
            CASE 
              WHEN m.source IS NOT NULL AND c.company_source IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.source IS NOT NULL AND (c.company_source IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN COMPANY'
            END as validation_status,
            m.created_date,
            m.modified_date
          FROM master_sources m
          FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.source)) = LOWER(TRIM(c.company_source))
        )
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN validation_status = 'DATA IN BOTH' THEN 1 END)::int as total_both,
          COUNT(CASE WHEN validation_status = 'DATA IN MASTER' THEN 1 END)::int as total_master,
          COUNT(CASE WHEN validation_status = 'DATA IN COMPANY' THEN 1 END)::int as total_company
        FROM combined comb
        ${whereClause}
      `;

      const countRes = await db.query(countSql, queryParams);
      const totalFiltered = countRes.rows[0]?.total || 0;
      const totalBoth = countRes.rows[0]?.total_both || 0;
      const totalMasterOnly = countRes.rows[0]?.total_master || 0;
      const totalCompanyOnly = countRes.rows[0]?.total_company || 0;

      let orderColumn = 'comb.master_source_count';
      if (sortBy === 'master_source') orderColumn = 'comb.master_source';
      else if (sortBy === 'lead_source') orderColumn = 'comb.lead_source';
      else if (sortBy === 'lead_source_count') orderColumn = 'comb.lead_source_count';
      else if (sortBy === 'validation_status') orderColumn = 'comb.validation_status';
      else if (sortBy === 'created_date') orderColumn = 'comb.created_date';
      else if (sortBy === 'modified_date') orderColumn = 'comb.modified_date';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        WITH comp_counts AS (
          SELECT 
            COALESCE(NULLIF(TRIM(source), ''), '') as company_source,
            COUNT(*)::int as dynamic_count
          FROM companies
          WHERE source IS NOT NULL AND TRIM(source) != ''
          GROUP BY COALESCE(NULLIF(TRIM(source), ''), '')
        ),
        combined AS (
          SELECT 
            COALESCE(m.id, (9900000 + ROW_NUMBER() OVER (ORDER BY c.company_source))::int) as id,
            m.source as master_source,
            COALESCE(c.dynamic_count, m.master_count, 0) as master_source_count,
            COALESCE(c.company_source, m.source) as lead_source,
            COALESCE(c.dynamic_count, 0) as lead_source_count,
            CASE 
              WHEN m.source IS NOT NULL AND c.company_source IS NOT NULL AND c.dynamic_count > 0 THEN 'DATA IN BOTH'
              WHEN m.source IS NOT NULL AND (c.company_source IS NULL OR c.dynamic_count = 0) THEN 'DATA IN MASTER'
              ELSE 'DATA IN COMPANY'
            END as validation_status,
            COALESCE(m.created_by, 'APEX_PUBLIC_USER') as created_by,
            COALESCE(m.created_date, '20-JUL-2026') as created_date,
            COALESCE(m.modified_by, 'ZUBAIR') as modified_by,
            COALESCE(m.modified_date, '12-NOV-2026') as modified_date
          FROM master_sources m
          FULL OUTER JOIN comp_counts c ON LOWER(TRIM(m.source)) = LOWER(TRIM(c.company_source))
        )
        SELECT *
        FROM combined comb
        ${whereClause}
        ORDER BY ${orderColumn} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total: totalFiltered,
        page: parsedPage,
        limit: parsedLimit,
        reconciliation: {
          total: totalFiltered,
          totalBoth,
          totalMasterOnly,
          totalCompanyOnly,
        },
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/lead-source/:id
 * Returns single lead source with company counts.
 */
router.get('/lead-source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      let masterRow = null;
      if (!isNaN(numId) && numId < 9900000) {
        const mRes = await db.query('SELECT * FROM master_sources WHERE id = $1', [numId]);
        if (mRes.rows.length > 0) masterRow = mRes.rows[0];
      }

      const targetSource = masterRow ? masterRow.source : id;

      const cCountRes = await db.query(
        `SELECT COUNT(*)::int as count FROM companies WHERE LOWER(TRIM(COALESCE(source, ''))) = LOWER(TRIM($1))`,
        [targetSource]
      );
      const companyCount = cCountRes.rows[0]?.count || 0;

      const validation_status = masterRow && companyCount > 0
        ? 'DATA IN BOTH'
        : masterRow
        ? 'DATA IN MASTER'
        : 'DATA IN COMPANY';

      return res.json({
        success: true,
        data: {
          id: masterRow ? masterRow.id : id,
          master_source: masterRow ? masterRow.source : targetSource,
          master_source_count: companyCount || (masterRow ? masterRow.master_count : 0) || 0,
          lead_source: targetSource,
          lead_source_count: companyCount,
          validation_status,
          created_by: masterRow?.created_by || 'APEX_PUBLIC_USER',
          created_date: masterRow?.created_date || '8/28/2026',
          modified_by: masterRow?.modified_by || 'ZUBAIR',
          modified_date: masterRow?.modified_date || '10/31/2026',
        },
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/lead-source/:id/companies
 * Returns companies linked to this lead source matching Screenshot 6.
 */
router.get('/lead-source/:id/companies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      source = '',
      search = '',
      page = 1,
      limit = 50,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' || limit === 'All' ? 10000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 10000));
    const offset = (parsedPage - 1) * parsedLimit;

    if (db.isAvailable && db.isAvailable()) {
      let targetSource = source;
      const numId = parseInt(id, 10);
      if (!targetSource && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT source FROM master_sources WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetSource = m.rows[0].source;
      }
      if (!targetSource) targetSource = id;

      let queryParams = [targetSource.trim()];
      let whereConditions = [`LOWER(TRIM(COALESCE(c.source, ''))) = LOWER(TRIM($1))`];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        const sIdx = queryParams.length;
        whereConditions.push(`(
          LOWER(COALESCE(c.country, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.industry, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.comp_name, c.name, '')) LIKE $${sIdx} OR
          LOWER(COALESCE(c.created_by, '')) LIKE $${sIdx} OR
          c.id::text LIKE $${sIdx}
        )`);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const countSql = `SELECT COUNT(*)::int as total FROM companies c ${whereClause}`;
      const countRes = await db.query(countSql, queryParams);
      const total = countRes.rows[0]?.total || 0;

      let orderCol = 'c.id';
      if (sortBy === 'country') orderCol = 'c.country';
      else if (sortBy === 'source') orderCol = 'c.source';
      else if (sortBy === 'created_by') orderCol = 'c.created_by';
      else if (sortBy === 'created_date') orderCol = 'c.created_date';
      else if (sortBy === 'industry') orderCol = 'c.industry';

      const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const dataSql = `
        SELECT 
          c.id,
          COALESCE(c.country, '') as country,
          COALESCE(c.source, '') as source,
          COALESCE(c.created_by, 'APEX_PUBLIC_USER') as created_by,
          COALESCE(c.created_date, '') as created_date,
          COALESCE(c.industry, '') as industry,
          COALESCE(c.comp_name, c.name, '') as company_name,
          COALESCE(c.com_email, c.email, '') as email,
          COALESCE(c.website, '') as website
        FROM companies c
        ${whereClause}
        ORDER BY ${orderCol} ${sortDir} NULLS LAST
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      const dataRes = await db.query(dataSql, [...queryParams, parsedLimit, offset]);

      return res.json({
        success: true,
        data: dataRes.rows,
        total,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    return res.json({ success: true, data: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/lead-source
 */
router.post('/lead-source', async (req, res, next) => {
  try {
    const { master_source, source } = req.body;
    const val = (master_source || source || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const dup = await db.query(
        'SELECT id FROM master_sources WHERE LOWER(TRIM(source)) = LOWER(TRIM($1))',
        [val]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Source "${val}" already exists.` });
      }

      const insertSql = `
        INSERT INTO master_sources (source, master_count, contact_count, created_by, created_date, modified_by, modified_date)
        VALUES ($1, 0, 0, $2, $3, $2, $3)
        RETURNING *
      `;
      const createdDate = formatServerDate();
      const insertRes = await db.query(insertSql, [val, 'ADMIN', createdDate]);
      return res.status(201).json({
        success: true,
        message: `Lead Source "${val}" created successfully.`,
        data: insertRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/masters/lead-source/:id
 */
router.put('/lead-source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { master_source, source } = req.body;
    const val = (master_source || source || '').trim();
    if (!val) {
      return res.status(400).json({ success: false, message: 'Source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      const modifiedDate = formatServerDate();

      const dup = await db.query(
        'SELECT id FROM master_sources WHERE LOWER(TRIM(source)) = LOWER(TRIM($1)) AND id != $2',
        [val, numId]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Source "${val}" already exists.` });
      }

      const updateSql = `
        UPDATE master_sources
        SET source = $1, modified_by = $2, modified_date = $3
        WHERE id = $4
        RETURNING *
      `;
      const updateRes = await db.query(updateSql, [val, 'ADMIN', modifiedDate, numId]);
      return res.json({
        success: true,
        message: `Lead Source updated successfully to "${val}".`,
        data: updateRes.rows[0],
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/lead-source/:id/update-records
 */
router.post('/lead-source/:id/update-records', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { old_source, new_source } = req.body;
    const oldVal = (old_source || '').trim();
    const newVal = (new_source || '').trim();

    if (!newVal) {
      return res.status(400).json({ success: false, message: 'New source name is required.' });
    }

    if (db.isAvailable && db.isAvailable()) {
      let targetOld = oldVal;
      const numId = parseInt(id, 10);
      if (!targetOld && !isNaN(numId) && numId < 9900000) {
        const m = await db.query('SELECT source FROM master_sources WHERE id = $1', [numId]);
        if (m.rows.length > 0) targetOld = m.rows[0].source;
      }
      if (!targetOld) targetOld = id;

      const updateSql = `
        UPDATE companies
        SET source = $1
        WHERE LOWER(TRIM(COALESCE(source, ''))) = LOWER(TRIM($2))
      `;
      const result = await db.query(updateSql, [newVal, targetOld]);
      return res.json({
        success: true,
        message: `Updated ${result.rowCount} company record(s) to "${newVal}".`,
        updatedCount: result.rowCount,
      });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/masters/lead-source/:id
 */
router.delete('/lead-source/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isAvailable && db.isAvailable()) {
      const numId = parseInt(id, 10);
      await db.query('DELETE FROM master_sources WHERE id = $1', [numId]);
      return res.json({ success: true, message: 'Lead Source deleted successfully.' });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/masters/lead-source/batch-delete
 */
router.post('/lead-source/batch-delete', async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided.' });
    }
    if (db.isAvailable && db.isAvailable()) {
      const validIds = ids.map(Number).filter(n => !isNaN(n) && n < 9900000);
      if (validIds.length > 0) {
        await db.query(`DELETE FROM master_sources WHERE id = ANY($1::int[])`, [validIds]);
      }
      return res.json({ success: true, message: `Deleted ${validIds.length} lead source record(s).` });
    }
    return res.status(500).json({ success: false, message: 'Database unavailable' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/masters/generic/:masterKey
 * Retrieves records from the appropriate application database table for secondary masters.
 */
router.get('/generic/:masterKey', async (req, res, next) => {
  try {
    const { masterKey } = req.params;
    const cleanKey = masterKey.replace(/^master_/, '').replace(/-/g, '_');

    if (!db.isAvailable || !db.isAvailable()) {
      return res.json({ success: true, data: [], total: 0 });
    }

    let sql = '';
    if (cleanKey === 'account_manager') {
      sql = `
        SELECT 
          id,
          account_manager as master_val,
          (SELECT COUNT(*)::int FROM companies WHERE LOWER(TRIM(COALESCE(salesperson, ''))) = LOWER(TRIM(m.account_manager))) as master_count,
          account_manager as data_val,
          (SELECT COUNT(*)::int FROM companies WHERE LOWER(TRIM(COALESCE(salesperson, ''))) = LOWER(TRIM(m.account_manager))) as data_count,
          'DATA IN BOTH' as validation_status,
          COALESCE(created_date, '28-AUG-2026') as created_date,
          COALESCE(modified_date, '20-JUL-2026') as modified_date
        FROM master_account_managers m
        ORDER BY id ASC
      `;
    } else if (cleanKey === 'company_categories') {
      sql = `
        SELECT 
          id,
          company_categories as master_val,
          COALESCE(master_count, (SELECT COUNT(*)::int FROM companies WHERE LOWER(TRIM(COALESCE(company_categories, ''))) = LOWER(TRIM(m.company_categories)))) as master_count,
          company_categories as data_val,
          (SELECT COUNT(*)::int FROM companies WHERE LOWER(TRIM(COALESCE(company_categories, ''))) = LOWER(TRIM(m.company_categories))) as data_count,
          'DATA IN BOTH' as validation_status,
          COALESCE(created_date, '20-JUL-2026') as created_date,
          COALESCE(modified_date, '10-NOV-2026') as modified_date
        FROM master_company_categories m
        ORDER BY id ASC
      `;
    } else if (cleanKey === 'contact_status' || cleanKey === 'contact_statuses') {
      sql = `
        SELECT 
          id,
          contact_status as master_val,
          (SELECT COUNT(*)::int FROM contacts WHERE LOWER(TRIM(COALESCE(contactstatus, contact_status, ''))) = LOWER(TRIM(m.contact_status))) as master_count,
          contact_status as data_val,
          (SELECT COUNT(*)::int FROM contacts WHERE LOWER(TRIM(COALESCE(contactstatus, contact_status, ''))) = LOWER(TRIM(m.contact_status))) as data_count,
          'DATA IN BOTH' as validation_status,
          COALESCE(created_date, '20-JUL-2026') as created_date,
          COALESCE(modified_date, '10-NOV-2026') as modified_date
        FROM master_contact_statuses m
        ORDER BY id ASC
      `;
    } else if (cleanKey === 'registration_status') {
      sql = `
        WITH distinct_reg AS (
          SELECT 
            COALESCE(NULLIF(TRIM(registration_status), ''), 'Unregistered') as status_val,
            COUNT(*)::int as cnt
          FROM companies
          GROUP BY COALESCE(NULLIF(TRIM(registration_status), ''), 'Unregistered')
        )
        SELECT 
          ROW_NUMBER() OVER(ORDER BY cnt DESC) as id,
          status_val as master_val,
          cnt as master_count,
          status_val as data_val,
          cnt as data_count,
          'DATA IN BOTH' as validation_status,
          '20-JUL-2026' as created_date,
          '10-NOV-2026' as modified_date
        FROM distinct_reg
      `;
    }

    if (sql) {
      const result = await db.query(sql);
      return res.json({ success: true, data: result.rows, total: result.rows.length });
    }

    return res.json({ success: true, data: [], total: 0, note: `No application-database table found for ${masterKey}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

