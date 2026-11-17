const express = require('express');
const router = express.Router();
const duplicateMergerService = require('../services/duplicateMergerService');

/**
 * GET /api/duplicate-merger/companies/candidates
 * Retrieve duplicate company candidate groups
 */
router.get('/companies/candidates', async (req, res, next) => {
  try {
    const { rule = 'all', search = '', page = 1, limit = 20 } = req.query;
    const result = await duplicateMergerService.findCompanyDuplicates({
      rule,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.groups,
      total: result.totalGroups,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/company-report
 * Flattened report of all duplicate company records (Apex DUPLICATE_COMPANY_REPORT)
 */
router.get('/company-report', async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const result = await duplicateMergerService.getDuplicateCompanyReport({
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/contact-report
 * Flattened report of all duplicate contact records
 */
router.get('/contact-report', async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const result = await duplicateMergerService.getDuplicateContactReport({
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/companies/preview
 * Generate side-by-side preview and proposed values for merging companies
 */
router.post('/companies/preview', async (req, res, next) => {
  try {
    const { masterId, secondaryIds, fieldOverrides } = req.body;
    const preview = await duplicateMergerService.previewCompanyMerge({
      masterId,
      secondaryIds,
      fieldOverrides,
    });
    res.json({
      success: true,
      data: preview,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/companies/merge
 * Atomically merge companies into the master company
 */
router.post('/companies/merge', async (req, res, next) => {
  try {
    const { masterId, secondaryIds, fieldOverrides, mergedBy, notes } = req.body;
    const result = await duplicateMergerService.executeCompanyMerge({
      masterId,
      secondaryIds,
      fieldOverrides,
      mergedBy: mergedBy || 'admin',
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/contacts/candidates
 * Retrieve duplicate contact candidate groups
 */
router.get('/contacts/candidates', async (req, res, next) => {
  try {
    const { rule = 'all', search = '', page = 1, limit = 20 } = req.query;
    const result = await duplicateMergerService.findContactDuplicates({
      rule,
      search,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.groups,
      total: result.totalGroups,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/contacts/preview
 * Generate side-by-side preview and proposed values for merging contacts
 */
router.post('/contacts/preview', async (req, res, next) => {
  try {
    const { masterId, secondaryIds, fieldOverrides } = req.body;
    const preview = await duplicateMergerService.previewContactMerge({
      masterId,
      secondaryIds,
      fieldOverrides,
    });
    res.json({
      success: true,
      data: preview,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/contacts/merge
 * Atomically merge contacts into the master contact
 */
router.post('/contacts/merge', async (req, res, next) => {
  try {
    const { masterId, secondaryIds, fieldOverrides, mergedBy, notes } = req.body;
    const result = await duplicateMergerService.executeContactMerge({
      masterId,
      secondaryIds,
      fieldOverrides,
      mergedBy: mergedBy || 'admin',
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/history
 * Fetch audit history of merges
 */
router.get('/history', async (req, res, next) => {
  try {
    const { entityType, page = 1, limit = 20 } = req.query;
    const result = await duplicateMergerService.getMergeHistory({
      entityType,
      page,
      limit,
    });
    res.json({
      success: true,
      data: result.history,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/restore/:historyId
 * Restore/Rollback a merged record using audit backup snapshots
 */
router.post('/restore/:historyId', async (req, res, next) => {
  try {
    const { historyId } = req.params;
    const { restoredBy } = req.body;
    const result = await duplicateMergerService.restoreMerge({
      historyId,
      restoredBy: restoredBy || 'admin',
    });
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/companies/:id
 * Fetch single company record by ID
 */
router.get('/companies/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await duplicateMergerService.getCompanyById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: `Company #${id} not found.` });
    }
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/duplicate-merger/contacts/:id
 * Fetch single contact record by ID
 */
router.get('/contacts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await duplicateMergerService.getContactById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: `Contact #${id} not found.` });
    }
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/companies/merge-pair
 * Merge duplicate company into original company using parent/child field rule
 */
router.post('/companies/merge-pair', async (req, res, next) => {
  try {
    const { originalId, duplicateId, mergedBy, notes } = req.body;
    const result = await duplicateMergerService.mergePairCompanies({
      originalId,
      duplicateId,
      mergedBy: mergedBy || 'admin',
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/duplicate-merger/contacts/merge-pair
 * Merge duplicate contact into original contact using parent/child field rule
 */
router.post('/contacts/merge-pair', async (req, res, next) => {
  try {
    const { originalId, duplicateId, mergedBy, notes } = req.body;
    const result = await duplicateMergerService.mergePairContacts({
      originalId,
      duplicateId,
      mergedBy: mergedBy || 'admin',
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

