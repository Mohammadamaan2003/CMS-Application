const db = require('../server/db/pool');

function buildLeadWhere(filters, alias = 'l') {
  const where = [];
  const params = [];

  const addCondition = (col, val, isLeadLine = false, lineCol = '') => {
    if (!val) return;
    const vals = Array.isArray(val) ? val.filter(v => v !== null && v !== '') : [val];
    if (vals.length === 0) return;

    if (isLeadLine) {
      params.push(vals.map(v => String(v).trim().toLowerCase()));
      where.push(`EXISTS (SELECT 1 FROM lead_lines ll WHERE ll.lead_id = ${alias}.lead_id AND LOWER(TRIM(ll.${lineCol})) = ANY($${params.length}))`);
    } else {
      params.push(vals.map(v => String(v).trim().toLowerCase()));
      where.push(`LOWER(TRIM(${alias}.${col})) = ANY($${params.length})`);
    }
  };

  addCondition('company_name', filters.company_name);
  addCondition('name_of_coordinator', filters.name_of_coordinator);
  addCondition('lead_type', filters.lead_type);
  addCondition('industry', filters.industry);
  addCondition('account_manager', filters.account_manager);
  addCondition('source', filters.source);
  addCondition('country', filters.country);
  addCondition('company_type', filters.company_type);
  addCondition('status', filters.status);
  addCondition('lost_won', filters.lost_won);
  addCondition('city', filters.city);
  addCondition('probability', filters.probability);
  addCondition('proposal', filters.proposal);
  addCondition('connection_sent', filters.connection_sent);

  if (filters.model) addCondition('', filters.model, true, 'model');
  if (filters.required_service) addCondition('', filters.required_service, true, 'required_service');
  if (filters.cv_sent) addCondition('', filters.cv_sent, true, 'cv_sent');

  if (filters.technology) {
    const techVals = Array.isArray(filters.technology) ? filters.technology : [filters.technology];
    params.push(techVals.map(v => String(v).trim().toLowerCase()));
    where.push(`(
      LOWER(TRIM(${alias}.technology)) = ANY($${params.length})
      OR EXISTS (
        SELECT 1 FROM lead_lines ll 
        LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
        WHERE ll.lead_id = ${alias}.lead_id 
          AND (
            LOWER(TRIM(COALESCE(mt.technology, ''))) = ANY($${params.length})
            OR LOWER(TRIM(COALESCE(ll.technology_required, ''))) = ANY($${params.length})
          )
      )
    )`);
  }

  if (filters.year_from) {
    params.push(parseInt(filters.year_from, 10));
    where.push(`${alias}.year >= $${params.length}`);
  }
  if (filters.year_to) {
    params.push(parseInt(filters.year_to, 10));
    where.push(`${alias}.year <= $${params.length}`);
  }
  if (filters.start_date) {
    params.push(filters.start_date);
    where.push(`
      CASE 
        WHEN ${alias}.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(${alias}.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END >= $${params.length}::date
    `);
  }
  if (filters.end_date) {
    params.push(filters.end_date);
    where.push(`
      CASE 
        WHEN ${alias}.lead_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(${alias}.lead_date, 'DD/MM/YYYY')
        ELSE NULL 
      END <= $${params.length}::date
    `);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { whereClause, params };
}

async function testFilterBuilder() {
  try {
    // Test 1: Empty filters
    const f1 = buildLeadWhere({});
    const res1 = await db.query(`SELECT COUNT(*) as count FROM leads l ${f1.whereClause}`, f1.params);
    console.log('Test 1 (empty):', res1.rows[0].count);

    // Test 2: Country + Account Manager
    const f2 = buildLeadWhere({ country: ['USA', 'India'], account_manager: 'Heena Naaz' });
    const res2 = await db.query(`SELECT COUNT(*) as count FROM leads l ${f2.whereClause}`, f2.params);
    console.log('Test 2 (country + mgr):', res2.rows[0].count);

    // Test 3: Tech filter + cv_sent
    const f3 = buildLeadWhere({ technology: 'Salesforce', cv_sent: 'Yes' });
    const res3 = await db.query(`SELECT COUNT(*) as count FROM leads l ${f3.whereClause}`, f3.params);
    console.log('Test 3 (tech + cv_sent):', res3.rows[0].count);

    // Test 4: Year range
    const f4 = buildLeadWhere({ year_from: 2024, year_to: 2026 });
    const res4 = await db.query(`SELECT COUNT(*) as count FROM leads l ${f4.whereClause}`, f4.params);
    console.log('Test 4 (year 2024-2026):', res4.rows[0].count);

    process.exit(0);
  } catch (err) {
    console.error('Filter test failed:', err);
    process.exit(1);
  }
}

testFilterBuilder();
