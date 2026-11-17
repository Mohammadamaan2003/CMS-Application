const db = require('../db/pool');

/**
 * Service to calculate server-side aggregated metrics for the APEX Page 77 Lead Dashboard.
 * Operates strictly on local PostgreSQL database (crm_db).
 */

/**
 * Build parameterized SQL WHERE clause for lead queries.
 * Handles both single string/values and multi-select arrays.
 * Employs EXISTS subqueries for lead_lines to prevent row duplication.
 */
function buildLeadFilterClauses(filters = {}, alias = 'l') {
  const where = [];
  const params = [];

  const addParam = (val) => {
    params.push(val);
    return `$${params.length}`;
  };

  const addArrayCondition = (columnName, val, isLeadLine = false, lineCol = '') => {
    if (!val) return;
    const vals = (Array.isArray(val) ? val : [val])
      .map((v) => (v !== null && v !== undefined ? String(v).trim() : ''))
      .filter((v) => v !== '' && v.toLowerCase() !== 'all');

    if (vals.length === 0) return;

    const lowerVals = vals.map((v) => v.toLowerCase());
    const pIdx = addParam(lowerVals);

    if (isLeadLine) {
      where.push(
        `EXISTS (SELECT 1 FROM lead_lines ll WHERE ll.lead_id = ${alias}.lead_id AND LOWER(TRIM(COALESCE(ll.${lineCol}, ''))) = ANY(${pIdx}))`
      );
    } else {
      where.push(`LOWER(TRIM(COALESCE(${alias}.${columnName}, ''))) = ANY(${pIdx})`);
    }
  };

  // Direct Lead Column Filters
  addArrayCondition('company_name', filters.company_name);
  addArrayCondition('name_of_coordinator', filters.name_of_coordinator);
  addArrayCondition('lead_type', filters.lead_type);
  addArrayCondition('industry', filters.industry);
  addArrayCondition('account_manager', filters.account_manager);
  addArrayCondition('source', filters.source);
  addArrayCondition('country', filters.country);
  addArrayCondition('company_type', filters.company_type);
  addArrayCondition('status', filters.status);
  addArrayCondition('lost_won', filters.lost_won);
  addArrayCondition('city', filters.city);
  addArrayCondition('probability', filters.probability);
  addArrayCondition('proposal', filters.proposal);
  addArrayCondition('connection_sent', filters.connection_sent);

  // Lead Line Table Filters
  if (filters.model) addArrayCondition('', filters.model, true, 'model');
  if (filters.required_service) addArrayCondition('', filters.required_service, true, 'required_service');
  if (filters.cv_sent) addArrayCondition('', filters.cv_sent, true, 'cv_sent');

  // Technology Filter (Checks both leads.technology and lead_lines.technology / master_technologies)
  if (filters.technology) {
    const techVals = (Array.isArray(filters.technology) ? filters.technology : [filters.technology])
      .map((v) => String(v).trim().toLowerCase())
      .filter((v) => v !== '' && v !== 'all');

    if (techVals.length > 0) {
      const pIdx = addParam(techVals);
      where.push(`(
        LOWER(TRIM(COALESCE(${alias}.technology, ''))) = ANY(${pIdx})
        OR EXISTS (
          SELECT 1 FROM lead_lines ll 
          LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
          WHERE ll.lead_id = ${alias}.lead_id 
            AND (
              LOWER(TRIM(COALESCE(mt.technology, ''))) = ANY(${pIdx})
              OR LOWER(TRIM(COALESCE(ll.technology_required, ''))) = ANY(${pIdx})
            )
        )
      )`);
    }
  }

  // Year Boundaries
  if (filters.year_from && !isNaN(parseInt(filters.year_from, 10))) {
    const pIdx = addParam(parseInt(filters.year_from, 10));
    where.push(`${alias}.year >= ${pIdx}`);
  }
  if (filters.year_to && !isNaN(parseInt(filters.year_to, 10))) {
    const pIdx = addParam(parseInt(filters.year_to, 10));
    where.push(`${alias}.year <= ${pIdx}`);
  }

  // Date Boundaries (Parsed from DD/MM/YYYY)
  if (filters.start_date && String(filters.start_date).trim()) {
    const pIdx = addParam(String(filters.start_date).trim());
    where.push(`
      CASE 
        WHEN ${alias}.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(${alias}.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END >= ${pIdx}::date
    `);
  }
  if (filters.end_date && String(filters.end_date).trim()) {
    const pIdx = addParam(String(filters.end_date).trim());
    where.push(`
      CASE 
        WHEN ${alias}.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(${alias}.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END <= ${pIdx}::date
    `);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * 1. Fetch Distinct Dropdown Options for all APEX Page 77 Filters
 */
async function getLeadFilterOptions() {
  const [
    companiesRes,
    coordinatorsRes,
    leadTypesRes,
    industriesRes,
    managersRes,
    sourcesRes,
    countriesRes,
    companyTypesRes,
    statusesRes,
    lostWonRes,
    citiesRes,
    probabilitiesRes,
    technologiesRes,
    modelsRes,
    requiredServicesRes,
    yearsRes,
  ] = await Promise.all([
    db.query(`SELECT DISTINCT company_name FROM leads WHERE company_name IS NOT NULL AND TRIM(company_name) != '' ORDER BY company_name ASC`),
    db.query(`SELECT DISTINCT name_of_coordinator FROM leads WHERE name_of_coordinator IS NOT NULL AND TRIM(name_of_coordinator) != '' ORDER BY name_of_coordinator ASC`),
    db.query(`SELECT DISTINCT lead_type FROM leads WHERE lead_type IS NOT NULL AND TRIM(lead_type) != '' ORDER BY lead_type ASC`),
    db.query(`SELECT DISTINCT industry FROM leads WHERE industry IS NOT NULL AND TRIM(industry) != '' ORDER BY industry ASC`),
    db.query(`SELECT DISTINCT account_manager FROM leads WHERE account_manager IS NOT NULL AND TRIM(account_manager) != '' ORDER BY account_manager ASC`),
    db.query(`SELECT DISTINCT source FROM leads WHERE source IS NOT NULL AND TRIM(source) != '' ORDER BY source ASC`),
    db.query(`SELECT DISTINCT country FROM leads WHERE country IS NOT NULL AND TRIM(country) != '' ORDER BY country ASC`),
    db.query(`SELECT DISTINCT company_type FROM leads WHERE company_type IS NOT NULL AND TRIM(company_type) != '' ORDER BY company_type ASC`),
    db.query(`SELECT DISTINCT status FROM leads WHERE status IS NOT NULL AND TRIM(status) != '' ORDER BY status ASC LIMIT 100`),
    db.query(`SELECT DISTINCT lost_won FROM leads WHERE lost_won IS NOT NULL AND TRIM(lost_won) != '' ORDER BY lost_won ASC`),
    db.query(`SELECT DISTINCT city FROM leads WHERE city IS NOT NULL AND TRIM(city) != '' ORDER BY city ASC`),
    db.query(`SELECT DISTINCT probability FROM leads WHERE probability IS NOT NULL AND TRIM(probability) != '' ORDER BY probability ASC`),
    db.query(`
      SELECT DISTINCT tech_name FROM (
        SELECT technology AS tech_name FROM master_technologies WHERE technology IS NOT NULL AND TRIM(technology) != ''
        UNION
        SELECT technology AS tech_name FROM leads WHERE technology IS NOT NULL AND TRIM(technology) != ''
        UNION
        SELECT technology_required AS tech_name FROM lead_lines WHERE technology_required IS NOT NULL AND TRIM(technology_required) != ''
      ) t ORDER BY tech_name ASC
    `),
    db.query(`SELECT DISTINCT model FROM lead_lines WHERE model IS NOT NULL AND TRIM(model) != '' ORDER BY model ASC`),
    db.query(`SELECT DISTINCT required_service FROM lead_lines WHERE required_service IS NOT NULL AND TRIM(required_service) != '' ORDER BY required_service ASC`),
    db.query(`SELECT DISTINCT year FROM leads WHERE year IS NOT NULL AND year > 2000 ORDER BY year ASC`),
  ]);

  return {
    companies: companiesRes.rows.map((r) => r.company_name),
    coordinators: coordinatorsRes.rows.map((r) => r.name_of_coordinator),
    leadTypes: leadTypesRes.rows.map((r) => r.lead_type),
    industries: industriesRes.rows.map((r) => r.industry),
    accountManagers: managersRes.rows.map((r) => r.account_manager),
    sources: sourcesRes.rows.map((r) => r.source),
    countries: countriesRes.rows.map((r) => r.country),
    companyTypes: companyTypesRes.rows.map((r) => r.company_type),
    statuses: statusesRes.rows.map((r) => r.status),
    lostWon: lostWonRes.rows.map((r) => r.lost_won),
    cities: citiesRes.rows.map((r) => r.city),
    probabilities: probabilitiesRes.rows.map((r) => r.probability),
    proposals: ['Yes', 'No'],
    technologies: technologiesRes.rows.map((r) => r.tech_name),
    models: modelsRes.rows.map((r) => r.model),
    requiredServices: requiredServicesRes.rows.map((r) => r.required_service),
    connectionSent: ['Yes', 'No'],
    cvSent: ['Yes', 'No'],
    years: yearsRes.rows.map((r) => r.year),
  };
}

/**
 * 2. Fetch Overview Metrics & Charts (KPIs, Status Donut, Lost Reason Bar, Monthly Line, Month Bar, Decomposition Tree)
 */
async function getLeadOverview(filters = {}) {
  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  const [
    kpiRes,
    leadsBySourceRes,
    wonLeadsBySourceRes,
    statusDonutRes,
    lostReasonRes,
    monthlyYearRes,
    monthRes,
    techDistRes,
    managerDistRes,
  ] = await Promise.all([
    // Overview KPIs
    db.query(`
      SELECT 
        COUNT(DISTINCT l.lead_id)::int as total_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::int as won_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'OPEN' THEN l.lead_id END)::int as open_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'ON HOLD' THEN l.lead_id END)::int as on_hold_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'LOST' THEN l.lead_id END)::int as lost_leads,
        ROUND(
          COALESCE(
            COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::numeric / 
            NULLIF(COUNT(DISTINCT l.lead_id), 0) * 100, 
            0
          ), 
          1
        )::float as win_rate,
        COALESCE(SUM(l.amount_in_inr), 0)::numeric as contract_value_inr,
        ROUND(
          AVG(
            CASE 
              WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) IN ('WON', 'LOST') 
                AND l.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
                AND l.modified_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
              THEN (TO_DATE(l.modified_date, 'DD-MON-YYYY') - TO_DATE(l.lead_date, 'DD/MM/YYYY'))
              ELSE NULL 
            END
          ), 
          1
        )::float as avg_time_to_close_days
      FROM leads l
      ${whereClause}
    `, params),

    // Total Leads by Source (matching Screenshot 1)
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.source), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 12
    `, params),

    // Won Leads by Source (matching Screenshot 1)
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.source), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause ? `${whereClause} AND UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON'` : "WHERE UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON'"}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 12
    `, params),

    // Status Donut
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.lost_won), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
    `, params),

    // Lost by Reason Horizontal Bar
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.reason), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause ? `${whereClause} AND UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'LOST'` : "WHERE UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'LOST'"}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 10
    `, params),

    // Monthly Leads by Year (Line / Trend Chart)
    db.query(`
      SELECT 
        l.year::int as year,
        COALESCE(NULLIF(TRIM(l.month), ''), 'Unknown') as month,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause ? `${whereClause} AND l.year IS NOT NULL` : 'WHERE l.year IS NOT NULL'}
      GROUP BY l.year, l.month
      ORDER BY l.year ASC
    `, params),

    // Total Leads by Month
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.month), ''), 'Unknown') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
    `, params),

    // Top Technologies for Decomposition Tree
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.technology), ''), 'Other') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 5
    `, params),

    // Top Managers for Decomposition Tree
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 5
    `, params),
  ]);

  const kpis = kpiRes.rows[0] || {
    total_leads: 0,
    won_leads: 0,
    open_leads: 0,
    on_hold_leads: 0,
    lost_leads: 0,
    win_rate: 0,
    contract_value_inr: 0,
    avg_time_to_close_days: 0,
  };

  // Build Lead Decomposition Tree structure
  const totalCount = kpis.total_leads || 0;
  const decompositionTree = {
    name: 'Total Leads',
    value: totalCount,
    children: [
      {
        name: 'Lost',
        value: kpis.lost_leads || 0,
        children: lostReasonRes.rows.slice(0, 4).map((r) => ({
          name: r.label,
          value: r.count,
        })),
      },
      {
        name: 'Won',
        value: kpis.won_leads || 0,
        children: managerDistRes.rows.slice(0, 3).map((r) => ({
          name: r.label,
          value: r.count,
        })),
      },
      {
        name: 'Open',
        value: kpis.open_leads || 0,
        children: techDistRes.rows.slice(0, 3).map((r) => ({
          name: r.label,
          value: r.count,
        })),
      },
      {
        name: 'On Hold',
        value: kpis.on_hold_leads || 0,
      },
    ],
  };

  return {
    kpis: {
      totalLeads: kpis.total_leads,
      wonLeads: kpis.won_leads,
      openLeads: kpis.open_leads,
      onHoldLeads: kpis.on_hold_leads,
      lostLeads: kpis.lost_leads,
      winRate: kpis.win_rate,
      contractValueInr: parseFloat(kpis.contract_value_inr),
      avgTimeToCloseDays: kpis.avg_time_to_close_days,
    },
    charts: {
      totalLeadsBySource: leadsBySourceRes.rows,
      wonLeadsBySource: wonLeadsBySourceRes.rows,
      statusDonut: statusDonutRes.rows,
      lostByReason: lostReasonRes.rows,
      monthlyLeadsByYear: monthlyYearRes.rows,
      totalLeadsByMonth: monthRes.rows,
      decompositionTree,
    },
    refreshedAt: new Date().toISOString(),
  };
}

/**
 * 3. Fetch Sales Performance Section
 */
async function getLeadSalesPerformance(filters = {}) {
  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  const [mgrBarRes, monthlyMgrRes, salesTeamRes, contactsRes] = await Promise.all([
    // Total Leads by Account Manager
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') as label,
        COUNT(DISTINCT l.lead_id)::int as count,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::int as won_count,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.amount_in_inr ELSE 0 END), 0)::numeric as won_inr
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
    `, params),

    // Monthly Leads by Account Manager
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') as account_manager,
        COALESCE(NULLIF(TRIM(l.month), ''), 'Unknown') as month,
        l.year::int as year,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      ${whereClause}
      GROUP BY 1, 2, 3
      ORDER BY 1, 3 ASC
      LIMIT 100
    `, params),

    // Sales Team Performance Detailed Table
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') as salesperson,
        COUNT(DISTINCT l.lead_id)::int as total_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::int as won_deals,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'OPEN' THEN l.lead_id END)::int as open_deals,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'LOST' THEN l.lead_id END)::int as lost_deals,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'ON HOLD' THEN l.lead_id END)::int as on_hold_deals,
        ROUND(
          COALESCE(
            COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::numeric / 
            NULLIF(COUNT(DISTINCT l.lead_id), 0) * 100, 
            0
          ), 
          1
        )::float as win_rate_pct,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.amount_in_inr ELSE 0 END), 0)::numeric as won_pipeline_inr,
        COALESCE(SUM(l.amount_in_inr), 0)::numeric as total_pipeline_inr
      FROM leads l
      ${whereClause}
      GROUP BY 1
      ORDER BY total_leads DESC
    `, params),

    // Leads by Contact Report
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.contacts), ''), 'Unassigned') as contact_name,
        COALESCE(NULLIF(TRIM(l.company_name), ''), 'Unknown Company') as company_name,
        COUNT(DISTINCT l.lead_id)::int as lead_count,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::int as won_count,
        COALESCE(SUM(l.amount_in_inr), 0)::numeric as total_inr
      FROM leads l
      ${whereClause ? `${whereClause} AND l.contacts IS NOT NULL AND TRIM(l.contacts) != ''` : "WHERE l.contacts IS NOT NULL AND TRIM(l.contacts) != ''"}
      GROUP BY 1, 2
      ORDER BY lead_count DESC
      LIMIT 25
    `, params),
  ]);

  return {
    totalLeadsByAccountManager: mgrBarRes.rows,
    monthlyLeadsByAccountManager: monthlyMgrRes.rows,
    salesTeamPerformance: salesTeamRes.rows,
    leadsByContact: contactsRes.rows,
  };
}

/**
 * 4. Fetch Technology Section
 */
async function getLeadTechnology(filters = {}) {
  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  const [techBarRes, countryTechRes] = await Promise.all([
    // Technology by Total Leads (Joined safely with lead_lines and master_technologies)
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(mt.technology), ''), NULLIF(TRIM(ll.technology_required), ''), NULLIF(TRIM(l.technology), ''), 'Other') as label,
        COUNT(DISTINCT l.lead_id)::int as count
      FROM leads l
      LEFT JOIN lead_lines ll ON ll.lead_id = l.lead_id
      LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
      ${whereClause}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 20
    `, params),

    // Countries by Total Leads (Grouped by Country and Technology with distinct Lead ID counts)
    db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.country), ''), 'Unspecified') as country,
        COALESCE(NULLIF(TRIM(mt.technology), ''), NULLIF(TRIM(ll.technology_required), ''), NULLIF(TRIM(l.technology), ''), 'Other') as technology_name,
        COUNT(DISTINCT l.lead_id)::int as total_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(l.lost_won, ''))) = 'WON' THEN l.lead_id END)::int as won_leads
      FROM leads l
      LEFT JOIN lead_lines ll ON ll.lead_id = l.lead_id
      LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
      ${whereClause}
      GROUP BY 1, 2
      ORDER BY total_leads DESC, country ASC
      LIMIT 50
    `, params),
  ]);

  return {
    technologyByTotalLeads: techBarRes.rows,
    countriesByTechnology: countryTechRes.rows,
  };
}

/**
 * 5. Fetch Paginated Lead Details Report
 */
async function getLeadDetailsReport(filters = {}, pagination = {}) {
  const { page = 1, pageSize = 25, search = '' } = pagination;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  let fullWhere = whereClause;
  const queryParams = [...params];

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    const sIdx = `$${queryParams.length}`;
    const searchCondition = `(
      LOWER(COALESCE(l.company_name, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.name_of_coordinator, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.account_manager, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.industry, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.country, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.technology, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.status, '')) LIKE ${sIdx}
    )`;
    fullWhere = fullWhere ? `${fullWhere} AND ${searchCondition}` : `WHERE ${searchCondition}`;
  }

  const countRes = await db.query(`SELECT COUNT(DISTINCT l.lead_id)::int as total FROM leads l ${fullWhere}`, queryParams);
  const total = countRes.rows[0]?.total || 0;

  const listParams = [...queryParams, pageSize, offset];
  const listRes = await db.query(`
    SELECT 
      l.lead_id,
      l.sr_no,
      l.company_name,
      l.company_id,
      l.name_of_coordinator,
      l.account_manager,
      l.industry,
      l.technology,
      l.lead_date,
      l.city,
      l.country,
      l.probability,
      l.lead_type,
      l.status,
      l.source,
      l.amount,
      l.amount_in_inr,
      l.proposal,
      l.connection_sent,
      l.month,
      l.year,
      l.lost_won,
      l.contacts
    FROM leads l
    ${fullWhere}
    ORDER BY l.lead_id DESC
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `, listParams);

  return {
    data: listRes.rows,
    total,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 6. Fetch Paginated Lead Lines Details Report
 */
async function getLeadLinesReport(filters = {}, pagination = {}) {
  const { page = 1, pageSize = 25, search = '' } = pagination;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  let fullWhere = whereClause;
  const queryParams = [...params];

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    const sIdx = `$${queryParams.length}`;
    const searchCondition = `(
      LOWER(COALESCE(l.company_name, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(ll.technology_required, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(ll.model, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(ll.required_service, '')) LIKE ${sIdx}
    )`;
    fullWhere = fullWhere ? `${fullWhere} AND ${searchCondition}` : `WHERE ${searchCondition}`;
  }

  const countRes = await db.query(`
    SELECT COUNT(*)::int as total 
    FROM lead_lines ll
    JOIN leads l ON l.lead_id = ll.lead_id
    ${fullWhere}
  `, queryParams);
  const total = countRes.rows[0]?.total || 0;

  const listParams = [...queryParams, pageSize, offset];
  const listRes = await db.query(`
    SELECT 
      ll.lead_line_id,
      ll.lead_id,
      ll.lead_line_no,
      l.company_name,
      COALESCE(mt.technology, ll.technology_required, ll.technology) as technology_name,
      ll.technology_required,
      ll.experience,
      ll.model,
      ll.currency_code,
      ll.rate,
      ll.no_of_resources,
      ll.duration,
      ll.amount,
      ll.amount_in_inr,
      ll.required_service,
      ll.cv_sent,
      l.lost_won
    FROM lead_lines ll
    JOIN leads l ON l.lead_id = ll.lead_id
    LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
    ${fullWhere}
    ORDER BY ll.lead_line_id DESC
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `, listParams);

  return {
    data: listRes.rows,
    total,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 7. Fetch Paginated Lead Proposals Report
 */
async function getLeadProposalsReport(filters = {}, pagination = {}) {
  const { page = 1, pageSize = 25, search = '' } = pagination;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  let fullWhere = whereClause;
  const queryParams = [...params];

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    const sIdx = `$${queryParams.length}`;
    const searchCondition = `(
      LOWER(COALESCE(lp.proposal_number, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(lp.proposal_description, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.company_name, '')) LIKE ${sIdx}
    )`;
    fullWhere = fullWhere ? `${fullWhere} AND ${searchCondition}` : `WHERE ${searchCondition}`;
  }

  const countRes = await db.query(`
    SELECT COUNT(*)::int as total
    FROM lead_proposals lp
    LEFT JOIN leads l ON l.lead_id = lp.lead_id
    ${fullWhere}
  `, queryParams);
  const total = countRes.rows[0]?.total || 0;

  const listParams = [...queryParams, pageSize, offset];
  const listRes = await db.query(`
    SELECT 
      lp.proposal_id,
      lp.lead_id,
      l.company_name,
      lp.proposal_number,
      lp.date_sent,
      lp.proposal_description,
      lp.file_name,
      lp.mime_type,
      lp.created_by,
      lp.created_date
    FROM lead_proposals lp
    LEFT JOIN leads l ON l.lead_id = lp.lead_id
    ${fullWhere}
    ORDER BY lp.proposal_id DESC
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `, listParams);

  return {
    data: listRes.rows,
    total,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 8. Fetch Paginated Lead Resources Report
 */
async function getLeadResourcesReport(filters = {}, pagination = {}) {
  const { page = 1, pageSize = 25, search = '' } = pagination;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { whereClause, params } = buildLeadFilterClauses(filters, 'l');

  let fullWhere = whereClause;
  const queryParams = [...params];

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    const sIdx = `$${queryParams.length}`;
    const searchCondition = `(
      LOWER(COALESCE(lr.resource_name, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(lr.designation, '')) LIKE ${sIdx}
      OR LOWER(COALESCE(l.company_name, '')) LIKE ${sIdx}
    )`;
    fullWhere = fullWhere ? `${fullWhere} AND ${searchCondition}` : `WHERE ${searchCondition}`;
  }

  const countRes = await db.query(`
    SELECT COUNT(*)::int as total
    FROM lead_resources lr
    LEFT JOIN leads l ON l.lead_id = lr.lead_id
    ${fullWhere}
  `, queryParams);
  const total = countRes.rows[0]?.total || 0;

  const listParams = [...queryParams, pageSize, offset];
  const listRes = await db.query(`
    SELECT 
      lr.resource_id,
      lr.lead_id,
      lr.lead_line_id,
      l.company_name,
      lr.resource_type,
      lr.resource_name,
      lr.designation,
      lr.technology,
      lr.status,
      lr.created_by,
      lr.created_date
    FROM lead_resources lr
    LEFT JOIN leads l ON l.lead_id = lr.lead_id
    ${fullWhere}
    ORDER BY lr.resource_id DESC
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `, listParams);

  return {
    data: listRes.rows,
    total,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = {
  buildLeadFilterClauses,
  getLeadFilterOptions,
  getLeadOverview,
  getLeadSalesPerformance,
  getLeadTechnology,
  getLeadDetailsReport,
  getLeadLinesReport,
  getLeadProposalsReport,
  getLeadResourcesReport,
};
