/**
 * Complete Database Synchronizer: Oracle APEX (MCP) -> PostgreSQL
 * Synchronizes all entities, reports, error tables, and master LOVs.
 */
const { execSync } = require('child_process');
const path = require('path');
const { pool } = require('../server/db/pool');

function runStep(label, scriptPath) {
  console.log(`\n======================================================`);
  console.log(`>>> RUNNING: ${label}`);
  console.log(`======================================================`);
  const fullPath = path.join(__dirname, '..', scriptPath);
  execSync(`node "${fullPath}"`, { stdio: 'inherit' });
}

async function verifyCounts() {
  console.log('\n======================================================');
  console.log('>>> FINAL VERIFICATION OF POSTGRESQL DATABASE');
  console.log('======================================================\n');

  const tables = [
    ['Companies', 'companies'],
    ['Contacts', 'contacts'],
    ['Leads', 'leads'],
    ['Lead Lines', 'lead_lines'],
    ['Lead Contacts', 'lead_contacts'],
    ['Lead Proposals', 'lead_proposals'],
    ['Naukri Advertisements', 'naukri_advertisements'],
    ['Company Incorrect Data', 'company_incorrect_data'],
    ['Contact Incorrect Data', 'contact_incorrect_data'],
    ['Master Designation & Positions', 'master_designation_positions'],
    ['Country & City Mappings', 'country_city_mapping'],
    ['Master Industries', 'master_industries'],
    ['Master Countries', 'master_countries'],
    ['Master Sources', 'master_sources'],
    ['Master Technologies', 'master_technologies'],
    ['Master Salespersons', 'master_salespersons'],
    ['Master Salesperson Emails', 'master_salesperson_emails'],
    ['Master Position Types', 'master_position_types'],
    ['Master LinkedIn Accounts', 'master_linkedin_accounts'],
    ['Master Company Sizes', 'master_company_sizes'],
    ['Master Company Types', 'master_company_types'],
    ['Master Company Categories', 'master_company_categories'],
    ['Master Contact Statuses', 'master_contact_statuses'],
    ['Master Account Managers', 'master_account_managers'],
    ['Currencies', 'currencies'],
    ['Users', 'users']
  ];

  for (const [label, tableName] of tables) {
    try {
      const res = await pool.query(`SELECT count(*)::int as cnt FROM ${tableName}`);
      console.log(`✔ ${label.padEnd(32)}: ${res.rows[0].cnt.toLocaleString()} rows`);
    } catch (e) {
      console.log(`✖ ${label.padEnd(32)}: ERROR (${e.message})`);
    }
  }
}

async function main() {
  const startTime = Date.now();
  console.log('======================================================');
  console.log('STARTING FULL APEX TO POSTGRESQL DATABASE SYNC');
  console.log('======================================================');

  // Step 1: Masters (Core)
  runStep('Core Masters Sync', 'sync_masters_to_pg.js');
  runStep('Industries Master Sync', 'sync_industry.js');
  runStep('Designation & Positions Master Sync', 'sync_desig_to_pg.js');
  runStep('Salespersons Master Sync', 'sync_salesperson.js');
  runStep('Position Types Master Sync', 'sync_position_type.js');
  runStep('LinkedIn Accounts Master Sync', 'sync_linkedin.js');

  // Step 2: Leads & Sub-entities
  runStep('Leads & Proposals Sync', 'scripts/sync_leads_from_mcp.js');

  // Step 3: Incorrect Data (Validation Error Tables)
  runStep('Incorrect / Invalid Data Sync', 'scripts/sync_incorrect_data.js');

  // Step 4: Companies and Contacts
  runStep('Full Companies & Contacts Sync', 'scripts/sync_companies_and_contacts_full.js');

  // Step 5: Verification
  await verifyCounts();

  console.log(`\n======================================================`);
  console.log(`SYNC COMPLETE IN ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
  console.log(`======================================================`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
}
