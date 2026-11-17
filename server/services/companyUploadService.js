const { pool } = require('../db/pool');
const localStore = require('./localStore');

/**
 * Standard CSV Template with realistic sample rows matching application schema
 */
const TEMPLATE_HEADERS = [
  'Company Name',
  'Employee Size',
  'Technology',
  'Industry',
  'Company Type',
  'Company Categories',
  'City',
  'Country',
  'Company Phone',
  'Website',
  'Source',
  'Email',
  'DA',
  'Remark',
];

const TEMPLATE_SAMPLE_ROWS = [
  [
    'Acme Technologies Inc',
    '51-200 employees',
    'Node JS, React',
    'IT Services and IT Consulting',
    'IT Company',
    'Client Company',
    'San Francisco',
    'United States',
    '+1-415-555-0100',
    'https://acmetech.example.com',
    'LinkedIn',
    'contact@acmetech.example.com',
    'DA-101',
    'Enterprise software solutions partner',
  ],
  [
    'Gulf Logistics Solutions FZE',
    '201-500 employees',
    'Power BI, Oracle Apex',
    'Logistics and Supply Chain',
    'Direct Client',
    'Partner Company',
    'Dubai',
    'United Arab Emirates',
    '+971-4-555-0199',
    'https://gulflogistics.example.ae',
    'Email',
    'info@gulflogistics.example.ae',
    'DA-102',
    'Regional supply chain partner',
  ],
  [
    'Nexus Financial Advisory Ltd',
    '11-50 employees',
    'Python, Cloud Architect',
    'Financial Services',
    'Direct Client',
    'Supplier Company',
    'London',
    'United Kingdom',
    '+44-20-7946-0991',
    'https://nexusfinance.example.co.uk',
    'Apollo',
    'advisory@nexusfinance.example.co.uk',
    'DA-103',
    'Existing strategic financial client',
  ],
];

/**
 * Retrieve master reference lookup data from application database (crm_db)
 */
async function getUploadMeta() {
  let countries = [];
  let industries = [];
  let companyTypes = [];
  let companySizes = [];
  let companyCategories = [];
  let sources = [];
  let technologies = [];
  let salesPersons = [];
  let existingCompanies = [];

  try {
    const [ctryRes, indRes, typeRes, sizeRes, catRes, srcRes, compRes, techRes, spRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT country FROM (
          SELECT country FROM master_countries WHERE country IS NOT NULL AND country != ''
          UNION
          SELECT country FROM companies WHERE country IS NOT NULL AND country != ''
        ) sub
        ORDER BY country ASC
      `),
      pool.query(`
        SELECT DISTINCT industry FROM (
          SELECT industry FROM master_industries WHERE industry IS NOT NULL AND industry != ''
          UNION
          SELECT industry FROM companies WHERE industry IS NOT NULL AND industry != ''
        ) sub
        ORDER BY industry ASC
      `),
      pool.query(`
        SELECT DISTINCT company_type FROM (
          SELECT master_company_type AS company_type FROM master_company_types WHERE master_company_type IS NOT NULL AND master_company_type != ''
          UNION
          SELECT company_type FROM companies WHERE company_type IS NOT NULL AND company_type != ''
        ) sub
        ORDER BY company_type ASC
      `),
      pool.query(`
        SELECT DISTINCT employee_size FROM (
          SELECT master_company_size AS employee_size FROM master_company_sizes WHERE master_company_size IS NOT NULL AND master_company_size != ''
          UNION
          SELECT employee_size FROM companies WHERE employee_size IS NOT NULL AND employee_size != ''
        ) sub
        ORDER BY employee_size ASC
      `),
      pool.query(`
        SELECT DISTINCT company_categories FROM (
          SELECT company_categories FROM master_company_categories WHERE company_categories IS NOT NULL AND company_categories != ''
          UNION
          SELECT company_categories FROM companies WHERE company_categories IS NOT NULL AND company_categories != ''
        ) sub
        ORDER BY company_categories ASC
      `),
      pool.query(`
        SELECT DISTINCT source FROM (
          SELECT source FROM master_sources WHERE source IS NOT NULL AND source != ''
          UNION
          SELECT source FROM companies WHERE source IS NOT NULL AND source != ''
        ) sub
        ORDER BY source ASC
      `),
      pool.query(`
        SELECT id, COALESCE(comp_name, name) AS comp_name, website, joget_id, COALESCE(com_email, email) as email
        FROM companies
      `),
      pool.query(`
        SELECT DISTINCT technology FROM (
          SELECT technology FROM master_technologies WHERE technology IS NOT NULL AND technology != ''
          UNION
          SELECT technology FROM companies WHERE technology IS NOT NULL AND technology != ''
        ) sub
        ORDER BY technology ASC
      `),
      pool.query(`
        SELECT DISTINCT salesperson AS sales_person
        FROM companies
        WHERE salesperson IS NOT NULL AND salesperson != ''
        ORDER BY sales_person ASC
      `),
    ]);

    countries = ctryRes.rows.map((r) => r.country);
    industries = indRes.rows.map((r) => r.industry);
    companyTypes = typeRes.rows.map((r) => r.company_type);
    companySizes = sizeRes.rows.map((r) => r.employee_size);
    companyCategories = catRes.rows.map((r) => r.company_categories);
    sources = srcRes.rows.map((r) => r.source);
    existingCompanies = compRes.rows;
    technologies = techRes.rows.map((r) => r.technology);
    salesPersons = spRes.rows.map((r) => r.sales_person);
  } catch (err) {
    console.warn('[UploadMeta] Falling back to local data:', err.message);
    const filterData = localStore.getCompanyFilters();
    countries = filterData.countries || [];
    industries = filterData.industries || [];
    companyTypes = filterData.companyTypes || [];
    companySizes = filterData.sizes || [];
    sources = filterData.sources || [];
    const localComps = localStore.getCompanies({ limit: 50000, page: 1 });
    existingCompanies = localComps.data.map((c) => ({
      id: c.id,
      comp_name: c.comp_name || c.name,
      website: c.website,
      joget_id: c.joget_id,
      email: c.com_email || c.email,
    }));
  }

  return {
    headers: TEMPLATE_HEADERS,
    sampleRows: TEMPLATE_SAMPLE_ROWS,
    countries,
    industries,
    companyTypes,
    companySizes,
    companyCategories,
    sources,
    technologies,
    salesPersons,
    registrationStatuses: ['Active', 'Pending', 'Suspended', 'In Review'],
    existingCompValues: ['Y', 'N'],
    existingCompanies,
  };
}

/**
 * APEX CRM Company Upload Templates based on selected Upload Mode (Insert vs Update)
 */
const INSERT_TEMPLATE_CSV = `Company Name,Employee Size,Technology,Industry,Company Type,Company Categories,City,Country,Company Phone,Website,Source,Email,DA,Remark
Company_Categories,Company_Type,Country,Employee_Size,Technology,Industry,Registration_Status
Partner Company,undefined,Afghanistan,"5,001-10,000 employees",AI,1,Unregistered
Client Company,Direct Client,Albania,"1,001-5,000 employees",Android,2,Undefined
Supplier Company,IT Company,Algeria,1-10 employees,Angular,3,Registered
,,Argentina,201-500 employees,ASP.NET,4,
,,Australia,"501-1,000 employees",Automation Anywhere,5,
,,Austria,11-50 employees,Blueprism,,
,,Bangladesh,"10,001+ employees",Certinia,,
,,Belgium,51-200 employees,Devops,,
,,Brazil,,Digital Marketing,,
,,Canada,,Flutter,,
,,Chile,,IT Desktop Support,,
,,China,,IT Outsourcing,,
,,Colombia,,Joget,,
,,Croatia,,Joomla,,
,,Czech Republic,,Laravel,,
,,Denmark,,Magento,,
,,Egypt,,Mendix,,
,,England,,Mobile App Development,,
,,Finland,,MS CRM,,
,,France,,Nintex,,
,,Germany,,Node JS,,
,,Ghana,,Odoo,,
,,Greece,,Oracle Apex,,
,,Hong Kong,,Oracle EBS,,
,,Hungary,,OutSystem,,
,,India,,PHP,,
,,Indonesia,,Power Apps,,
,,Iran,,Power Automate,,
,,Iraq,,Power BI,,
,,Ireland,,Qlik Sense,,
,,Italy,,React,,
,,Japan,,Salesforce,,
,,Kenya,,SharePoint,,
,,Malaysia,,Sitecore,,
,,Mexico,,Tableau,,
,,Morocco,,UI Path,,
,,Nepal,,Umbraco,,
,,Netherlands,,Web Analytics,,
,,New Zealand,,Web Design,,
,,Nigeria,,Wordpress,,
,,Norway,,Xamarin,,
,,Pakistan,,Zoho Books,,
,,Peru,,Zoho CRM,,
,,Philippines,,Zoho Others,,
,,Poland,,,,
,,Portugal,,,,
,,Qatar,,,,
,,Romania,,,,
,,Russia,,,,
,,Saudi Arabia,,,,
,,Singapore,,,,
,,South Africa,,,,
,,South Korea,,,,
,,Spain,,,,
,,Sri Lanka,,,,
,,Sweden,,,,
,,Switzerland,,,,
,,Taiwan,,,,
,,Thailand,,,,
,,Turkey,,,,
,,UAE,,,,
,,Ukraine,,,,
,,United Kingdom,,,,
,,United States,,,,
,,Uruguay,,,,
,,Venezuela,,,,
,,Vietnam,,,,
,,Yemen,,,,
,,Zimbabwe,,,,`;

const UPDATE_TEMPLATE_CSV = `Company ID,Company Name,Employee Size,Technology,Industry,Company Type,Company Categories,City,Country,Company Phone,Website,Source,Email,DA,Remark
Company_Categories,Company_Type,Country,Employee_Size,Technology,Industry,Registration_Status
Partner Company,undefined,Afghanistan,"5,001-10,000 employees",AI,1,Unregistered
Client Company,Direct Client,Albania,"1,001-5,000 employees",Android,2,Undefined
Supplier Company,IT Company,Algeria,1-10 employees,Angular,3,Registered
,,Argentina,201-500 employees,ASP.NET,4,
,,Australia,"501-1,000 employees",Automation Anywhere,5,
,,Austria,11-50 employees,Blueprism,,
,,Bangladesh,"10,001+ employees",Certinia,,
,,Belgium,51-200 employees,Devops,,
,,Brazil,,Digital Marketing,,
,,Canada,,Flutter,,
,,Chile,,IT Desktop Support,,
,,China,,IT Outsourcing,,
,,Colombia,,Joget,,
,,Croatia,,Joomla,,
,,Czech Republic,,Laravel,,
,,Denmark,,Magento,,
,,Egypt,,Mendix,,
,,England,,Mobile App Development,,
,,Finland,,MS CRM,,
,,France,,Nintex,,
,,Germany,,Node JS,,
,,Ghana,,Odoo,,
,,Greece,,Oracle Apex,,
,,Hong Kong,,Oracle EBS,,
,,Hungary,,OutSystem,,
,,India,,PHP,,
,,Indonesia,,Power Apps,,
,,Iran,,Power Automate,,
,,Iraq,,Power BI,,
,,Ireland,,Qlik Sense,,
,,Italy,,React,,
,,Japan,,Salesforce,,
,,Kenya,,SharePoint,,
,,Malaysia,,Sitecore,,
,,Mexico,,Tableau,,
,,Morocco,,UI Path,,
,,Nepal,,Umbraco,,
,,Netherlands,,Web Analytics,,
,,New Zealand,,Web Design,,
,,Nigeria,,Wordpress,,
,,Norway,,Xamarin,,
,,Pakistan,,Zoho Books,,
,,Peru,,Zoho CRM,,
,,Philippines,,Zoho Others,,
,,Poland,,,,
,,Portugal,,,,
,,Qatar,,,,
,,Romania,,,,
,,Russia,,,,
,,Saudi Arabia,,,,
,,Singapore,,,,
,,South Africa,,,,
,,South Korea,,,,
,,Spain,,,,
,,Sri Lanka,,,,
,,Sweden,,,,
,,Switzerland,,,,
,,Taiwan,,,,
,,Thailand,,,,
,,Turkey,,,,
,,UAE,,,,
,,Ukraine,,,,
,,United Kingdom,,,,
,,United States,,,,
,,Uruguay,,,,
,,Venezuela,,,,
,,Vietnam,,,,
,,Yemen,,,,
,,Zimbabwe,,,,`;

/**
 * Generate CSV template string based on mode ('insert' vs 'update')
 */
function getTemplateCsv(mode = 'insert') {
  if (String(mode).toLowerCase() === 'update') {
    return UPDATE_TEMPLATE_CSV;
  }
  return INSERT_TEMPLATE_CSV;
}

/**
 * Normalize and validate a batch of uploaded company rows matching APEX CRM validation rules
 */
async function validateCompanyBatch(rows, mode = 'insert') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: 'No rows provided for validation.',
      summary: { total: 0, new: 0, update: 0, errors: 0, valid: 0, invalid: 0, warnings: 0 },
      results: [],
    };
  }

  // Load master data and existing companies from DB
  const meta = await getUploadMeta();

  // Create fast lookup sets
  const countrySet = new Set(meta.countries.map((c) => c.toLowerCase().trim()));
  const industrySet = new Set(meta.industries.map((i) => i.toLowerCase().trim()));
  const typeSet = new Set(meta.companyTypes.map((t) => t.toLowerCase().trim()));
  const sizeSet = new Set(meta.companySizes.map((s) => s.toLowerCase().trim()));
  const catSet = new Set((meta.companyCategories || []).map((c) => c.toLowerCase().trim()));
  const statusSet = new Set(meta.registrationStatuses.map((s) => s.toLowerCase().trim()));
  const techSet = new Set((meta.technologies || []).map((t) => t.toLowerCase().trim()));
  const spSet = new Set((meta.salesPersons || []).map((s) => s.toLowerCase().trim()));
  const srcSet = new Set((meta.sources || []).map((s) => s.toLowerCase().trim()));

  // Existing companies lookup
  const dbNameMap = new Map();
  const dbWebsiteMap = new Map();
  const dbEmailMap = new Map();
  const dbIdMap = new Map();
  const dbJogetMap = new Map();

  for (const c of meta.existingCompanies) {
    if (c.id !== undefined && c.id !== null) {
      dbIdMap.set(Number(c.id), c);
    }
    if (c.comp_name && c.comp_name.trim()) {
      dbNameMap.set(c.comp_name.toLowerCase().trim(), c);
    }
    if (c.website && c.website.trim()) {
      dbWebsiteMap.set(c.website.toLowerCase().trim(), c);
    }
    if (c.email && c.email.trim()) {
      dbEmailMap.set(c.email.toLowerCase().trim(), c);
    }
    if (c.joget_id && c.joget_id.trim()) {
      dbJogetMap.set(c.joget_id.trim(), c);
    }
  }

  // Tracking in-file duplicates
  const fileSeenNames = new Map(); // lower(name) -> firstRowNumber
  const fileSeenWebsites = new Map(); // lower(website) -> firstRowNumber
  const fileSeenEmails = new Map(); // lower(email) -> firstRowNumber
  const fileSeenJogets = new Map(); // joget_id -> firstRowNumber

  let newCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  // Sift out template reference sheet if included at end of CSV
  const validDataRows = [];
  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const src = rawRow.normalized ? { ...rawRow.normalized, ...rawRow } : rawRow;
    const name = String(
      src['Company Name'] || src['company_name'] || src['comp_name'] || src['Company'] || src['company'] || src['Name'] || src['name'] || src['Organization'] || ''
    ).trim();
    const id = String(src['Comp Id'] || src['Company ID'] || src['comp_id'] || src['id'] || '').trim();
    const lowerName = name.toLowerCase();
    const lowerId = id.toLowerCase();
    if (
      lowerName === 'company_categories' ||
      lowerName === 'company categories' ||
      lowerName === 'company_type' ||
      lowerName === 'company type' ||
      lowerName === '--- reference data ---' ||
      lowerId === 'company_categories' ||
      lowerId === 'company_type'
    ) {
      break;
    }
    validDataRows.push(rawRow);
  }

  const results = validDataRows.map((rawRow, idx) => {
    // Preserve 1-based source row number (accounting for header row if not provided)
    const sourceRowNumber = rawRow.__sourceRowNumber !== undefined ? rawRow.__sourceRowNumber : idx + 2;

    const errors = [];
    const warnings = [];

    // Helper to identify empty/placeholder cells from scrapers
    const isPlaceholder = (val) => {
      if (!val) return true;
      const l = String(val).trim().toLowerCase();
      return l === 'not found' || l === 'none' || l === 'n/a' || l === '-' || l === 'null' || l === 'undefined';
    };

    // Map column aliases from rawRow or normalized object
    const src = rawRow.normalized ? { ...rawRow.normalized, ...rawRow } : rawRow;

    const rawId = String(
      src['Comp Id'] ||
      src['Company ID'] ||
      src['comp_id'] ||
      src['id'] ||
      src['ID'] ||
      src.comp_id ||
      src.id ||
      ''
    ).trim();

    const name = String(
      src['Company Name'] ||
      src['company_name'] ||
      src['comp_name'] ||
      src['Name'] ||
      src['name'] ||
      src.comp_name ||
      src.name ||
      ''
    ).trim();

    let website = String(
      src['Website'] ||
      src['website'] ||
      src['Web'] ||
      src['web'] ||
      ''
    ).trim();
    if (isPlaceholder(website)) website = '';

    let country = String(
      src['Country'] ||
      src['country'] ||
      ''
    ).trim();
    if (isPlaceholder(country)) {
      country = '';
    } else {
      const lowerC = country.toLowerCase();
      if (lowerC === 'united states' || lowerC === 'us') country = 'USA';
      else if (lowerC === 'united arab emirates') country = 'UAE';
      else if (lowerC === 'kingdom of saudi arabia') country = 'Saudi Arabia';
      else if (lowerC === 'kingdom of bahrain') country = 'Bahrain';
      else if (lowerC === 'türkiye') country = 'Turkey';
      else if (lowerC === "people's republic of china") country = 'China';
    }

    let city = String(
      src['City'] ||
      src['city'] ||
      ''
    ).trim();
    if (isPlaceholder(city)) city = '';

    let industry = String(
      src['Industry'] ||
      src['industry'] ||
      ''
    ).trim();
    if (isPlaceholder(industry)) industry = '';

    const companyType = String(
      src['Company Type'] ||
      src['company_type'] ||
      src['Type'] ||
      src['type'] ||
      'Direct Client'
    ).trim();

    const companyCategories = String(
      src['Company Categories'] ||
      src['company_categories'] ||
      src['Category'] ||
      src['category'] ||
      ''
    ).trim();

    let employeeSize = String(
      src['Employee Size'] ||
      src['employee_size'] ||
      src['Company Size'] ||
      src['company_size'] ||
      ''
    ).trim();
    if (isPlaceholder(employeeSize)) {
      employeeSize = '';
    } else {
      const lowerSize = employeeSize.toLowerCase();
      if (lowerSize === '50-200 employees') employeeSize = '51-200 employees';
      else if (lowerSize.includes('10,001') || lowerSize.includes('10001')) employeeSize = '10,001+ employees';
      else if (lowerSize.includes('5,001') || lowerSize.includes('5001')) employeeSize = '5,001-10,000 employees';
      else if (lowerSize.includes('1,001') || lowerSize.includes('1001')) employeeSize = '1,001-5,000 employees';
      else if (lowerSize.includes('501-1,000') || lowerSize.includes('501-1000')) employeeSize = '501-1,000 employees';
      else if (lowerSize.includes('201-500')) employeeSize = '201-500 employees';
      else if (lowerSize.includes('51-200') || lowerSize.includes('50-200')) employeeSize = '51-200 employees';
      else if (lowerSize.includes('11-50')) employeeSize = '11-50 employees';
      else if (lowerSize.includes('1-10')) employeeSize = '1-10 employees';
    }

    let rawExisting = String(
      src['Existing Company (Y/N)'] ||
      src['Existing Company'] ||
      src['existingcomp'] ||
      src['existing_comp'] ||
      'N'
    ).trim().toUpperCase();

    if (rawExisting === 'YES' || rawExisting === 'TRUE') rawExisting = 'Y';
    if (rawExisting === 'NO' || rawExisting === 'FALSE') rawExisting = 'N';

    const rawStatus = String(
      src['Registration Status'] ||
      src['registration_status'] ||
      src['Status'] ||
      src['status'] ||
      ''
    ).trim();

    let phone = String(
      src['Company Phone'] ||
      src['companyphone'] ||
      src['Phone'] ||
      src['phone'] ||
      ''
    ).trim();
    if (isPlaceholder(phone)) phone = '';

    let email = String(
      src['Email'] ||
      src['com_email'] ||
      src['Corporate Email'] ||
      src['email'] ||
      ''
    ).trim();
    if (isPlaceholder(email)) email = '';

    let technology = String(
      src['Technology'] ||
      src['technology'] ||
      ''
    ).trim();
    if (isPlaceholder(technology)) technology = '';

    let source = String(
      src['Source'] ||
      src['source'] ||
      ''
    ).trim();
    if (isPlaceholder(source)) {
      source = '';
    } else {
      const lowerSrc = source.toLowerCase();
      if (['linkedln', 'linkdin', 'linkedin'].includes(lowerSrc)) source = 'LinkedIn';
    }

    const salesperson = String(
      src['Salesperson'] ||
      src['salesperson'] ||
      src['sales_person'] ||
      ''
    ).trim();

    const remarks = String(
      src['Remarks'] ||
      src['remarks'] ||
      src['Remark'] ||
      src['remark'] ||
      ''
    ).trim();

    const da = String(
      src['DA'] ||
      src['da'] ||
      ''
    ).trim();

    const supplierNumber = String(
      src['Supplier Number'] ||
      src['supplier_number'] ||
      ''
    ).trim();

    const jogetId = String(
      src['JOGET ID'] ||
      src['joget_id'] ||
      ''
    ).trim();

    // 1. Validate Company ID (if provided)
    let parsedCompId = null;
    let matchedCompanyById = null;
    if (rawId) {
      if (!/^\d+$/.test(rawId)) {
        errors.push({ field: 'Comp Id', message: `ID "${rawId}" is not a valid number` });
      } else {
        parsedCompId = parseInt(rawId, 10);
        matchedCompanyById = dbIdMap.get(parsedCompId);
        if (!matchedCompanyById) {
          errors.push({ field: 'Comp Id', message: `Company ID ${parsedCompId} does not exist` });
        } else if (name && matchedCompanyById.comp_name.toLowerCase().trim() !== name.toLowerCase().trim()) {
          errors.push({ field: 'Company Name', message: 'Company ID and Company Name do not match the same company' });
        }
      }
    }

    if (mode === 'update' && !rawId && !dbNameMap.get(name.toLowerCase())) {
      errors.push({ field: 'Comp Id', message: 'ID is required for Update mode' });
    }

    // 2. Validate Company Name (Mandatory)
    if (!name) {
      errors.push({ field: 'Company Name', message: 'Company Name is required' });
    } else {
      if (name.length > 500) {
        errors.push({ field: 'Company Name', message: 'Company Name exceeds 500 characters limit' });
      }

      const lowerName = name.toLowerCase();

      // Check in-file duplicate
      if (fileSeenNames.has(lowerName)) {
        errors.push({
          field: 'Company Name',
          message: 'Duplicate Company Name inside the file',
        });
      } else {
        fileSeenNames.set(lowerName, sourceRowNumber);
      }

      // Check database duplicate
      const existingInDb = dbNameMap.get(lowerName);
      if (mode === 'insert' && existingInDb) {
        errors.push({
          field: 'Company Name',
          message: 'Company Name already exists (use its ID to update)',
        });
      } else if (mode === 'update' && !existingInDb && !parsedCompId) {
        errors.push({
          field: 'Company Name',
          message: `Company Name "${name}" not found`,
        });
      }
    }

    // 3. Validate Website (Unique & valid format when provided)
    if (website) {
      if (website.length > 500) {
        errors.push({ field: 'Website', message: 'Website exceeds 500 characters limit' });
      }

      // Apex URL pattern validation
      const webPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
      const lowerWeb = website.toLowerCase();
      if (!webPattern.test(website) || lowerWeb === 'not found' || lowerWeb === 'none' || lowerWeb === 'n/a') {
        errors.push({ field: 'Website', message: 'Website is not valid' });
      } else {
        // Check in-file duplicate website
        if (fileSeenWebsites.has(lowerWeb)) {
          errors.push({
            field: 'Website',
            message: 'Duplicate Website inside the file',
          });
        } else {
          fileSeenWebsites.set(lowerWeb, sourceRowNumber);
        }

        // Check database duplicate website
        const webInDb = dbWebsiteMap.get(lowerWeb);
        if (mode === 'insert' && webInDb) {
          errors.push({
            field: 'Website',
            message: 'Website already exists (use its ID to update)',
          });
        }
      }
    }

    // 4. Validate Email (Unique & valid format when provided)
    if (email) {
      if (email.length > 255) {
        errors.push({ field: 'Email', message: 'Email exceeds 255 characters limit' });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push({
            field: 'Email',
            message: 'Company Email format is invalid',
          });
        } else {
          const lowerEmail = email.toLowerCase();
          if (fileSeenEmails.has(lowerEmail)) {
            errors.push({
              field: 'Email',
              message: 'Duplicate Company Email inside the file',
            });
          } else {
            fileSeenEmails.set(lowerEmail, sourceRowNumber);
          }

          if (mode === 'insert' && dbEmailMap.has(lowerEmail)) {
            errors.push({
              field: 'Email',
              message: 'Company Email already exists (use its ID to update)',
            });
          }
        }
      }
    }

    // 5. Validate JOGET ID (Unique when provided)
    if (jogetId) {
      if (jogetId.length > 100) {
        errors.push({ field: 'JOGET ID', message: 'JOGET ID exceeds 100 characters limit' });
      }
      if (fileSeenJogets.has(jogetId)) {
        errors.push({
          field: 'JOGET ID',
          message: `Duplicate JOGET ID "${jogetId}" in file (conflicts with Row ${fileSeenJogets.get(jogetId)})`,
        });
      } else {
        fileSeenJogets.set(jogetId, sourceRowNumber);
      }
      const jogetInDb = dbJogetMap.get(jogetId);
      if (mode === 'insert' && jogetInDb) {
        errors.push({
          field: 'JOGET ID',
          message: `JOGET ID "${jogetId}" already exists for Company #${jogetInDb.id}`,
        });
      }
    }

    // 6. Validate Registration Status
    let matchedStatus = 'Active';
    if (rawStatus) {
      const match = meta.registrationStatuses.find(
        (s) => s.toLowerCase() === rawStatus.toLowerCase()
      );
      if (!match) {
        errors.push({
          field: 'Registration Status',
          message: `Registration Status "${rawStatus}" is invalid. Allowed: Active, Pending, Suspended, In Review`,
        });
      } else {
        matchedStatus = match;
      }
    }

    // 7. Validate Master references
    if (country && !countrySet.has(country.toLowerCase())) {
      errors.push({
        field: 'Country',
        message: `Country "${country}" not found in Country Master`,
      });
    }

    if (industry) {
      if (!industrySet.has(industry.toLowerCase())) {
        // Check if any segment matches a master industry
        const parts = industry.split(/[/,]/).map((p) => p.trim()).filter(Boolean);
        let matchedPart = null;
        for (const p of parts) {
          if (industrySet.has(p.toLowerCase())) {
            matchedPart = meta.industries.find((ind) => ind.toLowerCase() === p.toLowerCase());
            break;
          }
        }
        if (matchedPart) {
          industry = matchedPart;
        } else {
          warnings.push({
            field: 'Industry',
            message: `Industry "${industry}" is not in master list (will be saved as custom value)`,
          });
        }
      }
    }

    if (companyType && !typeSet.has(companyType.toLowerCase())) {
      errors.push({
        field: 'Company Type',
        message: `Company Type "${companyType}" not found in Company Type Master`,
      });
    }

    if (companyCategories && !catSet.has(companyCategories.toLowerCase())) {
      errors.push({
        field: 'Company Categories',
        message: `Company Category "${companyCategories}" not found in Master`,
      });
    }

    if (employeeSize && !sizeSet.has(employeeSize.toLowerCase())) {
      warnings.push({
        field: 'Employee Size',
        message: `Employee Size "${employeeSize}" is not in standard brackets (will be saved as custom value)`,
      });
    }

    if (technology) {
      const techTokens = technology.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      for (const token of techTokens) {
        if (!techSet.has(token)) {
          errors.push({
            field: 'Technology',
            message: `Technology "${token}" not found in Technology Master`,
          });
          break;
        }
      }
    }

    if (salesperson && !spSet.has(salesperson.toLowerCase())) {
      errors.push({
        field: 'Salesperson',
        message: `Salesperson "${salesperson}" not found`,
      });
    }

    if (source && !srcSet.has(source.toLowerCase())) {
      warnings.push({
        field: 'Source',
        message: `Source "${source}" not found in Master`,
      });
    }

    // 8. Field length bounds
    if (country.length > 150) errors.push({ field: 'Country', message: 'Country exceeds 150 characters' });
    if (city.length > 150) errors.push({ field: 'City', message: 'City exceeds 150 characters' });
    if (industry.length > 255) errors.push({ field: 'Industry', message: 'Industry exceeds 255 characters' });
    if (companyType.length > 100) errors.push({ field: 'Company Type', message: 'Company Type exceeds 100 characters' });
    if (phone.length > 100) errors.push({ field: 'Company Phone', message: 'Phone exceeds 100 characters' });
    if (supplierNumber.length > 100) errors.push({ field: 'Supplier Number', message: 'Supplier Number exceeds 100 characters' });
    if (da.length > 100) errors.push({ field: 'DA', message: 'DA exceeds 100 characters' });

    // Determine row status and pipe-separated error messages matching APEX
    const isValid = errors.length === 0;
    let rowStatus = 'NEW';
    if (!isValid) {
      rowStatus = 'ERROR';
      errorCount++;
    } else if (mode === 'update' || (mode === 'merge' && (dbNameMap.has(name.toLowerCase()) || parsedCompId))) {
      rowStatus = 'UPDATE';
      updateCount++;
    } else {
      rowStatus = 'NEW';
      newCount++;
    }

    if (warnings.length > 0) warningCount++;

    const errorMsg = errors.map((e) => e.message).join(' | ');

    return {
      sourceRowNumber,
      stg_id: 402800 + idx,
      batch_id: 1118,
      row_status: rowStatus,
      error_msg: errorMsg,
      isValid,
      errors,
      warnings,
      normalized: {
        id: parsedCompId || undefined,
        comp_id: parsedCompId || (matchedCompanyById ? matchedCompanyById.id : undefined),
        comp_name: name,
        name,
        website: website || null,
        country: country || null,
        city: city || null,
        industry: industry || null,
        company_type: companyType || 'Direct Client',
        company_categories: companyCategories || null,
        employee_size: employeeSize || null,
        existingcomp: rawExisting || 'N',
        existing_comp: rawExisting || 'N',
        registration_status: matchedStatus,
        companyphone: phone || null,
        phone: phone || null,
        com_email: email || null,
        email: email || null,
        technology: technology || null,
        source: source || null,
        salesperson: salesperson || null,
        remark: remarks || null,
        remarks: remarks || null,
        da: da || null,
        supplier_number: supplierNumber || null,
        joget_id: jogetId || null,
      },
    };
  });

  return {
    success: true,
    summary: {
      total: rows.length,
      new: newCount,
      update: updateCount,
      errors: errorCount,
      valid: newCount + updateCount,
      invalid: errorCount,
      warnings: warningCount,
    },
    results,
  };
}

/**
 * Perform database import inside a safe transaction
 */
async function importCompanyBatch(validatedResults, mode = 'insert', policy = 'skip') {
  if (!Array.isArray(validatedResults) || validatedResults.length === 0) {
    throw new Error('No validated company records provided for import.');
  }

  const invalidRows = validatedResults.filter((r) => !r.isValid);
  if (policy === 'all_or_nothing' && invalidRows.length > 0) {
    throw new Error(
      `Import aborted: 'All or Nothing' policy selected, but ${invalidRows.length} invalid row(s) were found.`
    );
  }

  // Filter rows based on policy
  const rowsToProcess = policy === 'skip'
    ? validatedResults.filter((r) => r.isValid)
    : validatedResults;

  if (rowsToProcess.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedCount: validatedResults.length,
      failedCount: 0,
      message: 'No valid rows available to import. All rows were skipped due to validation errors.',
      importedIds: [],
    };
  }

  const client = await pool.connect();
  const importedIds = [];
  let skippedCount = validatedResults.length - rowsToProcess.length;
  const batchId = Math.floor(Date.now() / 1000) % 900000 + 100000;

  try {
    await client.query('BEGIN');

    for (const item of rowsToProcess) {
      const c = item.normalized;

      if (mode === 'insert') {
        const insertSql = `
          INSERT INTO companies (
            comp_name, name, technology, country, existingcomp, existing_comp,
            companyphone, phone, company_categories, company_type, registered_url,
            registration_status, supplier_number, username, password, registration_date,
            industry, city, website, da, com_email, email, remark, remarks,
            employee_size, created_by, created_date, modified_by, modified_date,
            joget_id, source, contacts_count, lead_count, contact_count
          ) VALUES (
            $1, $1, $2, $3, $4, $4,
            $5, $5, $6, $7, $8,
            $9, $10, NULL, NULL, TO_CHAR(NOW(), 'DD/MM/YYYY'),
            $11, $12, $13, $14, $15, $15, $16, $16,
            $17, 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY'), 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY'),
            $18, $19, 0, 0, 0
          )
          RETURNING id
        `;

        const params = [
          c.comp_name,
          c.technology,
          c.country,
          c.existingcomp,
          c.companyphone,
          c.company_categories,
          c.company_type,
          null, // registered_url
          c.registration_status,
          c.supplier_number,
          c.industry,
          c.city,
          c.website,
          c.da,
          c.com_email,
          c.remark,
          c.employee_size,
          c.joget_id,
          c.source,
        ];

        const res = await client.query(insertSql, params);
        if (res.rows[0]) {
          const newId = res.rows[0].id;
          importedIds.push(newId);
          // Sync to in-memory store
          localStore.createCompany({ ...c, id: newId });
        }
      } else if (mode === 'update') {
        const updateSql = `
          UPDATE companies SET
            technology = COALESCE($2, technology),
            country = COALESCE($3, country),
            existingcomp = COALESCE($4, existingcomp),
            existing_comp = COALESCE($4, existing_comp),
            companyphone = COALESCE($5, companyphone),
            phone = COALESCE($5, phone),
            company_categories = COALESCE($6, company_categories),
            company_type = COALESCE($7, company_type),
            registration_status = COALESCE($8, registration_status),
            supplier_number = COALESCE($9, supplier_number),
            industry = COALESCE($10, industry),
            city = COALESCE($11, city),
            website = COALESCE($12, website),
            da = COALESCE($13, da),
            com_email = COALESCE($14, com_email),
            email = COALESCE($14, email),
            remark = COALESCE($15, remark),
            remarks = COALESCE($15, remarks),
            employee_size = COALESCE($16, employee_size),
            source = COALESCE($17, source),
            joget_id = COALESCE($18, joget_id),
            modified_by = 'APEX_PUBLIC_USER',
            modified_date = TO_CHAR(NOW(), 'DD-MON-YYYY'),
            updated_at = CURRENT_TIMESTAMP
          WHERE LOWER(TRIM(COALESCE(comp_name, name, ''))) = LOWER(TRIM($1))
             OR (website IS NOT NULL AND website != '' AND LOWER(TRIM(website)) = LOWER(TRIM($12)))
          RETURNING id
        `;

        const params = [
          c.comp_name,
          c.technology,
          c.country,
          c.existingcomp,
          c.companyphone,
          c.company_categories,
          c.company_type,
          c.registration_status,
          c.supplier_number,
          c.industry,
          c.city,
          c.website,
          c.da,
          c.com_email,
          c.remark,
          c.employee_size,
          c.source,
          c.joget_id,
        ];

        const res = await client.query(updateSql, params);
        if (res.rows.length > 0) {
          importedIds.push(res.rows[0].id);
          localStore.updateCompany(res.rows[0].id, c);
        } else {
          skippedCount++;
        }
      } else if (mode === 'merge') {
        // Try update first
        const checkRes = await client.query(
          `SELECT id FROM companies WHERE LOWER(TRIM(COALESCE(comp_name, name, ''))) = LOWER(TRIM($1)) LIMIT 1`,
          [c.comp_name]
        );

        if (checkRes.rows.length > 0) {
          const existingId = checkRes.rows[0].id;
          await client.query(
            `UPDATE companies SET
              technology = COALESCE($2, technology),
              country = COALESCE($3, country),
              existingcomp = COALESCE($4, existingcomp),
              existing_comp = COALESCE($4, existing_comp),
              companyphone = COALESCE($5, companyphone),
              phone = COALESCE($5, phone),
              company_categories = COALESCE($6, company_categories),
              company_type = COALESCE($7, company_type),
              registration_status = COALESCE($8, registration_status),
              supplier_number = COALESCE($9, supplier_number),
              industry = COALESCE($10, industry),
              city = COALESCE($11, city),
              website = COALESCE($12, website),
              da = COALESCE($13, da),
              com_email = COALESCE($14, com_email),
              email = COALESCE($14, email),
              remark = COALESCE($15, remark),
              remarks = COALESCE($15, remarks),
              employee_size = COALESCE($16, employee_size),
              source = COALESCE($17, source),
              joget_id = COALESCE($18, joget_id),
              modified_by = 'APEX_PUBLIC_USER',
              modified_date = TO_CHAR(NOW(), 'DD-MON-YYYY'),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
            [
              existingId,
              c.technology,
              c.country,
              c.existingcomp,
              c.companyphone,
              c.company_categories,
              c.company_type,
              c.registration_status,
              c.supplier_number,
              c.industry,
              c.city,
              c.website,
              c.da,
              c.com_email,
              c.remark,
              c.employee_size,
              c.source,
              c.joget_id,
            ]
          );
          importedIds.push(existingId);
          localStore.updateCompany(existingId, c);
        } else {
          // Insert
          const insertSql = `
            INSERT INTO companies (
              comp_name, name, technology, country, existingcomp, existing_comp,
              companyphone, phone, company_categories, company_type, registered_url,
              registration_status, supplier_number, username, password, registration_date,
              industry, city, website, da, com_email, email, remark, remarks,
              employee_size, created_by, created_date, modified_by, modified_date,
              joget_id, source, contacts_count, lead_count, contact_count
            ) VALUES (
              $1, $1, $2, $3, $4, $4,
              $5, $5, $6, $7, $8,
              $9, $10, NULL, NULL, TO_CHAR(NOW(), 'DD/MM/YYYY'),
              $11, $12, $13, $14, $15, $15, $16, $16,
              $17, 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY'), 'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY'),
              $18, $19, 0, 0, 0
            )
            RETURNING id
          `;

          const params = [
            c.comp_name,
            c.technology,
            c.country,
            c.existingcomp,
            c.companyphone,
            c.company_categories,
            c.company_type,
            null,
            c.registration_status,
            c.supplier_number,
            c.industry,
            c.city,
            c.website,
            c.da,
            c.com_email,
            c.remark,
            c.employee_size,
            c.joget_id,
            c.source,
          ];

          const res = await client.query(insertSql, params);
          if (res.rows[0]) {
            const newId = res.rows[0].id;
            importedIds.push(newId);
            localStore.createCompany({ ...c, id: newId });
          }
        }
      }
    }

    // Record invalid/error rows into company_incorrect_data
    const errorRows = validatedResults.filter((r) => !r.isValid || r.hasErrors);
    for (const errItem of errorRows) {
      const c = errItem.normalized || {};
      const errorMsg = (errItem.errors && errItem.errors.length > 0)
        ? errItem.errors.map((e) => typeof e === 'string' ? e : e.message).join(' | ')
        : 'Validation error';

      await client.query(
        `INSERT INTO company_incorrect_data (
          batch_id, excel_row_no, source_id, error_message, error_date, comp_name,
          technology, country, existingcomp, companyphone, company_categories,
          company_type, registration_status, supplier_number, industry, city,
          website, da, com_email, remark, employee_size, salesperson, source,
          created_by, created_date
        ) VALUES (
          $1, $2, $3, $4, TO_CHAR(NOW(), 'DD-MON-YYYY'), $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22,
          'APEX_PUBLIC_USER', TO_CHAR(NOW(), 'DD-MON-YYYY')
        )`,
        [
          batchId,
          errItem.sourceRowNumber || 1,
          c.id ? String(c.id) : null,
          errorMsg,
          c.comp_name || '',
          c.technology || null,
          c.country || null,
          c.existingcomp || 'N',
          c.companyphone || null,
          c.company_categories || null,
          c.company_type || null,
          c.registration_status || null,
          c.supplier_number || null,
          c.industry || null,
          c.city || null,
          c.website || null,
          c.da || null,
          c.com_email || null,
          c.remark || null,
          c.employee_size || null,
          c.salesperson || null,
          c.source || null,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      batchId,
      importedCount: importedIds.length,
      skippedCount,
      failedCount: 0,
      totalProcessed: validatedResults.length,
      message: `Successfully processed ${importedIds.length} company record(s). (${skippedCount} skipped)`,
      importedIds,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  TEMPLATE_HEADERS,
  TEMPLATE_SAMPLE_ROWS,
  getUploadMeta,
  getTemplateCsv,
  validateCompanyBatch,
  importCompanyBatch,
};

