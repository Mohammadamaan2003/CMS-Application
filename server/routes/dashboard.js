const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const localStore = require('../services/localStore');
const dashboardService = require('../services/dashboardService');
const leadDashboardService = require('../services/leadDashboardService');
const companyDashboardService = require('../services/companyDashboardService');

function parseQueryParams(query) {
  const parsed = {};
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined || val === null || val === '') continue;
    const cleanKey = key.replace(/\[\]$/, '');
    if (Array.isArray(val)) {
      parsed[cleanKey] = val;
    } else if (typeof val === 'string' && val.includes(',') && !val.startsWith('(')) {
      parsed[cleanKey] = val.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      parsed[cleanKey] = val;
    }
  }
  return parsed;
}

/**
 * GET /api/dashboard/stats
 * Provides overview statistics for the CRM dashboard.
 */
router.get('/stats', async (req, res, next) => {
  try {
    let totalCompanies = 0;
    let totalContacts = 0;
    let totalLeads = 0;
    let assignedContacts = 0;
    let recentCompanies = [];
    let recentContacts = [];

    try {
      const [
        companiesCountRes,
        contactsCountRes,
        assignedContactsRes,
        leadsCountRes,
        recentCompaniesRes,
        recentContactsRes,
      ] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM companies`),
        db.query(`SELECT COUNT(*)::int AS total FROM contacts`),
        db.query(`SELECT COUNT(*)::int AS total FROM contacts WHERE company_id IS NOT NULL OR comp_id IS NOT NULL`),
        db.query(`SELECT COUNT(*)::int AS total FROM leads`),
        db.query(`
          SELECT id, COALESCE(comp_name, name) AS name, industry, country 
          FROM companies 
          ORDER BY id DESC 
          LIMIT 5
        `),
        db.query(`
          SELECT 
            ct.id, 
            ct.contact_name,
            COALESCE(ct.comp_email, ct.email) AS email, 
            ct.designation,
            COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name) AS company_name 
          FROM contacts ct
          LEFT JOIN companies c ON (ct.company_id = c.id OR ct.comp_id = c.id)
          ORDER BY ct.id DESC 
          LIMIT 5
        `),
      ]);

      totalCompanies = companiesCountRes.rows[0].total;
      totalContacts = contactsCountRes.rows[0].total;
      assignedContacts = assignedContactsRes.rows[0].total;
      totalLeads = leadsCountRes?.rows[0]?.total || 0;
      recentCompanies = recentCompaniesRes.rows;
      recentContacts = recentContactsRes.rows;
    } catch (e) {
      console.warn('[Dashboard stats] DB query note:', e.message);
    }

    if (totalCompanies === 0) {
      // Use localStore containing all 1000 records
      const localStats = localStore.getDashboardStats();
      totalCompanies = localStats.totalCompanies;
      totalContacts = localStats.totalContacts;
      assignedContacts = localStats.assignedContacts;
      recentCompanies = localStats.recentCompanies;
      recentContacts = localStats.recentContacts;
    }

    const unassignedContacts = Math.max(0, totalContacts - assignedContacts);

    res.json({
      success: true,
      data: {
        totalCompanies,
        totalContacts,
        totalLeads,
        assignedContacts,
        unassignedContacts,
        recentCompanies,
        recentContacts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/filter-options
 * Provides distinct values for dashboard dropdown filters
 */
router.get('/filter-options', async (req, res, next) => {
  try {
    const options = await dashboardService.getFilterOptions();
    res.json({
      success: true,
      data: options,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/analytics
 * Provides deep-dive aggregated metrics and distributions for CRM & Sales Dashboards
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const analytics = await dashboardService.getDashboardAnalytics(req.query);
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/filter-options
 * Fetches distinct dropdown values for all 19 APEX Page 77 filters
 */
router.get('/lead/filter-options', async (req, res, next) => {
  try {
    const options = await leadDashboardService.getLeadFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/overview
 * Overview KPIs, Donut Chart, Lost Reason Bar, Monthly Line, Month Bar, Decomposition Tree
 */
router.get('/lead/overview', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const data = await leadDashboardService.getLeadOverview(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/sales-performance
 * Sales performance metrics, account manager volume, and leads by contact report
 */
router.get('/lead/sales-performance', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const data = await leadDashboardService.getLeadSalesPerformance(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/technology
 * Technology by total leads and Countries by Technology report
 */
router.get('/lead/technology', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const data = await leadDashboardService.getLeadTechnology(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/details-report
 * Paginated interactive Lead Details report
 */
router.get('/lead/details-report', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 25,
      search: req.query.search || '',
    };
    const data = await leadDashboardService.getLeadDetailsReport(filters, pagination);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/lines-report
 * Paginated Lead Lines Details report
 */
router.get('/lead/lines-report', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 25,
      search: req.query.search || '',
    };
    const data = await leadDashboardService.getLeadLinesReport(filters, pagination);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/proposals-report
 * Paginated Lead Proposals report
 */
router.get('/lead/proposals-report', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 25,
      search: req.query.search || '',
    };
    const data = await leadDashboardService.getLeadProposalsReport(filters, pagination);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/lead/resources-report
 * Paginated Lead Resources report
 */
router.get('/lead/resources-report', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 25,
      search: req.query.search || '',
    };
    const data = await leadDashboardService.getLeadResourcesReport(filters, pagination);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/company/filter-options
 * Fetches distinct dropdown values for all 21 APEX Page 74 Company Dashboard filters
 */
router.get('/company/filter-options', async (req, res, next) => {
  try {
    const options = await companyDashboardService.getCompanyDashboardFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/company/kpis
 * Returns Company Count and Contact Count
 */
router.get('/company/kpis', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const kpis = await companyDashboardService.getCompanyDashboardKpis(filters);
    res.json({ success: true, data: kpis });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/company/report
 * Returns paginated report data for any of the 11 tabs
 */
router.get('/company/report', async (req, res, next) => {
  try {
    const filters = parseQueryParams(req.query);
    const tabId = req.query.tabId || 'company_contact_details';
    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: req.query.pageSize === 'all' ? 'all' : (parseInt(req.query.pageSize, 10) || 50),
      search: req.query.search || '',
    };
    const data = await companyDashboardService.getCompanyDashboardReport(tabId, filters, pagination);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
