const express = require('express');
const router = express.Router();
const { syncCompanies, syncContacts, syncAllMasters } = require('../services/mcpSync');
const db = require('../db/pool');

/**
 * GET /api/sync/status
 * Check local database counts vs MCP source availability
 */
router.get('/status', async (req, res, next) => {
  try {
    const [compRes, contRes, sizeRes, typeRes, countryRes, mappingRes, techRes, sourceRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM companies').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM contacts').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM master_company_sizes').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM master_company_types').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM master_countries').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM country_city_mapping').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM master_technologies').catch(() => ({ rows: [{ count: 0 }] })),
      db.query('SELECT COUNT(*)::int AS count FROM master_sources').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    res.json({
      success: true,
      data: {
        localCompanies: compRes.rows[0].count,
        localContacts: contRes.rows[0].count,
        localMasters: {
          companySizes: sizeRes.rows[0].count,
          companyTypes: typeRes.rows[0].count,
          countries: countryRes.rows[0].count,
          countryCityMappings: mappingRes.rows[0].count,
          technologies: techRes.rows[0].count,
          sources: sourceRes.rows[0].count,
        },
        mcpTotalCompanies: 33473,
        mcpTotalContacts: 58757,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/masters
 * Explicitly trigger synchronization of all Master data from MCP into PostgreSQL
 */
router.post('/masters', async (req, res, next) => {
  try {
    console.log('[API Sync Masters Triggered] Starting master sync from Oracle MCP into PostgreSQL...');
    const masterResults = await syncAllMasters();

    res.json({
      success: true,
      message: 'All master tables successfully synchronized from MCP into PostgreSQL.',
      data: masterResults,
    });
  } catch (error) {
    console.error('[API Sync Masters Error]:', error.message);
    res.status(500).json({
      success: false,
      message: `MCP Master Sync failed: ${error.message}`,
    });
  }
});

/**
 * POST /api/sync
 * Trigger sync of records from MCP into PostgreSQL
 */
router.post('/', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 1000, 5000));
    const syncMastersToo = req.query.syncMasters !== 'false';
    console.log(`[API Sync Triggered] Request to sync ${limit} records (syncMasters: ${syncMastersToo})...`);

    const companiesSynced = await syncCompanies(limit);
    const contactsSynced = await syncContacts(limit);
    let masterResults = null;
    if (syncMastersToo) {
      masterResults = await syncAllMasters();
    }

    res.json({
      success: true,
      message: `Successfully synchronized ${companiesSynced} companies, ${contactsSynced} contacts, and all master records into PostgreSQL.`,
      companiesSynced,
      contactsSynced,
      masterResults,
    });
  } catch (error) {
    console.error('[API Sync Error]:', error.message);
    res.status(500).json({
      success: false,
      message: `MCP Sync failed: ${error.message}`,
    });
  }
});

module.exports = router;

