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

module.exports = router;

