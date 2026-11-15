const { executeMcpSql } = require('../server/services/mcpSync');
const { pool } = require('../server/db/pool');

async function syncLeads() {
  console.log('--- Creating Lead Tables in PostgreSQL ---');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      currency_id INT PRIMARY KEY,
      currency_code VARCHAR(20) NOT NULL,
      currency_name VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS leads (
      lead_id INT PRIMARY KEY,
      sr_no INT UNIQUE NOT NULL,
      company_name VARCHAR(255),
      company_id INT,
      company_url VARCHAR(500),
      company_type VARCHAR(100),
      name_of_coordinator VARCHAR(255),
      account_manager VARCHAR(255),
      industry VARCHAR(255),
      technology TEXT,
      lead_date VARCHAR(100),
      lead_time VARCHAR(100),
      city VARCHAR(255),
      country VARCHAR(255),
      probability VARCHAR(50),
      lead_type VARCHAR(100),
      status TEXT,
      status_detail TEXT,
      da VARCHAR(255),
      source VARCHAR(255),
      referrer VARCHAR(255),
      contract_no VARCHAR(255),
      currency_id INT,
      currency_code VARCHAR(20),
      amount NUMERIC(15, 2),
      amount_in_inr NUMERIC(15, 2),
      end_client VARCHAR(255),
      page_url VARCHAR(500),
      proposal VARCHAR(50),
      connection_sent VARCHAR(50),
      last_followup VARCHAR(100),
      reason TEXT,
      month VARCHAR(50),
      year INT,
      lost_won VARCHAR(50),
      contacts TEXT,
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100),
      modified_by VARCHAR(100),
      modified_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS lead_lines (
      lead_line_id INT PRIMARY KEY,
      lead_id INT NOT NULL,
      lead_line_no INT,
      technology VARCHAR(255),
      technology_required VARCHAR(255),
      experience VARCHAR(100),
      model VARCHAR(100),
      currency_id INT,
      currency_code VARCHAR(20),
      rate NUMERIC(15, 2),
      no_of_resources VARCHAR(100),
      duration VARCHAR(100),
      amount NUMERIC(15, 2),
      exchange_rate_value NUMERIC(15, 4),
      amount_in_inr NUMERIC(15, 2),
      required_service VARCHAR(255),
      requirement_description TEXT,
      cv_made_by VARCHAR(255),
      cv_sent VARCHAR(50),
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100),
      modified_by VARCHAR(100),
      modified_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS lead_contacts (
      lead_contact_id INT PRIMARY KEY,
      lead_id INT NOT NULL,
      contact_id INT,
      client_full_name VARCHAR(255),
      designation VARCHAR(255),
      position VARCHAR(255),
      email VARCHAR(255),
      mobile_number VARCHAR(100),
      interview_status VARCHAR(255),
      proposal VARCHAR(50),
      connection_sent VARCHAR(50),
      linkedin_url VARCHAR(500),
      department VARCHAR(255),
      role VARCHAR(255),
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100),
      modified_by VARCHAR(100),
      modified_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS naukri_advertisements (
      naukri_ad_id INT PRIMARY KEY,
      lead_id INT NOT NULL,
      ad_name VARCHAR(255),
      designation VARCHAR(255),
      date_of_ad_posting VARCHAR(100),
      experience NUMERIC(5, 1),
      cv_received INT,
      cv_join_immediately INT,
      cost_of_ad NUMERIC(15, 2),
      technology VARCHAR(255),
      attachment_filename VARCHAR(255),
      attachment_mime_type VARCHAR(255),
      attachment_description TEXT,
      attachment_type VARCHAR(100),
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100),
      modified_by VARCHAR(100),
      modified_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS lead_proposals (
      proposal_id INT PRIMARY KEY,
      lead_id INT NOT NULL,
      proposal_number VARCHAR(255) NOT NULL,
      date_sent VARCHAR(100),
      proposal_description TEXT,
      file_name VARCHAR(255),
      mime_type VARCHAR(255),
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      created_date VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS lead_resources (
      resource_id INT PRIMARY KEY,
      lead_line_id INT,
      lead_id INT,
      resource_type VARCHAR(100) DEFAULT 'Iqra Employee',
      resource_name VARCHAR(255),
      designation VARCHAR(255),
      technology VARCHAR(255),
      status VARCHAR(100),
      created_by VARCHAR(100),
      created_date VARCHAR(100)
    );
  `);

  console.log('Tables created. Syncing Currencies...');
  const currs = await executeMcpSql("SELECT CURRENCY_ID, CURRENCY_CODE, CURRENCY_NAME FROM CRM.CURRENCY");
  for (const c of currs) {
    await pool.query(
      `INSERT INTO currencies (currency_id, currency_code, currency_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (currency_id) DO UPDATE SET currency_code = EXCLUDED.currency_code, currency_name = EXCLUDED.currency_name`,
      [parseInt(c.CURRENCY_ID, 10), c.CURRENCY_CODE, c.CURRENCY_NAME]
    );
  }
  console.log(`Synced ${currs.length} currencies.`);

  // Build currency map
  const currMap = {};
  currs.forEach(c => { currMap[c.CURRENCY_ID] = c.CURRENCY_CODE; });

  console.log('Fetching all leads from CRM.LEAD...');
  const leadRows = await executeMcpSql(`
    SELECT 
      l.LEAD_ID, l.SR_NO, l.COMPANY_NAME, l.COMPANY_ID, l.COMPANY_URL, l.COMPANY_TYPE,
      l.NAME_OF_COORDINATOR, l.ACCOUNT_MANAGER, l.INDUSTRY,
      TO_CHAR(l.LEAD_DATE, 'DD/MM/YYYY') as LEAD_DATE_FMT,
      l.LEAD_TIME, l.CITY, l.COUNTRY, l.PROBABILITY, l.LEAD_TYPE,
      l.STATUS, l.DA, l.SOURCE, l.REFERRER, l.CONTRACT_NO,
      l.CURRENCY_ID, l.AMOUNT, l.AMOUNT_INR, l.END_CLIENT, l.PAGE_URL,
      l.PROPOSAL, l.CONNECTION_SENT,
      TO_CHAR(l.LAST_FOLLOWUP, 'DD/MM/YYYY') as LAST_FOLLOWUP_FMT,
      l.REASON, l.MONTH, l.YEAR, l.LOST_WON,
      l.CREATED_BY,
      TO_CHAR(l.CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE_FMT,
      l.UPDATED_BY,
      TO_CHAR(l.UPDATED_DATE, 'DD-MON-YYYY') as UPDATED_DATE_FMT
    FROM CRM.LEAD l
    ORDER BY l.SR_NO ASC
  `);
  console.log(`Received ${leadRows.length} leads from MCP. Inserting into PostgreSQL...`);

  // To populate technology & contacts for lead report table from lead lines and lead contacts:
  // We can fetch lead lines technologies grouped by lead_id
  const techMap = {};
  const lineTechRows = await executeMcpSql(`
    SELECT ll.LEAD_ID, ll.TECHNOLOGY, ll.TECHNOLOGY_REQUIRED, t.TECHNOLOGY as TECH_NAME
    FROM CRM.LEAD_LINE ll
    LEFT JOIN CRM.TECHNOLOGY t ON TO_CHAR(t.ID) = ll.TECHNOLOGY
  `);
  for (const lt of lineTechRows) {
    const lid = lt.LEAD_ID;
    const name = lt.TECH_NAME || lt.TECHNOLOGY_REQUIRED || (isNaN(lt.TECHNOLOGY) ? lt.TECHNOLOGY : '');
    if (name) {
      if (!techMap[lid]) techMap[lid] = new Set();
      techMap[lid].add(name);
    }
  }

  // Also contacts grouped by lead_id
  const contactMap = {};
  const leadContactRows = await executeMcpSql(`
    SELECT LEAD_ID, CLIENT_FULL_NAME
    FROM CRM.LEAD_CONTACT
  `);
  for (const lc of leadContactRows) {
    const lid = lc.LEAD_ID;
    if (lc.CLIENT_FULL_NAME) {
      if (!contactMap[lid]) contactMap[lid] = [];
      contactMap[lid].push(lc.CLIENT_FULL_NAME);
    }
  }

  for (const l of leadRows) {
    const leadId = parseInt(l.LEAD_ID, 10);
    const srNo = parseInt(l.SR_NO, 10) || leadId;
    const currId = l.CURRENCY_ID ? parseInt(l.CURRENCY_ID, 10) : null;
    const currCode = currId && currMap[currId] ? currMap[currId] : '';
    const amt = l.AMOUNT ? parseFloat(l.AMOUNT) : null;
    const amtInr = l.AMOUNT_INR ? parseFloat(l.AMOUNT_INR) : null;
    const yr = l.YEAR ? parseInt(l.YEAR, 10) : null;
    const compId = l.COMPANY_ID ? parseInt(l.COMPANY_ID, 10) : null;
    const techs = techMap[leadId] ? Array.from(techMap[leadId]).join(', ') : '';
    const contacts = contactMap[leadId] ? contactMap[leadId].join(', ') : '';

    await pool.query(`
      INSERT INTO leads (
        lead_id, sr_no, company_name, company_id, company_url, company_type,
        name_of_coordinator, account_manager, industry, technology,
        lead_date, lead_time, city, country, probability, lead_type,
        status, status_detail, da, source, referrer, contract_no,
        currency_id, currency_code, amount, amount_in_inr, end_client, page_url,
        proposal, connection_sent, last_followup, reason, month, year,
        lost_won, contacts, created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40
      )
      ON CONFLICT (lead_id) DO UPDATE SET
        sr_no = EXCLUDED.sr_no,
        company_name = EXCLUDED.company_name,
        company_id = EXCLUDED.company_id,
        company_url = EXCLUDED.company_url,
        company_type = EXCLUDED.company_type,
        name_of_coordinator = EXCLUDED.name_of_coordinator,
        account_manager = EXCLUDED.account_manager,
        industry = EXCLUDED.industry,
        technology = EXCLUDED.technology,
        lead_date = EXCLUDED.lead_date,
        lead_time = EXCLUDED.lead_time,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        probability = EXCLUDED.probability,
        lead_type = EXCLUDED.lead_type,
        status = EXCLUDED.status,
        status_detail = EXCLUDED.status_detail,
        da = EXCLUDED.da,
        source = EXCLUDED.source,
        referrer = EXCLUDED.referrer,
        contract_no = EXCLUDED.contract_no,
        currency_id = EXCLUDED.currency_id,
        currency_code = EXCLUDED.currency_code,
        amount = EXCLUDED.amount,
        amount_in_inr = EXCLUDED.amount_in_inr,
        end_client = EXCLUDED.end_client,
        page_url = EXCLUDED.page_url,
        proposal = EXCLUDED.proposal,
        connection_sent = EXCLUDED.connection_sent,
        last_followup = EXCLUDED.last_followup,
        reason = EXCLUDED.reason,
        month = EXCLUDED.month,
        year = EXCLUDED.year,
        lost_won = EXCLUDED.lost_won,
        contacts = EXCLUDED.contacts,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date
    `, [
      leadId, srNo, l.COMPANY_NAME || '', compId, l.COMPANY_URL || '', l.COMPANY_TYPE || '',
      l.NAME_OF_COORDINATOR || '', l.ACCOUNT_MANAGER || '', l.INDUSTRY || '', techs,
      l.LEAD_DATE_FMT || '', l.LEAD_TIME || '', l.CITY || '', l.COUNTRY || '', l.PROBABILITY || '', l.LEAD_TYPE || '',
      l.STATUS || '', l.STATUS || '', l.DA || '', l.SOURCE || '', l.REFERRER || '', l.CONTRACT_NO || '',
      currId, currCode, amt, amtInr, l.END_CLIENT || '', l.PAGE_URL || '',
      l.PROPOSAL || 'No', l.CONNECTION_SENT || 'No', l.LAST_FOLLOWUP_FMT || '', l.REASON || '', l.MONTH || '', yr,
      l.LOST_WON || '', contacts, l.CREATED_BY || 'ADMIN', l.CREATED_DATE_FMT || '', l.UPDATED_BY || '', l.UPDATED_DATE_FMT || ''
    ]);
  }
  console.log(`Inserted ${leadRows.length} leads.`);

  // Sync LEAD_LINE
  console.log('Fetching CRM.LEAD_LINE...');
  const lines = await executeMcpSql(`
    SELECT 
      LEAD_LINE_ID, LEAD_ID, TECHNOLOGY, TECHNOLOGY_REQUIRED, EXPERIENCE, MODEL,
      CURRENCY_ID, RATE, NO_OF_RESOURCES, DURATION, AMOUNT, EXCHANGE_RATE_VALUE,
      AMOUNT_INR, REQUIRED_SERVICE, REQUIREMENT_DESCRIPTION, CV_MADE_BY, CV_SENT,
      LEAD_LINE_NO, CREATED_BY,
      TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE_FMT,
      MODIFIED_BY,
      TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE_FMT
    FROM CRM.LEAD_LINE
    ORDER BY LEAD_LINE_ID ASC
  `);
  console.log(`Received ${lines.length} lead lines.`);
  for (const ln of lines) {
    const lineId = parseInt(ln.LEAD_LINE_ID, 10);
    const leadId = parseInt(ln.LEAD_ID, 10);
    const currId = ln.CURRENCY_ID ? parseInt(ln.CURRENCY_ID, 10) : null;
    const currCode = currId && currMap[currId] ? currMap[currId] : '';
    await pool.query(`
      INSERT INTO lead_lines (
        lead_line_id, lead_id, lead_line_no, technology, technology_required, experience,
        model, currency_id, currency_code, rate, no_of_resources, duration,
        amount, exchange_rate_value, amount_in_inr, required_service,
        requirement_description, cv_made_by, cv_sent, created_by, created_date,
        modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23
      )
      ON CONFLICT (lead_line_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        lead_line_no = EXCLUDED.lead_line_no,
        technology = EXCLUDED.technology,
        technology_required = EXCLUDED.technology_required,
        experience = EXCLUDED.experience,
        model = EXCLUDED.model,
        currency_id = EXCLUDED.currency_id,
        currency_code = EXCLUDED.currency_code,
        rate = EXCLUDED.rate,
        no_of_resources = EXCLUDED.no_of_resources,
        duration = EXCLUDED.duration,
        amount = EXCLUDED.amount,
        exchange_rate_value = EXCLUDED.exchange_rate_value,
        amount_in_inr = EXCLUDED.amount_in_inr,
        required_service = EXCLUDED.required_service,
        requirement_description = EXCLUDED.requirement_description,
        cv_made_by = EXCLUDED.cv_made_by,
        cv_sent = EXCLUDED.cv_sent,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date
    `, [
      lineId, leadId, parseInt(ln.LEAD_LINE_NO, 10) || null,
      ln.TECHNOLOGY || '', ln.TECHNOLOGY_REQUIRED || '', ln.EXPERIENCE || '',
      ln.MODEL || '', currId, currCode, ln.RATE ? parseFloat(ln.RATE) : null,
      ln.NO_OF_RESOURCES || '', ln.DURATION || '', ln.AMOUNT ? parseFloat(ln.AMOUNT) : null,
      ln.EXCHANGE_RATE_VALUE ? parseFloat(ln.EXCHANGE_RATE_VALUE) : null,
      ln.AMOUNT_INR ? parseFloat(ln.AMOUNT_INR) : null, ln.REQUIRED_SERVICE || '',
      ln.REQUIREMENT_DESCRIPTION || '', ln.CV_MADE_BY || '', ln.CV_SENT || '',
      ln.CREATED_BY || 'ADMIN', ln.CREATED_DATE_FMT || '', ln.MODIFIED_BY || '', ln.MODIFIED_DATE_FMT || ''
    ]);
  }
  console.log(`Inserted ${lines.length} lead lines.`);

  // Sync LEAD_CONTACT
  console.log('Fetching CRM.LEAD_CONTACT...');
  const leadContacts = await executeMcpSql(`
    SELECT 
      LEAD_CONTACT_ID, LEAD_ID, CONTACT_ID, CLIENT_FULL_NAME, DESIGNATION,
      EMAIL, MOBILE_NUMBER, INTERVIEW_STATUS, PROPOSAL, CONNECTION_SENT,
      LINKEDIN_URL, POSITION, DEPARTMENT, ROLE, CREATED_BY,
      TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE_FMT,
      MODIFIED_BY,
      TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE_FMT
    FROM CRM.LEAD_CONTACT
    ORDER BY LEAD_CONTACT_ID ASC
  `);
  console.log(`Received ${leadContacts.length} lead contacts.`);
  for (const lc of leadContacts) {
    const lcId = parseInt(lc.LEAD_CONTACT_ID, 10);
    const leadId = parseInt(lc.LEAD_ID, 10);
    const contactId = lc.CONTACT_ID ? parseInt(lc.CONTACT_ID, 10) : null;
    await pool.query(`
      INSERT INTO lead_contacts (
        lead_contact_id, lead_id, contact_id, client_full_name, designation,
        position, email, mobile_number, interview_status, proposal,
        connection_sent, linkedin_url, department, role,
        created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18
      )
      ON CONFLICT (lead_contact_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        contact_id = EXCLUDED.contact_id,
        client_full_name = EXCLUDED.client_full_name,
        designation = EXCLUDED.designation,
        position = EXCLUDED.position,
        email = EXCLUDED.email,
        mobile_number = EXCLUDED.mobile_number,
        interview_status = EXCLUDED.interview_status,
        proposal = EXCLUDED.proposal,
        connection_sent = EXCLUDED.connection_sent,
        linkedin_url = EXCLUDED.linkedin_url,
        department = EXCLUDED.department,
        role = EXCLUDED.role,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date
    `, [
      lcId, leadId, contactId, lc.CLIENT_FULL_NAME || '', lc.DESIGNATION || '',
      lc.POSITION || '', lc.EMAIL || '', lc.MOBILE_NUMBER || '', lc.INTERVIEW_STATUS || '',
      lc.PROPOSAL || '', lc.CONNECTION_SENT || '', lc.LINKEDIN_URL || '',
      lc.DEPARTMENT || '', lc.ROLE || '', lc.CREATED_BY || 'ADMIN', lc.CREATED_DATE_FMT || '',
      lc.MODIFIED_BY || '', lc.MODIFIED_DATE_FMT || ''
    ]);
  }
  console.log(`Inserted ${leadContacts.length} lead contacts.`);

  // Sync NAUKRI_ADVERTISEMENT
  console.log('Fetching CRM.NAUKRI_ADVERTISEMENT...');
  const naukri = await executeMcpSql(`
    SELECT 
      NAUKRI_AD_ID, LEAD_ID, AD_NAME, DESIGNATION,
      TO_CHAR(DATE_OF_AD_POSTING, 'DD-MON-YYYY') as DATE_POSTING_FMT,
      EXPERIENCE, CV_RECEIVED, CV_JOIN_IMMEDIATELY, COST_OF_AD,
      ATTACHMENT_FILENAME, ATTACHMENT_MIME_TYPE, ATTACHMENT_DESCRIPTION,
      ATTACHMENT_TYPE, CREATED_BY,
      TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE_FMT,
      MODIFIED_BY,
      TO_CHAR(MODIFIED_DATE, 'DD-MON-YYYY') as MODIFIED_DATE_FMT,
      TECHNOLOGY
    FROM CRM.NAUKRI_ADVERTISEMENT
    ORDER BY NAUKRI_AD_ID ASC
  `);
  console.log(`Received ${naukri.length} naukri ads.`);
  for (const n of naukri) {
    const nid = parseInt(n.NAUKRI_AD_ID, 10);
    const leadId = parseInt(n.LEAD_ID, 10);
    await pool.query(`
      INSERT INTO naukri_advertisements (
        naukri_ad_id, lead_id, ad_name, designation, date_of_ad_posting,
        experience, cv_received, cv_join_immediately, cost_of_ad,
        technology, attachment_filename, attachment_mime_type, attachment_description,
        attachment_type, created_by, created_date, modified_by, modified_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18
      )
      ON CONFLICT (naukri_ad_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        ad_name = EXCLUDED.ad_name,
        designation = EXCLUDED.designation,
        date_of_ad_posting = EXCLUDED.date_of_ad_posting,
        experience = EXCLUDED.experience,
        cv_received = EXCLUDED.cv_received,
        cv_join_immediately = EXCLUDED.cv_join_immediately,
        cost_of_ad = EXCLUDED.cost_of_ad,
        technology = EXCLUDED.technology,
        attachment_filename = EXCLUDED.attachment_filename,
        attachment_mime_type = EXCLUDED.attachment_mime_type,
        attachment_description = EXCLUDED.attachment_description,
        attachment_type = EXCLUDED.attachment_type,
        modified_by = EXCLUDED.modified_by,
        modified_date = EXCLUDED.modified_date
    `, [
      nid, leadId, n.AD_NAME || '', n.DESIGNATION || '', n.DATE_POSTING_FMT || '',
      n.EXPERIENCE ? parseFloat(n.EXPERIENCE) : null,
      n.CV_RECEIVED ? parseInt(n.CV_RECEIVED, 10) : null,
      n.CV_JOIN_IMMEDIATELY ? parseInt(n.CV_JOIN_IMMEDIATELY, 10) : null,
      n.COST_OF_AD ? parseFloat(n.COST_OF_AD) : null,
      n.TECHNOLOGY || '', n.ATTACHMENT_FILENAME || '', n.ATTACHMENT_MIME_TYPE || '',
      n.ATTACHMENT_DESCRIPTION || '', n.ATTACHMENT_TYPE || '',
      n.CREATED_BY || 'ADMIN', n.CREATED_DATE_FMT || '', n.MODIFIED_BY || '', n.MODIFIED_DATE_FMT || ''
    ]);
  }
  console.log(`Inserted ${naukri.length} naukri ads.`);

  // Sync PROPOSALS
  console.log('Fetching CRM.PROPOSALS...');
  const proposals = await executeMcpSql(`
    SELECT 
      PROPOSAL_ID, LEAD_ID, PROPOSAL_NUMBER,
      TO_CHAR(DATE_SENT, 'DD-MON-YYYY') as DATE_SENT_FMT,
      PROPOSAL_DESCRIPTION, FILE_NAME, MIME_TYPE, CREATED_BY,
      TO_CHAR(CREATED_DATE, 'DD-MON-YYYY') as CREATED_DATE_FMT
    FROM CRM.PROPOSALS
    ORDER BY PROPOSAL_ID ASC
  `);
  console.log(`Received ${proposals.length} proposals.`);
  for (const p of proposals) {
    const pid = parseInt(p.PROPOSAL_ID, 10);
    const leadId = parseInt(p.LEAD_ID, 10);
    await pool.query(`
      INSERT INTO lead_proposals (
        proposal_id, lead_id, proposal_number, date_sent, proposal_description,
        file_name, mime_type, created_by, created_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (proposal_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        proposal_number = EXCLUDED.proposal_number,
        date_sent = EXCLUDED.date_sent,
        proposal_description = EXCLUDED.proposal_description,
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type
    `, [
      pid, leadId, p.PROPOSAL_NUMBER || '', p.DATE_SENT_FMT || '',
      p.PROPOSAL_DESCRIPTION || '', p.FILE_NAME || '', p.MIME_TYPE || '',
      p.CREATED_BY || 'ADMIN', p.CREATED_DATE_FMT || ''
    ]);
  }
  console.log(`Inserted ${proposals.length} proposals.`);

  // Align sequences
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS leads_id_seq`);
  await pool.query(`SELECT setval('leads_id_seq', COALESCE((SELECT MAX(lead_id) FROM leads), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS lead_lines_id_seq`);
  await pool.query(`SELECT setval('lead_lines_id_seq', COALESCE((SELECT MAX(lead_line_id) FROM lead_lines), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS lead_contacts_id_seq`);
  await pool.query(`SELECT setval('lead_contacts_id_seq', COALESCE((SELECT MAX(lead_contact_id) FROM lead_contacts), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS naukri_ads_id_seq`);
  await pool.query(`SELECT setval('naukri_ads_id_seq', COALESCE((SELECT MAX(naukri_ad_id) FROM naukri_advertisements), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS lead_proposals_id_seq`);
  await pool.query(`SELECT setval('lead_proposals_id_seq', COALESCE((SELECT MAX(proposal_id) FROM lead_proposals), 1))`).catch(() => {});
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS lead_resources_id_seq`);
  await pool.query(`SELECT setval('lead_resources_id_seq', COALESCE((SELECT MAX(resource_id) FROM lead_resources), 1))`).catch(() => {});

  console.log('--- ALL LEAD TABLES AND DATA SUCCESSFULLY SYNCED ---');
}

syncLeads().then(() => {
  console.log('Sync finished successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});

