const express = require('express');
const router = express.Router();
const db = require('../db/pool');

const PROTECTED_ADMIN_ID = 1; // Primary admin cannot be deleted or locked out

/**
 * GET /api/users
 * List users with search, role, status filters, and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      can_login = '',
      page = 1,
      limit = 20,
      sortBy = 'id',
      sortOrder = 'ASC'
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      whereClauses.push(`(
        LOWER(full_name) LIKE $${idx} OR
        LOWER(email) LIKE $${idx} OR
        LOWER(username) LIKE $${idx} OR
        LOWER(COALESCE(department, '')) LIKE $${idx}
      )`);
    }

    if (role && role.trim() && role !== 'all') {
      params.push(role.trim().toLowerCase());
      whereClauses.push(`LOWER(role) = $${params.length}`);
    }

    if (status && status.trim() && status !== 'all') {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`LOWER(status) = $${params.length}`);
    }

    if (can_login !== '' && can_login !== undefined && can_login !== 'all') {
      const isAllowed = String(can_login).toLowerCase() === 'true';
      params.push(isAllowed);
      whereClauses.push(`can_login = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSortColumns = ['id', 'full_name', 'email', 'username', 'role', 'status', 'can_login', 'created_at', 'last_login_at'];
    const safeSort = allowedSortColumns.includes(sortBy.toLowerCase()) ? sortBy.toLowerCase() : 'id';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Count Query
    const countSql = `SELECT COUNT(*)::int AS total FROM public.users ${whereSql}`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // Data Query
    params.push(parsedLimit);
    params.push(offset);
    const dataSql = `
      SELECT 
        id, full_name, email, username, role, can_login, status,
        department, phone, notes, last_login_at, created_by, created_at, updated_at
      FROM public.users
      ${whereSql}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const dataRes = await db.query(dataSql, params);

    res.json({
      success: true,
      data: dataRes.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/roles/summary
 * Aggregate user counts by role and login status
 */
router.get('/roles/summary', async (req, res, next) => {
  try {
    const summaryRes = await db.query(`
      SELECT 
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE can_login = true)::int AS active_login_users,
        COUNT(*) FILTER (WHERE can_login = false)::int AS blocked_users,
        COUNT(*) FILTER (WHERE LOWER(role) = 'admin')::int AS admin_count,
        COUNT(*) FILTER (WHERE LOWER(role) = 'sales')::int AS sales_count,
        COUNT(*) FILTER (WHERE LOWER(role) = 'marketing')::int AS marketing_count,
        COUNT(*) FILTER (WHERE LOWER(role) = 'viewer')::int AS viewer_count
      FROM public.users
    `);
    res.json({
      success: true,
      data: summaryRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Retrieve a single user
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRes = await db.query('SELECT * FROM public.users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User #${id} not found.` });
    }
    res.json({ success: true, data: userRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      username,
      role = 'sales',
      can_login = true,
      status = 'Active',
      password = '',
      department = '',
      phone = '',
      notes = ''
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = ['admin', 'sales', 'marketing', 'viewer'].includes(String(role).toLowerCase())
      ? String(role).toLowerCase()
      : 'sales';

    // Duplicate check
    const dupCheck = await db.query(
      'SELECT id, email, username FROM public.users WHERE LOWER(email) = $1 OR LOWER(username) = $2',
      [cleanEmail, cleanUsername]
    );
    if (dupCheck.rows.length > 0) {
      const match = dupCheck.rows[0];
      if (match.email.toLowerCase() === cleanEmail) {
        return res.status(409).json({ success: false, message: `User with email '${cleanEmail}' already exists.` });
      }
      return res.status(409).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    const insertSql = `
      INSERT INTO public.users (
        full_name, email, username, role, can_login, status, password, department, phone, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'admin')
      RETURNING *
    `;
    const insertRes = await db.query(insertSql, [
      full_name.trim(),
      cleanEmail,
      cleanUsername,
      cleanRole,
      Boolean(can_login),
      Boolean(can_login) ? (status || 'Active') : 'Blocked',
      password ? password.trim() : null,
      department ? department.trim() : null,
      phone ? phone.trim() : null,
      notes ? notes.trim() : null
    ]);

    res.status(201).json({
      success: true,
      data: insertRes.rows[0],
      message: `User '${full_name}' created successfully with role '${cleanRole}'.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id
 * Update an existing user
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      username,
      role,
      can_login,
      status,
      department,
      phone,
      notes
    } = req.body;

    const existingRes = await db.query('SELECT * FROM public.users WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User #${id} not found.` });
    }
    const existing = existingRes.rows[0];

    // Safety: prevent demoting or locking out primary admin
    if (parseInt(id, 10) === PROTECTED_ADMIN_ID) {
      if (can_login === false || (status && status.toLowerCase() === 'blocked')) {
        return res.status(403).json({ success: false, message: 'Primary System Administrator cannot be blocked or have login disabled.' });
      }
      if (role && role.toLowerCase() !== 'admin') {
        return res.status(403).json({ success: false, message: 'Primary System Administrator role cannot be changed.' });
      }
    }

    const cleanEmail = email ? email.trim().toLowerCase() : existing.email;
    const cleanUsername = username ? username.trim().toLowerCase() : existing.username;

    // Check unique email / username conflict
    const conflictCheck = await db.query(
      'SELECT id, email, username FROM public.users WHERE (LOWER(email) = $1 OR LOWER(username) = $2) AND id != $3',
      [cleanEmail, cleanUsername, id]
    );
    if (conflictCheck.rows.length > 0) {
      const match = conflictCheck.rows[0];
      if (match.email.toLowerCase() === cleanEmail) {
        return res.status(409).json({ success: false, message: `Another user already uses email '${cleanEmail}'.` });
      }
      return res.status(409).json({ success: false, message: `Another user already uses username '${cleanUsername}'.` });
    }

    const updatedCanLogin = can_login !== undefined ? Boolean(can_login) : existing.can_login;
    const updatedStatus = updatedCanLogin ? (status || existing.status || 'Active') : 'Blocked';

    const updateSql = `
      UPDATE public.users SET
        full_name = COALESCE($1, full_name),
        email = $2,
        username = $3,
        role = COALESCE($4, role),
        can_login = $5,
        status = $6,
        department = $7,
        phone = $8,
        notes = $9,
        password = COALESCE($10, password),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;
    const updateRes = await db.query(updateSql, [
      full_name ? full_name.trim() : existing.full_name,
      cleanEmail,
      cleanUsername,
      role ? role.toLowerCase() : existing.role,
      updatedCanLogin,
      updatedStatus,
      department !== undefined ? (department ? department.trim() : null) : existing.department,
      phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
      notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      req.body.password ? req.body.password.trim() : null,
      id
    ]);

    res.json({
      success: true,
      data: updateRes.rows[0],
      message: `User #${id} (${updateRes.rows[0].full_name}) updated successfully.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/:id/toggle-login
 * Quickly allow or deny login for a user
 */
router.patch('/:id/toggle-login', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === PROTECTED_ADMIN_ID) {
      return res.status(403).json({ success: false, message: 'Primary System Administrator login permissions cannot be revoked.' });
    }

    const userRes = await db.query('SELECT id, full_name, can_login FROM public.users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User #${id} not found.` });
    }

    const current = userRes.rows[0];
    const newCanLogin = !current.can_login;
    const newStatus = newCanLogin ? 'Active' : 'Blocked';

    const updateRes = await db.query(`
      UPDATE public.users 
      SET can_login = $1, status = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [newCanLogin, newStatus, id]);

    res.json({
      success: true,
      data: updateRes.rows[0],
      message: newCanLogin 
        ? `Login allowed for ${current.full_name}. User can now access the system.`
        : `Login revoked for ${current.full_name}. User is now blocked from logging in.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === PROTECTED_ADMIN_ID) {
      return res.status(403).json({ success: false, message: 'Primary System Administrator cannot be deleted.' });
    }

    const userRes = await db.query('SELECT id, full_name FROM public.users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User #${id} not found.` });
    }

    await db.query('DELETE FROM public.users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `User #${id} (${userRes.rows[0].full_name}) was deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
