const db = require('../db/pool');

/**
 * Service to calculate server-side aggregated metrics for the CRM Dashboard.
 * Operates strictly on local PostgreSQL database (crm_db).
 */

/**
 * Fetch filter dropdown options (distinct countries, industries, account managers, years)
 */
async function getFilterOptions() {
  const [countriesRes, industriesRes, managersRes, yearsRes] = await Promise.all([
    db.query(`
      SELECT DISTINCT country 
      FROM (
        SELECT country FROM companies WHERE country IS NOT NULL AND TRIM(country) != ''
        UNION
        SELECT country FROM contacts WHERE country IS NOT NULL AND TRIM(country) != ''
        UNION
        SELECT country FROM leads WHERE country IS NOT NULL AND TRIM(country) != ''
      ) combined
      ORDER BY country ASC
    `),
    db.query(`
      SELECT DISTINCT industry 
      FROM (
        SELECT industry FROM companies WHERE industry IS NOT NULL AND TRIM(industry) != ''
        UNION
        SELECT industry FROM contacts WHERE industry IS NOT NULL AND TRIM(industry) != ''
        UNION
        SELECT industry FROM leads WHERE industry IS NOT NULL AND TRIM(industry) != ''
      ) combined
      ORDER BY industry ASC
    `),
    db.query(`
      SELECT DISTINCT account_manager 
      FROM leads 
      WHERE account_manager IS NOT NULL AND TRIM(account_manager) != ''
      ORDER BY account_manager ASC
    `),
    db.query(`
      SELECT DISTINCT year 
      FROM leads 
      WHERE year IS NOT NULL AND year > 2000
      ORDER BY year DESC
    `)
  ]);

  return {
    countries: countriesRes.rows.map(r => r.country),
    industries: industriesRes.rows.map(r => r.industry),
    accountManagers: managersRes.rows.map(r => r.account_manager),
    years: yearsRes.rows.map(r => r.year)
  };
}

/**
 * Fetch comprehensive dashboard analytics and breakdown distributions
 */
async function getDashboardAnalytics(filters = {}) {
  const {
    startDate,
    endDate,
    year,
    country,
    industry,
    accountManager,
  } = filters;

  // 1. Build Company Query Where Clauses
  const compWhere = [];
  const compParams = [];

  if (country && country.trim()) {
    compParams.push(country.trim().toLowerCase());
    compWhere.push(`LOWER(TRIM(c.country)) = $${compParams.length}`);
  }
  if (industry && industry.trim()) {
    compParams.push(industry.trim().toLowerCase());
    compWhere.push(`LOWER(TRIM(c.industry)) = $${compParams.length}`);
  }
  if (accountManager && accountManager.trim()) {
    compParams.push(accountManager.trim().toLowerCase());
    compWhere.push(`LOWER(TRIM(COALESCE(c.salesperson, ''))) = $${compParams.length}`);
  }
  if (startDate && startDate.trim()) {
    compParams.push(startDate.trim());
    compWhere.push(`c.created_at::date >= $${compParams.length}::date`);
  }
  if (endDate && endDate.trim()) {
    compParams.push(endDate.trim());
    compWhere.push(`c.created_at::date <= $${compParams.length}::date`);
  }

  const compWhereClause = compWhere.length > 0 ? `WHERE ${compWhere.join(' AND ')}` : '';

  // 2. Build Contact Query Where Clauses
  const contWhere = [];
  const contParams = [];

  if (country && country.trim()) {
    contParams.push(country.trim().toLowerCase());
    contWhere.push(`LOWER(TRIM(ct.country)) = $${contParams.length}`);
  }
  if (industry && industry.trim()) {
    contParams.push(industry.trim().toLowerCase());
    contWhere.push(`LOWER(TRIM(ct.industry)) = $${contParams.length}`);
  }
  if (accountManager && accountManager.trim()) {
    contParams.push(accountManager.trim().toLowerCase());
    contWhere.push(`LOWER(TRIM(COALESCE(ct.salesperson, ''))) = $${contParams.length}`);
  }
  if (startDate && startDate.trim()) {
    contParams.push(startDate.trim());
    contWhere.push(`ct.created_at::date >= $${contParams.length}::date`);
  }
  if (endDate && endDate.trim()) {
    contParams.push(endDate.trim());
    contWhere.push(`ct.created_at::date <= $${contParams.length}::date`);
  }

  const contWhereClause = contWhere.length > 0 ? `WHERE ${contWhere.join(' AND ')}` : '';

  // 3. Build Lead Query Where Clauses
  const leadWhere = [];
  const leadParams = [];

  if (country && country.trim()) {
    leadParams.push(country.trim().toLowerCase());
    leadWhere.push(`LOWER(TRIM(l.country)) = $${leadParams.length}`);
  }
  if (industry && industry.trim()) {
    leadParams.push(industry.trim().toLowerCase());
    leadWhere.push(`LOWER(TRIM(l.industry)) = $${leadParams.length}`);
  }
  if (accountManager && accountManager.trim()) {
    leadParams.push(accountManager.trim().toLowerCase());
    leadWhere.push(`LOWER(TRIM(l.account_manager)) = $${leadParams.length}`);
  }
  if (year && String(year).trim()) {
    leadParams.push(parseInt(year, 10));
    leadWhere.push(`l.year = $${leadParams.length}`);
  }
  if (startDate && startDate.trim()) {
    leadParams.push(startDate.trim());
    leadWhere.push(`
      CASE 
        WHEN l.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(l.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END >= $${leadParams.length}::date
    `);
  }
  if (endDate && endDate.trim()) {
    leadParams.push(endDate.trim());
    leadWhere.push(`
      CASE 
        WHEN l.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(l.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END <= $${leadParams.length}::date
    `);
  }

  const leadWhereClause = leadWhere.length > 0 ? `WHERE ${leadWhere.join(' AND ')}` : '';

  // Run all analytical queries in parallel
  const [
    // Summary KPI Totals
    totalCompaniesRes,
    totalContactsRes,
    leadsKpiRes,

    // Company Breakdowns
    compByCountryRes,
    compByIndustryRes,
    compByTypeRes,
    compBySizeRes,

    // Contact Breakdowns
    contByCountryRes,
    contByCompanyRes,
    contByDesignationRes,
    contBySourceRes,

    // Lead Breakdowns
    leadByStageRes,
    leadBySourceRes,
    leadByManagerRes,
    leadByYearRes,
  ] = await Promise.all([
    // Company Total
    db.query(`SELECT COUNT(*)::int AS count FROM companies c ${compWhereClause}`, compParams),

    // Contact Total & Assigned
    db.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE company_id IS NOT NULL OR comp_id IS NOT NULL)::int AS assigned
      FROM contacts ct
      ${contWhereClause}
    `, contParams),

    // Leads Pipeline & Win Rates
    db.query(`
      SELECT 
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(lost_won, ''))) = 'won')::int AS won_leads,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(lost_won, ''))) = 'open')::int AS open_leads,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(lost_won, ''))) = 'lost')::int AS lost_leads,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(lost_won, ''))) = 'on hold')::int AS on_hold_leads,
        COALESCE(SUM(amount_in_inr), 0)::numeric AS total_pipeline_inr,
        COALESCE(SUM(amount_in_inr) FILTER (WHERE LOWER(TRIM(COALESCE(lost_won, ''))) = 'won'), 0)::numeric AS won_pipeline_inr,
        COUNT(*) FILTER (WHERE amount_in_inr > 0)::int AS deals_with_value_count
      FROM leads l
      ${leadWhereClause}
    `, leadParams),

    // 1. Companies by Country
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(c.country), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM companies c
      ${compWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, compParams),

    // 2. Companies by Industry
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(c.industry), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM companies c
      ${compWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, compParams),

    // 3. Companies by Company Type
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(c.company_type), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM companies c
      ${compWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 6
    `, compParams),

    // 4. Companies by Employee Size
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(c.employee_size), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM companies c
      ${compWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 6
    `, compParams),

    // 5. Contacts by Country
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(ct.country), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM contacts ct
      ${contWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, contParams),

    // 6. Contacts by Company
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(COALESCE(c.comp_name, c.name, ct.comp_name, ct.company_name)), ''), 'Unassigned') AS label,
        COUNT(*)::int AS count
      FROM contacts ct
      LEFT JOIN companies c ON (ct.company_id = c.id OR ct.comp_id = c.id)
      ${contWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, contParams),

    // 7. Contacts by Designation
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(ct.designation), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM contacts ct
      ${contWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, contParams),

    // 8. Contacts by Source
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(ct.source), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM contacts ct
      ${contWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, contParams),

    // 9. Leads by Status / Stage
    db.query(`
      SELECT 
        CASE 
          WHEN LOWER(TRIM(COALESCE(l.lost_won, ''))) = 'won' THEN 'Won'
          WHEN LOWER(TRIM(COALESCE(l.lost_won, ''))) = 'lost' THEN 'Lost'
          WHEN LOWER(TRIM(COALESCE(l.lost_won, ''))) = 'open' THEN 'Open'
          WHEN LOWER(TRIM(COALESCE(l.lost_won, ''))) = 'on hold' THEN 'On Hold'
          ELSE 'Unassigned'
        END AS label,
        COUNT(*)::int AS count
      FROM leads l
      ${leadWhereClause}
      GROUP BY 1
      ORDER BY count DESC
    `, leadParams),

    // 10. Leads by Source
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.source), ''), 'Unspecified') AS label,
        COUNT(*)::int AS count
      FROM leads l
      ${leadWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, leadParams),

    // 11. Leads by Account Manager
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') AS label,
        COUNT(*)::int AS count
      FROM leads l
      ${leadWhereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `, leadParams),

    // 12. Leads by Year / Trend
    db.query(`
      SELECT 
        COALESCE(l.year::text, 'Unknown') AS label,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(l.lost_won, ''))) = 'won')::int AS won_count
      FROM leads l
      ${leadWhereClause}
      GROUP BY 1
      ORDER BY label ASC
    `, leadParams),
  ]);

  const leadsKpi = leadsKpiRes.rows[0] || {};
  const totalLeads = leadsKpi.total_leads || 0;
  const wonLeads = leadsKpi.won_leads || 0;
  const openLeads = leadsKpi.open_leads || 0;
  const lostLeads = leadsKpi.lost_leads || 0;
  const onHoldLeads = leadsKpi.on_hold_leads || 0;
  const closedLeads = wonLeads + lostLeads;

  // Conversion rate calculations:
  // 1. Overall win rate = won / total leads
  const overallWinRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;
  // 2. Closed-deal conversion rate = won / (won + lost)
  const closedWinRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 1000) / 10 : 0;

  return {
    refreshedAt: new Date().toISOString(),
    appliedFilters: {
      startDate: startDate || null,
      endDate: endDate || null,
      year: year || null,
      country: country || null,
      industry: industry || null,
      accountManager: accountManager || null,
    },
    kpis: {
      companies: {
        total: totalCompaniesRes.rows[0]?.count || 0,
        label: 'Total Registered Companies',
        subtext: 'Corporate accounts in database',
        dateFieldUsed: 'companies.created_at',
      },
      contacts: {
        total: totalContactsRes.rows[0]?.total || 0,
        assigned: totalContactsRes.rows[0]?.assigned || 0,
        unassigned: Math.max(0, (totalContactsRes.rows[0]?.total || 0) - (totalContactsRes.rows[0]?.assigned || 0)),
        label: 'Total Contacts',
        subtext: 'Individual decision-makers & stakeholders',
        dateFieldUsed: 'contacts.created_at',
      },
      leads: {
        total: totalLeads,
        won: wonLeads,
        open: openLeads,
        lost: lostLeads,
        onHold: onHoldLeads,
        overallWinRate,
        closedWinRate,
        totalPipelineInr: parseFloat(leadsKpi.total_pipeline_inr || 0),
        wonPipelineInr: parseFloat(leadsKpi.won_pipeline_inr || 0),
        dealsWithValueCount: leadsKpi.deals_with_value_count || 0,
        label: 'Total Sales Leads',
        subtext: 'Pipeline opportunities in database',
        dateFieldUsed: 'leads.lead_date & leads.year',
      },
    },
    breakdowns: {
      companies: {
        byCountry: compByCountryRes.rows,
        byIndustry: compByIndustryRes.rows,
        byType: compByTypeRes.rows,
        bySize: compBySizeRes.rows,
      },
      contacts: {
        byCountry: contByCountryRes.rows,
        byCompany: contByCompanyRes.rows,
        byDesignation: contByDesignationRes.rows,
        bySource: contBySourceRes.rows,
      },
      leads: {
        byStage: leadByStageRes.rows,
        bySource: leadBySourceRes.rows,
        byAccountManager: leadByManagerRes.rows,
        byYear: leadByYearRes.rows,
      },
    },
  };
}

module.exports = {
  getFilterOptions,
  getDashboardAnalytics,
};
