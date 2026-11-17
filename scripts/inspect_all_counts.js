const { pool } = require('../server/db/pool');

async function inspectAllCounts() {
  const tables = [
    'companies',
    'contacts',
    'leads',
    'lead_lines',
    'lead_contacts',
    'lead_proposals',
    'lead_resources',
    'naukri_advertisements',
    'company_incorrect_data',
    'contact_incorrect_data',
    'merge_history',
    'master_company_types',
    'master_company_sizes',
    'master_industries',
    'master_countries',
    'country_city_mapping',
    'master_position_types',
    'master_salespersons',
    'master_salesperson_emails',
    'master_designation_positions',
    'master_linkedin_accounts',
    'master_technologies',
    'master_sources',
    'master_contact_statuses',
    'master_account_managers',
    'master_company_categories',
    'currencies',
    'users'
  ];

  console.log('--- Current PostgreSQL Table Counts ---');
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT count(*)::int as cnt FROM ${t}`);
      console.log(`${t}: ${res.rows[0].cnt}`);
    } catch (e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }
  process.exit(0);
}

inspectAllCounts();
