const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const localStore = require('../services/localStore');
const contactUploadService = require('../services/contactUploadService');

/**
 * GET /api/contacts
 * Retrieves paginated, searchable, and filterable contacts.
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      id_from = '',
      id_to = '',
      company_id = '',
      comp_id = '',
      company_name = '',
      comp_name = '',
      contact_name = '',
      contact_status = '',
      contactstatus = '',
      salesperson = '',
      email = '',
      comp_email = '',
      website = '',
      source = '',
      position_type = '',
      pos_type = '',
      remark = '',
      remarks = '',
      country = '',
      designation = '',
      industry = '',
      linkedin_url = '',
      priority_contact = '',
      email_tool_verified = '',
      mail_tool_verified = '',
      company_type = '',
      technology = '',
      preferred_linkedin_connected = '',
      preferred_linkedin = '',
      linkedin_connected_account = '',
      linkedin_connected_acc = '',
      linkedin_cnnctd_acc = '',
      linkedin_connection_send_account = '',
      linkedin_conn_send_acc = '',
      created_from = '',
      created_to = '',
      modified_from = '',
      modified_to = '',
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
      const countRes = await db.query('SELECT COUNT(*)::int AS total FROM contacts');
      if (countRes.rows[0] && countRes.rows[0].total > 0) {
        usePostgres = true;
      }
    } catch (e) {
      usePostgres = false;
    }

    if (!usePostgres) {
      const result = localStore.getContacts({
        search,
        id_from,
        id_to,
        company_id: company_id || comp_id,
        company_name: company_name || comp_name,
        contact_name,
        contact_status: contact_status || contactstatus,
        salesperson,
        email: email || comp_email,
        website,
        source,
        position_type: position_type || pos_type,
        remark: remark || remarks,
        country,
        designation,
        industry,
        linkedin_url,
        priority_contact,
        email_tool_verified: email_tool_verified || mail_tool_verified,
        company_type,
        technology,
        preferred_linkedin: preferred_linkedin || preferred_linkedin_connected,
        linkedin_connected_account: linkedin_connected_account || linkedin_connected_acc || linkedin_cnnctd_acc,
        linkedin_connection_send_account: linkedin_connection_send_account || linkedin_conn_send_acc,
        created_from,
        created_to,
        modified_from,
        modified_to,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        page: parsedPage,
        offset: parsedOffset,
      });

      return res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        source: 'local_database',
      });
    }

    const conditions = [];
    const params = [];

    // Global search query
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const sIndex = params.length;
      conditions.push(`(
        ct.contact_name ILIKE $${sIndex} OR
        ct.comp_name ILIKE $${sIndex} OR
        ct.company_name ILIKE $${sIndex} OR
        ct.designation ILIKE $${sIndex} OR
        ct.pos_type ILIKE $${sIndex} OR
        ct.position_type ILIKE $${sIndex} OR
        ct.industry ILIKE $${sIndex} OR
        ct.phone ILIKE $${sIndex} OR
        ct.contact_phone ILIKE $${sIndex} OR
        ct.mobile ILIKE $${sIndex} OR
        ct.contact_mobile ILIKE $${sIndex} OR
        ct.email ILIKE $${sIndex} OR
        ct.comp_email ILIKE $${sIndex} OR
        ct.country ILIKE $${sIndex} OR
        ct.salesperson ILIKE $${sIndex} OR
        ct.technology ILIKE $${sIndex} OR
        CAST(ct.id AS TEXT) ILIKE $${sIndex} OR
        CAST(ct.comp_id AS TEXT) ILIKE $${sIndex} OR
        CAST(ct.company_id AS TEXT) ILIKE $${sIndex}
      )`);
    }

    // ID Range
    if (id_from && !isNaN(parseInt(id_from, 10))) {
      params.push(parseInt(id_from, 10));
      conditions.push(`ct.id >= $${params.length}`);
    }
    if (id_to && !isNaN(parseInt(id_to, 10))) {
      params.push(parseInt(id_to, 10));
      conditions.push(`ct.id <= $${params.length}`);
    }

    // Company ID
    const targetCompId = (company_id || comp_id || '').toString().trim();
    if (targetCompId && !isNaN(parseInt(targetCompId, 10))) {
      params.push(parseInt(targetCompId, 10));
      conditions.push(`(ct.comp_id = $${params.length} OR ct.company_id = $${params.length})`);
    }

    // Company Name
    const targetCompName = (company_name || comp_name || '').trim();
    if (targetCompName) {
      params.push(`%${targetCompName}%`);
      conditions.push(`(ct.comp_name ILIKE $${params.length} OR ct.company_name ILIKE $${params.length})`);
    }

    // Contact Name
    if (contact_name && contact_name.trim() !== '') {
      params.push(`%${contact_name.trim()}%`);
      conditions.push(`ct.contact_name ILIKE $${params.length}`);
    }

    // Contact Status
    const targetStatus = (contact_status || contactstatus || '').trim();
    if (targetStatus) {
      params.push(targetStatus);
      conditions.push(`(ct.contactstatus = $${params.length} OR ct.contact_status = $${params.length})`);
    }

    // Sales Person
    if (salesperson && salesperson.trim() !== '') {
      params.push(salesperson.trim());
      conditions.push(`ct.salesperson = $${params.length}`);
    }

    // Email
    const targetEmail = (email || comp_email || '').trim();
    if (targetEmail) {
      params.push(`%${targetEmail}%`);
      conditions.push(`(ct.comp_email ILIKE $${params.length} OR ct.email ILIKE $${params.length} OR ct.other_email ILIKE $${params.length})`);
    }

    // Website
    if (website && website.trim() !== '') {
      params.push(`%${website.trim()}%`);
      conditions.push(`ct.website ILIKE $${params.length}`);
    }

    // Source
    if (source && source.trim() !== '') {
      params.push(source.trim());
      conditions.push(`ct.source = $${params.length}`);
    }

    // Position Type
    const targetPos = (position_type || pos_type || '').trim();
    if (targetPos) {
      params.push(targetPos);
      conditions.push(`(ct.pos_type = $${params.length} OR ct.position_type = $${params.length})`);
    }

    // Remark
    const targetRemark = (remark || remarks || '').trim();
    if (targetRemark) {
      params.push(`%${targetRemark}%`);
      conditions.push(`(ct.remark ILIKE $${params.length} OR ct.remarks ILIKE $${params.length})`);
    }

    // Country
    if (country && country.trim() !== '') {
      params.push(country.trim());
      conditions.push(`ct.country = $${params.length}`);
    }

    // Designation
    if (designation && designation.trim() !== '') {
      params.push(`%${designation.trim()}%`);
      conditions.push(`ct.designation ILIKE $${params.length}`);
    }

    // Industry
    if (industry && industry.trim() !== '') {
      params.push(industry.trim());
      conditions.push(`ct.industry = $${params.length}`);
    }

    // LinkedIn URL
    if (linkedin_url && linkedin_url.trim() !== '') {
      params.push(`%${linkedin_url.trim()}%`);
      conditions.push(`ct.linkedin_url ILIKE $${params.length}`);
    }

    // Priority Contact
    if (priority_contact && priority_contact.trim() !== '') {
      params.push(priority_contact.trim());
      conditions.push(`ct.priority_contact = $${params.length}`);
    }

    // Email Tool Verified
    const targetVerified = (email_tool_verified || mail_tool_verified || '').trim();
    if (targetVerified) {
      params.push(targetVerified);
      conditions.push(`ct.email_tool_verified = $${params.length}`);
    }

    // Company Type
    if (company_type && company_type.trim() !== '') {
      params.push(company_type.trim());
      conditions.push(`ct.company_type = $${params.length}`);
    }

    // Technology
    if (technology && technology.trim() !== '') {
      params.push(`%${technology.trim()}%`);
      conditions.push(`ct.technology ILIKE $${params.length}`);
    }

    // Preferred LinkedIn
    const targetPref = (preferred_linkedin_connected || preferred_linkedin || '').trim();
    if (targetPref) {
      params.push(`%${targetPref}%`);
      conditions.push(`ct.preferred_linkedin_connected ILIKE $${params.length}`);
    }

    // LinkedIn Connected Account
    const targetConnAcc = (linkedin_connected_account || linkedin_connected_acc || linkedin_cnnctd_acc || '').trim();
    if (targetConnAcc) {
      params.push(`%${targetConnAcc}%`);
      conditions.push(`(ct.linkedin_cnnctd_acc ILIKE $${params.length} OR ct.linkedin_connected_acc ILIKE $${params.length})`);
    }

    // LinkedIn Connection Send Account
    const targetSendAcc = (linkedin_connection_send_account || linkedin_conn_send_acc || '').trim();
    if (targetSendAcc) {
      params.push(`%${targetSendAcc}%`);
      conditions.push(`ct.linkedin_conn_send_acc ILIKE $${params.length}`);
    }

    // Date Ranges
    if (created_from && created_from.trim() !== '') {
      params.push(created_from.trim());
      conditions.push(`(ct.created_date >= $${params.length} OR TO_CHAR(ct.created_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (created_to && created_to.trim() !== '') {
      params.push(created_to.trim());
      conditions.push(`(ct.created_date <= $${params.length} OR TO_CHAR(ct.created_at, 'YYYY-MM-DD') <= $${params.length})`);
    }
    if (modified_from && modified_from.trim() !== '') {
      params.push(modified_from.trim());
      conditions.push(`(ct.modified_date >= $${params.length} OR TO_CHAR(ct.updated_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (modified_to && modified_to.trim() !== '') {
      params.push(modified_to.trim());
      conditions.push(`(ct.modified_date <= $${params.length} OR TO_CHAR(ct.updated_at, 'YYYY-MM-DD') <= $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Safe Sort
    const validSortFields = {
      id: 'ct.id',
      contact_name: 'ct.contact_name',
      company_name: 'COALESCE(ct.comp_name, ct.company_name)',
      comp_name: 'COALESCE(ct.comp_name, ct.company_name)',
      designation: 'ct.designation',
      position_type: 'ct.position_type',
      pos_type: 'ct.pos_type',
      contact_status: 'ct.contact_status',
      contactstatus: 'ct.contactstatus',
      salesperson: 'ct.salesperson',
      industry: 'ct.industry',
      created_at: 'ct.created_at',
      created_date: 'ct.created_date',
    };
    const sortField = validSortFields[sortBy] || 'ct.id';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count Total
    const countSql = `SELECT COUNT(*)::int AS total FROM contacts ct ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0].total;

    // Data Query
    const dataSql = `
      SELECT 
        ct.*,
        COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name) AS company_name,
        COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name) AS comp_name,
        COALESCE(ct.comp_id, ct.company_id, c.id) AS comp_id,
        COALESCE(ct.company_id, ct.comp_id, c.id) AS company_id,
        COALESCE(ct.pos_type, ct.position_type) AS pos_type,
        COALESCE(ct.pos_type, ct.position_type) AS position_type,
        COALESCE(ct.comp_email, ct.email) AS comp_email,
        COALESCE(ct.comp_email, ct.email) AS email,
        COALESCE(ct.comp_email_verified, ct.email_verified) AS comp_email_verified,
        COALESCE(ct.comp_email_verified, ct.email_verified) AS email_verified,
        COALESCE(ct.contact_phone, ct.phone) AS contact_phone,
        COALESCE(ct.contact_phone, ct.phone) AS phone,
        COALESCE(ct.contact_phone2, ct.phone2) AS contact_phone2,
        COALESCE(ct.contact_phone2, ct.phone2) AS phone2,
        COALESCE(ct.contact_phone3, ct.phone3) AS contact_phone3,
        COALESCE(ct.contact_phone3, ct.phone3) AS phone3,
        COALESCE(ct.contact_mobile, ct.mobile) AS contact_mobile,
        COALESCE(ct.contact_mobile, ct.mobile) AS mobile,
        COALESCE(ct.contact_mobile2, ct.mobile2) AS contact_mobile2,
        COALESCE(ct.contact_mobile2, ct.mobile2) AS mobile2,
        COALESCE(ct.contact_mobile3, ct.mobile3) AS contact_mobile3,
        COALESCE(ct.contact_mobile3, ct.mobile3) AS mobile3,
        COALESCE(ct.linkedlnid, ct.linkedin_id) AS linkedlnid,
        COALESCE(ct.linkedlnid, ct.linkedin_id) AS linkedin_id,
        COALESCE(ct.comp_linkedlnid, ct.comp_linkedin_id) AS comp_linkedlnid,
        COALESCE(ct.comp_linkedlnid, ct.comp_linkedin_id) AS comp_linkedin_id,
        COALESCE(ct.contactstatus, ct.contact_status) AS contactstatus,
        COALESCE(ct.contactstatus, ct.contact_status) AS contact_status,
        COALESCE(ct.data_extracted, ct.data_extracted_date) AS data_extracted,
        COALESCE(ct.data_extracted, ct.data_extracted_date) AS data_extracted_date,
        COALESCE(ct.remark, ct.remarks) AS remark,
        COALESCE(ct.remark, ct.remarks) AS remarks,
        COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc) AS linkedin_cnnctd_acc,
        COALESCE(ct.linkedin_cnnctd_acc, ct.linkedin_connected_acc) AS linkedin_connected_acc,
        COALESCE(ct.email_verified_by_response, ct.email_verified_response) AS email_verified_by_response,
        COALESCE(ct.email_verified_by_response, ct.email_verified_response) AS email_verified_response,
        COALESCE(ct.technology, c.technology) AS technology
      FROM contacts ct
      LEFT JOIN companies c ON (ct.comp_id = c.id OR ct.company_id = c.id)
      ${whereClause}
      ORDER BY ${sortField} ${sortDir} NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, parsedLimit, parsedOffset];
    const dataRes = await db.query(dataSql, dataParams);

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
    console.warn('[Contacts Route Handled]:', error.message);
    const fallback = localStore.getContacts(req.query);
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
 * GET /api/contacts/ids
 * Returns all contact IDs matching current filter criteria (for Select All throughout report).
 */
router.get('/ids', async (req, res, next) => {
  try {
    const {
      search = '',
      id_from = '',
      id_to = '',
      company_id = '',
      comp_id = '',
      company_name = '',
      comp_name = '',
      contact_name = '',
      contact_status = '',
      contactstatus = '',
      salesperson = '',
      email = '',
      comp_email = '',
      website = '',
      source = '',
      position_type = '',
      pos_type = '',
      remark = '',
      remarks = '',
      country = '',
      designation = '',
      industry = '',
      linkedin_url = '',
      priority_contact = '',
      email_tool_verified = '',
      mail_tool_verified = '',
      company_type = '',
      technology = '',
      preferred_linkedin_connected = '',
      preferred_linkedin = '',
      linkedin_connected_account = '',
      linkedin_connected_acc = '',
      linkedin_cnnctd_acc = '',
      linkedin_connection_send_account = '',
      linkedin_conn_send_acc = '',
      created_from = '',
      created_to = '',
      modified_from = '',
      modified_to = '',
    } = req.query;

    const conditions = [];
    const params = [];

    // Global Search
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const sIndex = params.length;
      conditions.push(`(
        ct.contact_name ILIKE $${sIndex} OR
        ct.designation ILIKE $${sIndex} OR
        ct.comp_name ILIKE $${sIndex} OR
        ct.company_name ILIKE $${sIndex} OR
        ct.comp_email ILIKE $${sIndex} OR
        ct.email ILIKE $${sIndex} OR
        ct.other_email ILIKE $${sIndex} OR
        ct.contact_phone ILIKE $${sIndex} OR
        ct.phone ILIKE $${sIndex} OR
        ct.contact_mobile ILIKE $${sIndex} OR
        ct.mobile ILIKE $${sIndex} OR
        ct.linkedin_url ILIKE $${sIndex} OR
        ct.industry ILIKE $${sIndex} OR
        ct.technology ILIKE $${sIndex} OR
        ct.country ILIKE $${sIndex} OR
        ct.salesperson ILIKE $${sIndex} OR
        CAST(ct.id AS TEXT) ILIKE $${sIndex}
      )`);
    }

    // ID Range
    if (id_from && !isNaN(parseInt(id_from, 10))) {
      params.push(parseInt(id_from, 10));
      conditions.push(`ct.id >= $${params.length}`);
    }
    if (id_to && !isNaN(parseInt(id_to, 10))) {
      params.push(parseInt(id_to, 10));
      conditions.push(`ct.id <= $${params.length}`);
    }

    // Company ID
    const targetCompId = company_id || comp_id;
    if (targetCompId && !isNaN(parseInt(targetCompId, 10))) {
      params.push(parseInt(targetCompId, 10));
      conditions.push(`(ct.comp_id = $${params.length} OR ct.company_id = $${params.length})`);
    }

    // Company Name
    const targetCompName = (company_name || comp_name || '').trim();
    if (targetCompName) {
      params.push(`%${targetCompName}%`);
      conditions.push(`(ct.comp_name ILIKE $${params.length} OR ct.company_name ILIKE $${params.length})`);
    }

    // Contact Name
    if (contact_name && contact_name.trim() !== '') {
      params.push(`%${contact_name.trim()}%`);
      conditions.push(`ct.contact_name ILIKE $${params.length}`);
    }

    // Contact Status
    const targetStatus = (contact_status || contactstatus || '').trim();
    if (targetStatus) {
      params.push(targetStatus);
      conditions.push(`(ct.contactstatus = $${params.length} OR ct.contact_status = $${params.length})`);
    }

    // Sales Person
    if (salesperson && salesperson.trim() !== '') {
      params.push(salesperson.trim());
      conditions.push(`ct.salesperson = $${params.length}`);
    }

    // Email
    const targetEmail = (email || comp_email || '').trim();
    if (targetEmail) {
      params.push(`%${targetEmail}%`);
      conditions.push(`(ct.comp_email ILIKE $${params.length} OR ct.email ILIKE $${params.length} OR ct.other_email ILIKE $${params.length})`);
    }

    // Website
    if (website && website.trim() !== '') {
      params.push(`%${website.trim()}%`);
      conditions.push(`ct.website ILIKE $${params.length}`);
    }

    // Source
    if (source && source.trim() !== '') {
      params.push(source.trim());
      conditions.push(`ct.source = $${params.length}`);
    }

    // Position Type
    const targetPos = (position_type || pos_type || '').trim();
    if (targetPos) {
      params.push(targetPos);
      conditions.push(`(ct.pos_type = $${params.length} OR ct.position_type = $${params.length})`);
    }

    // Remark
    const targetRemark = (remark || remarks || '').trim();
    if (targetRemark) {
      params.push(`%${targetRemark}%`);
      conditions.push(`(ct.remark ILIKE $${params.length} OR ct.remarks ILIKE $${params.length})`);
    }

    // Country
    if (country && country.trim() !== '') {
      params.push(country.trim());
      conditions.push(`ct.country = $${params.length}`);
    }

    // Designation
    if (designation && designation.trim() !== '') {
      params.push(`%${designation.trim()}%`);
      conditions.push(`ct.designation ILIKE $${params.length}`);
    }

    // Industry
    if (industry && industry.trim() !== '') {
      params.push(industry.trim());
      conditions.push(`ct.industry = $${params.length}`);
    }

    // LinkedIn URL
    if (linkedin_url && linkedin_url.trim() !== '') {
      params.push(`%${linkedin_url.trim()}%`);
      conditions.push(`ct.linkedin_url ILIKE $${params.length}`);
    }

    // Priority Contact
    if (priority_contact && priority_contact.trim() !== '') {
      params.push(priority_contact.trim());
      conditions.push(`ct.priority_contact = $${params.length}`);
    }

    // Email Tool Verified
    const targetVerified = (email_tool_verified || mail_tool_verified || '').trim();
    if (targetVerified) {
      params.push(targetVerified);
      conditions.push(`ct.email_tool_verified = $${params.length}`);
    }

    // Company Type
    if (company_type && company_type.trim() !== '') {
      params.push(company_type.trim());
      conditions.push(`ct.company_type = $${params.length}`);
    }

    // Technology
    if (technology && technology.trim() !== '') {
      params.push(`%${technology.trim()}%`);
      conditions.push(`ct.technology ILIKE $${params.length}`);
    }

    // Preferred LinkedIn
    const targetPref = (preferred_linkedin_connected || preferred_linkedin || '').trim();
    if (targetPref) {
      params.push(`%${targetPref}%`);
      conditions.push(`ct.preferred_linkedin_connected ILIKE $${params.length}`);
    }

    // LinkedIn Connected Account
    const targetConnAcc = (linkedin_connected_account || linkedin_connected_acc || linkedin_cnnctd_acc || '').trim();
    if (targetConnAcc) {
      params.push(`%${targetConnAcc}%`);
      conditions.push(`(ct.linkedin_cnnctd_acc ILIKE $${params.length} OR ct.linkedin_connected_acc ILIKE $${params.length})`);
    }

    // LinkedIn Connection Send Account
    const targetSendAcc = (linkedin_connection_send_account || linkedin_conn_send_acc || '').trim();
    if (targetSendAcc) {
      params.push(`%${targetSendAcc}%`);
      conditions.push(`ct.linkedin_conn_send_acc ILIKE $${params.length}`);
    }

    // Date Ranges
    if (created_from && created_from.trim() !== '') {
      params.push(created_from.trim());
      conditions.push(`(ct.created_date >= $${params.length} OR TO_CHAR(ct.created_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (created_to && created_to.trim() !== '') {
      params.push(created_to.trim());
      conditions.push(`(ct.created_date <= $${params.length} OR TO_CHAR(ct.created_at, 'YYYY-MM-DD') <= $${params.length})`);
    }
    if (modified_from && modified_from.trim() !== '') {
      params.push(modified_from.trim());
      conditions.push(`(ct.modified_date >= $${params.length} OR TO_CHAR(ct.updated_at, 'YYYY-MM-DD') >= $${params.length})`);
    }
    if (modified_to && modified_to.trim() !== '') {
      params.push(modified_to.trim());
      conditions.push(`(ct.modified_date <= $${params.length} OR TO_CHAR(ct.updated_at, 'YYYY-MM-DD') <= $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const idsSql = `
      SELECT ct.id 
      FROM contacts ct 
      LEFT JOIN companies c ON (ct.comp_id = c.id OR ct.company_id = c.id)
      ${whereClause} 
      ORDER BY ct.id DESC
    `;
    const idsRes = await db.query(idsSql, params);

    res.json({
      success: true,
      ids: idsRes.rows.map((r) => r.id),
      count: idsRes.rows.length,
    });
  } catch (error) {
    console.warn('[Contacts IDs Handled]:', error.message);
    const fallback = localStore.getContacts(req.query);
    res.json({
      success: true,
      ids: (fallback.data || []).map((r) => r.id),
      count: fallback.total || 0,
    });
  }
});

/**
 * GET /api/contacts/filters
 * Distinct filter values for contacts.
 */
router.get('/filters', async (req, res, next) => {
  try {
    let results;
    try {
      results = await Promise.all([
        db.query(`SELECT DISTINCT COALESCE(comp_name, company_name) AS val FROM contacts WHERE COALESCE(comp_name, company_name) IS NOT NULL AND COALESCE(comp_name, company_name) != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT contact_name AS val FROM contacts WHERE contact_name IS NOT NULL AND contact_name != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT COALESCE(contactstatus, contact_status) AS val FROM contacts WHERE COALESCE(contactstatus, contact_status) IS NOT NULL AND COALESCE(contactstatus, contact_status) != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT salesperson AS val FROM contacts WHERE salesperson IS NOT NULL AND salesperson != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT source AS val FROM contacts WHERE source IS NOT NULL AND source != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT COALESCE(pos_type, position_type) AS val FROM contacts WHERE COALESCE(pos_type, position_type) IS NOT NULL AND COALESCE(pos_type, position_type) != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT country AS val FROM contacts WHERE country IS NOT NULL AND country != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT designation AS val FROM contacts WHERE designation IS NOT NULL AND designation != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT industry AS val FROM contacts WHERE industry IS NOT NULL AND industry != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT priority_contact AS val FROM contacts WHERE priority_contact IS NOT NULL AND priority_contact != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT email_tool_verified AS val FROM contacts WHERE email_tool_verified IS NOT NULL AND email_tool_verified != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT company_type AS val FROM contacts WHERE company_type IS NOT NULL AND company_type != '' ORDER BY val ASC`),
        db.query(`SELECT DISTINCT technology AS val FROM contacts WHERE technology IS NOT NULL AND technology != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT preferred_linkedin_connected AS val FROM contacts WHERE preferred_linkedin_connected IS NOT NULL AND preferred_linkedin_connected != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) AS val FROM contacts WHERE COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) IS NOT NULL AND COALESCE(linkedin_cnnctd_acc, linkedin_connected_acc) != '' ORDER BY val ASC LIMIT 100`),
        db.query(`SELECT DISTINCT linkedin_conn_send_acc AS val FROM contacts WHERE linkedin_conn_send_acc IS NOT NULL AND linkedin_conn_send_acc != '' ORDER BY val ASC LIMIT 100`),
      ]);
    } catch (e) {
      results = null;
    }

    if (!results || results[0].rows.length === 0) {
      return res.json({
        success: true,
        data: localStore.getContactFilters(),
      });
    }

    res.json({
      success: true,
      data: {
        companyNames: results[0].rows.map((r) => r.val),
        contactNames: results[1].rows.map((r) => r.val),
        contactStatuses: results[2].rows.map((r) => r.val),
        salespersons: results[3].rows.map((r) => r.val),
        sources: results[4].rows.map((r) => r.val),
        positionTypes: results[5].rows.map((r) => r.val),
        countries: results[6].rows.map((r) => r.val),
        designations: results[7].rows.map((r) => r.val),
        industries: results[8].rows.map((r) => r.val),
        priorityContacts: results[9].rows.map((r) => r.val),
        emailToolVerified: results[10].rows.map((r) => r.val),
        companyTypes: results[11].rows.map((r) => r.val),
        technologies: results[12].rows.map((r) => r.val),
        preferredLinkedIns: results[13].rows.map((r) => r.val),
        linkedinConnectedAccounts: results[14].rows.map((r) => r.val),
        linkedinConnSendAccounts: results[15].rows.map((r) => r.val),
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: localStore.getContactFilters(),
    });
  }
});

/**
 * GET /api/contacts/upload/meta
 * Master lookup reference values for validation in Contact upload workflow.
 */
router.get('/upload/meta', async (req, res, next) => {
  try {
    const meta = await contactUploadService.getContactUploadMeta();
    res.json({ success: true, data: meta });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contacts/upload/template
 * Download pre-formatted CSV template based on selected Upload Mode (Insert vs Update).
 */
router.get('/upload/template', (req, res) => {
  const mode = req.query.mode === 'update' ? 'update' : 'insert';
  const csvContent = contactUploadService.getContactTemplateCsv(mode);
  const filename = mode === 'update' ? 'Contact_Upload_Template_Update.csv' : 'Contact_Upload_Template_Insert.csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

/**
 * POST /api/contacts/upload/validate
 * Validate rows in Contact Upload Step 2
 */
router.post('/upload/validate', async (req, res, next) => {
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
 * POST /api/contacts/upload/import
 * Import valid Contact rows into PostgreSQL database in Step 3
 */
router.post('/upload/import', async (req, res, next) => {
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

/**
 * GET /api/contacts/:id
 * Retrieve contact by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    let contact = null;

    try {
      const query = `
        SELECT 
          ct.*,
          c.name AS live_company_name,
          c.website AS company_website,
          c.phone AS company_phone
        FROM contacts ct
        LEFT JOIN companies c ON ct.company_id = c.id
        WHERE ct.id = $1
      `;
      const { rows } = await db.query(query, [id]);
      if (rows.length > 0) {
        contact = rows[0];
      }
    } catch (e) {}

    if (!contact) {
      contact = localStore.getContact(id);
    }

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (error) {
    const contact = localStore.getContact(req.params.id);
    if (contact) {
      return res.json({ success: true, data: contact });
    }
    res.status(404).json({ success: false, message: 'Contact not found' });
  }
});

/**
 * POST /api/contacts
 * Create a new contact.
 */
router.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const contactName = b.contact_name || b.CONTACT_NAME || `${b.first_name || ''} ${b.last_name || ''}`.trim();

    if (!contactName) {
      return res.status(400).json({ success: false, message: 'Contact name is required.' });
    }

    const trimmedContactName = contactName.trim();

    // Validate Contact Name uniqueness (case-insensitive & trimmed)
    if (db.isAvailable && db.isAvailable()) {
      const dupCheck = await db.query(
        'SELECT id, contact_name FROM contacts WHERE LOWER(TRIM(COALESCE(contact_name, \'\'))) = LOWER(TRIM($1)) LIMIT 1',
        [trimmedContactName]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'contact_name',
          message: `A contact with the name "${trimmedContactName}" already exists (Contact #${dupCheck.rows[0].id}). Duplicate contact records are not allowed.`,
        });
      }
    }

    const localCreated = localStore.createContact(b);

    let savedContact = localCreated;
    try {
      const insertSql = `
        INSERT INTO contacts (
          company_id, comp_id, company_name, comp_name, contact_name, designation, position_type, pos_type,
          company_type, contact_status, contactstatus, salesperson, industry, country, website,
          phone, contact_phone, phone2, contact_phone2, phone3, contact_phone3, mobile, contact_mobile,
          mobile2, contact_mobile2, mobile3, contact_mobile3, mobile_verified,
          email, comp_email, other_email, email_verified, comp_email_verified, email_tool_verified, email_verified_response, email_verified_by_response,
          linkedin_url, linkedin_id, linkedlnid, comp_linkedin_id, comp_linkedlnid, preferred_linkedin_connected,
          linkedin_conn_send_acc, connection_date, connection_send_by, linkedin_connected_acc, linkedin_cnnctd_acc,
          priority_contact, current_past, source, source_details, data_extracted_date, data_extracted,
          remarks, remark, created_by, modified_by, created_date, modified_date
        ) VALUES (
          $1, $1, $2, $2, $3, $4, $5, $5,
          $6, $7, $7, $8, $9, $10, $11,
          $12, $12, $13, $13, $14, $14, $15, $15,
          $16, $16, $17, $17, $18,
          $19, $19, $20, $21, $21, $22, $23, $23,
          $24, $25, $25, $26, $26, $27,
          $28, $29, $30, $31, $31,
          $32, $33, $34, $35, $36, $36,
          $37, $37, $38, $39,
          TO_CHAR(NOW(), 'DD-MON-YYYY'), TO_CHAR(NOW(), 'DD-MON-YYYY')
        )
        RETURNING *
      `;
      const params = [
        b.company_id ? parseInt(b.company_id, 10) : (b.comp_id ? parseInt(b.comp_id, 10) : null),
        b.company_name || b.comp_name || null,
        contactName,
        b.designation || null,
        b.position_type || b.pos_type || null,
        b.company_type || 'Direct Client',
        b.contact_status || b.contactstatus || 'By Email',
        b.salesperson || null,
        b.industry || null,
        b.country || null,
        b.website || null,
        b.phone || b.contact_phone || null,
        b.phone2 || b.contact_phone2 || null,
        b.phone3 || b.contact_phone3 || null,
        b.mobile || b.contact_mobile || null,
        b.mobile2 || b.contact_mobile2 || null,
        b.mobile3 || b.contact_mobile3 || null,
        b.mobile_verified || 'N',
        b.email || b.comp_email || null,
        b.other_email || null,
        b.email_verified || b.comp_email_verified || 'N',
        b.email_tool_verified || null,
        b.email_verified_response || b.email_verified_by_response || null,
        b.linkedin_url || null,
        b.linkedin_id || b.linkedlnid || null,
        b.comp_linkedin_id || b.comp_linkedlnid || null,
        b.preferred_linkedin_connected || null,
        b.linkedin_conn_send_acc || null,
        b.connection_date || null,
        b.connection_send_by || null,
        b.linkedin_connected_acc || b.linkedin_cnnctd_acc || null,
        b.priority_contact || 'N',
        b.current_past || 'Current',
        b.source || null,
        b.source_details || null,
        b.data_extracted_date || b.data_extracted || null,
        b.remarks || b.remark || null,
        b.created_by || 'APEX_PUBLIC_USER',
        b.modified_by || 'APEX_PUBLIC_USER',
      ];
      const pgRes = await db.query(insertSql, params);
      if (pgRes && pgRes.rows[0]) {
        savedContact = pgRes.rows[0];
      }
    } catch (e) {
      console.warn('[PG Contact Insert Warning]:', e.message);
    }

    res.status(201).json({
      success: true,
      message: `Contact "${contactName}" created successfully.`,
      data: savedContact,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/contacts/:id
 * Update an existing contact.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const contactName = b.contact_name || b.CONTACT_NAME || `${b.first_name || ''} ${b.last_name || ''}`.trim();

    if (!contactName) {
      return res.status(400).json({ success: false, message: 'Contact name is required.' });
    }

    const trimmedContactName = contactName.trim();

    // Validate Contact Name uniqueness (case-insensitive & trimmed, excluding current contact)
    if (db.isAvailable && db.isAvailable()) {
      const dupCheck = await db.query(
        'SELECT id, contact_name FROM contacts WHERE LOWER(TRIM(COALESCE(contact_name, \'\'))) = LOWER(TRIM($1)) AND id != $2 LIMIT 1',
        [trimmedContactName, parseInt(id, 10)]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'contact_name',
          message: `A contact with the name "${trimmedContactName}" already exists (Contact #${dupCheck.rows[0].id}). Duplicate contact records are not allowed.`,
        });
      }
    }

    const localUpdated = localStore.updateContact(id, b);

    try {
      const updateSql = `
        UPDATE contacts
        SET
          company_id = $1,
          company_name = $2,
          contact_name = $3,
          designation = $4,
          position_type = $5,
          company_type = $6,
          contact_status = $7,
          salesperson = $8,
          industry = $9,
          country = $10,
          website = $11,
          phone = $12,
          phone2 = $13,
          phone3 = $14,
          mobile = $15,
          mobile2 = $16,
          mobile3 = $17,
          mobile_verified = $18,
          email = $19,
          other_email = $20,
          email_verified = $21,
          email_tool_verified = $22,
          email_verified_response = $23,
          linkedin_url = $24,
          linkedin_id = $25,
          comp_linkedin_id = $26,
          preferred_linkedin_connected = $27,
          linkedin_conn_send_acc = $28,
          connection_date = $29,
          connection_send_by = $30,
          linkedin_connected_acc = $31,
          priority_contact = $32,
          current_past = $33,
          source = $34,
          source_details = $35,
          data_extracted_date = $36,
          remarks = $37,
          modified_by = $38,
          modified_date = TO_CHAR(NOW(), 'DD-MON-YYYY'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $39
        RETURNING *
      `;
      const params = [
        b.company_id ? parseInt(b.company_id, 10) : null,
        b.company_name || null,
        contactName,
        b.designation || null,
        b.position_type || null,
        b.company_type || 'Direct Client',
        b.contact_status || 'By Email',
        b.salesperson || null,
        b.industry || null,
        b.country || null,
        b.website || null,
        b.phone || null,
        b.phone2 || null,
        b.phone3 || null,
        b.mobile || null,
        b.mobile2 || null,
        b.mobile3 || null,
        b.mobile_verified || 'N',
        b.email || null,
        b.other_email || null,
        b.email_verified || 'N',
        b.email_tool_verified || null,
        b.email_verified_response || null,
        b.linkedin_url || null,
        b.linkedin_id || null,
        b.comp_linkedin_id || null,
        b.preferred_linkedin_connected || null,
        b.linkedin_conn_send_acc || null,
        b.connection_date || null,
        b.connection_send_by || null,
        b.linkedin_connected_acc || null,
        b.priority_contact || 'N',
        b.current_past || 'Current',
        b.source || null,
        b.source_details || null,
        b.data_extracted_date || null,
        b.remarks || null,
        b.modified_by || 'ADMIN',
        parseInt(id, 10),
      ];
      await db.query(updateSql, params);
    } catch (e) {
      console.warn('[PG Contact Update Warning]:', e.message);
    }

    res.json({
      success: true,
      message: `Contact #${id} updated successfully.`,
      data: localUpdated || b,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/contacts/:id
 * Delete a contact.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    localStore.deleteContact(id);

    try {
      await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    } catch (e) {
      console.warn('[PG Contact Delete Warning]:', e.message);
    }

    res.json({
      success: true,
      message: `Contact #${id} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contacts/bulk-delete
 * Delete multiple contacts.
 */
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of IDs to delete.' });
    }

    localStore.bulkDeleteContacts(ids);

    try {
      await db.query('DELETE FROM contacts WHERE id = ANY($1::int[])', [ids]);
    } catch (e) {
      console.warn('[PG Contact Bulk Delete Warning]:', e.message);
    }

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} contact record(s).`,
      deletedCount: ids.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
