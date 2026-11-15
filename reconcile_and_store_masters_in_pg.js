const { pool } = require('./server/db/pool');

function formatToday() {
  const d = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

async function reconcileMasters() {
  const client = await pool.connect();
  const today = formatToday();

  try {
    await client.query('BEGIN');
    console.log('=== STARTING MASTER RECONCILIATION & STORAGE IN POSTGRESQL ===\n');

    await client.query('ALTER TABLE master_industries ADD COLUMN IF NOT EXISTS company_count INT DEFAULT 0;');

    // ------------------------------------------------------------------------
    // 1. RECONCILE MASTER_DESIGNATION_POSITIONS
    // ------------------------------------------------------------------------
    console.log('1. Reconciling master_designation_positions...');
    // A. Delete master records that have NO contacts
    const delDesig = await client.query(`
      DELETE FROM master_designation_positions m
      WHERE NOT EXISTS (
        SELECT 1 FROM contacts c
        WHERE LOWER(TRIM(COALESCE(c.designation, ''))) = LOWER(TRIM(COALESCE(m.designation, '')))
      )
    `);
    console.log(`   - Removed ${delDesig.rowCount} unused phantom designation records.`);

    // B. Insert any (designation, pos_type) from contacts that is missing from master
    const insertDesig = await client.query(`
      WITH missing_contacts AS (
        SELECT 
          TRIM(c.designation) as designation,
          COALESCE(TRIM(c.pos_type), '') as pos_type,
          COUNT(*)::int as cnt
        FROM contacts c
        WHERE c.designation IS NOT NULL AND TRIM(c.designation) != ''
        GROUP BY TRIM(c.designation), COALESCE(TRIM(c.pos_type), '')
      )
      INSERT INTO master_designation_positions (id, designation, position_type, created_by, created_date, modified_by, modified_date, designation_count, position_type_count)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_designation_positions), 0) + ROW_NUMBER() OVER () as id,
        mc.designation,
        mc.pos_type,
        'ADMIN',
        '09-SEP-2026',
        'AMAAN',
        '27-OCT-2026',
        mc.cnt,
        mc.cnt
      FROM missing_contacts mc
      WHERE NOT EXISTS (
        SELECT 1 FROM master_designation_positions m
        WHERE LOWER(TRIM(COALESCE(m.designation, ''))) = LOWER(TRIM(COALESCE(mc.designation, '')))
          AND LOWER(TRIM(COALESCE(m.position_type, ''))) = LOWER(TRIM(COALESCE(mc.pos_type, '')))
      )
    `);
    console.log(`   - Inserted ${insertDesig.rowCount} missing designation-position pairs from contacts.`);

    // C. Update actual dynamic counts in master_designation_positions
    await client.query(`
      WITH counts AS (
        SELECT 
          LOWER(TRIM(designation)) as desig,
          LOWER(TRIM(COALESCE(pos_type, ''))) as pos,
          COUNT(*)::int as pair_cnt,
          SUM(COUNT(*)::int) OVER (PARTITION BY LOWER(TRIM(designation))) as total_cnt
        FROM contacts
        WHERE designation IS NOT NULL AND TRIM(designation) != ''
        GROUP BY LOWER(TRIM(designation)), LOWER(TRIM(COALESCE(pos_type, '')))
      )
      UPDATE master_designation_positions m
      SET designation_count = c.total_cnt,
          position_type_count = c.pair_cnt
      FROM counts c
      WHERE LOWER(TRIM(m.designation)) = c.desig
        AND LOWER(TRIM(COALESCE(m.position_type, ''))) = c.pos
    `);

    const finalDesigCount = (await client.query('SELECT count(*) FROM master_designation_positions')).rows[0].count;
    console.log(`   -> Total master_designation_positions now stored in PostgreSQL: ${finalDesigCount}`);

    // ------------------------------------------------------------------------
    // 2. RECONCILE MASTER_INDUSTRIES
    // ------------------------------------------------------------------------
    console.log('\n2. Reconciling master_industries...');
    // A. Delete master industries that do NOT exist in companies
    const delInd = await client.query(`
      DELETE FROM master_industries m
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c
        WHERE LOWER(TRIM(COALESCE(c.industry, ''))) = LOWER(TRIM(COALESCE(m.industry, '')))
          AND (
            m.company_type IS NULL OR m.company_type = '' OR
            LOWER(TRIM(COALESCE(c.company_type, ''))) = LOWER(TRIM(COALESCE(m.company_type, '')))
          )
      )
    `);
    console.log(`   - Removed ${delInd.rowCount} unused phantom industry records.`);

    // B. Insert any (industry, company_type) from companies that is missing from master
    const insertInd = await client.query(`
      WITH comp_ind AS (
        SELECT 
          COALESCE(TRIM(c.industry), '') as industry,
          COALESCE(TRIM(c.company_type), '') as company_type,
          COUNT(*)::int as cnt
        FROM companies c
        WHERE (c.industry IS NOT NULL AND TRIM(c.industry) != '')
           OR (c.company_type IS NOT NULL AND TRIM(c.company_type) != '')
        GROUP BY COALESCE(TRIM(c.industry), ''), COALESCE(TRIM(c.company_type), '')
      )
      INSERT INTO master_industries (id, industry, company_type, created_by, created_date, modified_by, modified_date, company_count)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_industries), 0) + ROW_NUMBER() OVER () as id,
        ci.industry,
        ci.company_type,
        'APEX_PUBLIC_USER',
        '20-JUL-2026',
        'ADMIN',
        '28-SEP-2026',
        ci.cnt
      FROM comp_ind ci
      WHERE NOT EXISTS (
        SELECT 1 FROM master_industries m
        WHERE LOWER(TRIM(COALESCE(m.industry, ''))) = LOWER(TRIM(COALESCE(ci.industry, '')))
          AND LOWER(TRIM(COALESCE(m.company_type, ''))) = LOWER(TRIM(COALESCE(ci.company_type, '')))
      )
    `);
    console.log(`   - Inserted ${insertInd.rowCount} missing industry pairs from companies.`);

    // C. Update actual company_count in master_industries
    await client.query(`
      WITH actual_ind_counts AS (
        SELECT 
          LOWER(TRIM(COALESCE(industry, ''))) as ind,
          LOWER(TRIM(COALESCE(company_type, ''))) as ctype,
          COUNT(*)::int as cnt
        FROM companies
        GROUP BY LOWER(TRIM(COALESCE(industry, ''))), LOWER(TRIM(COALESCE(company_type, '')))
      )
      UPDATE master_industries m
      SET company_count = COALESCE(ac.cnt, 0)
      FROM actual_ind_counts ac
      WHERE LOWER(TRIM(COALESCE(m.industry, ''))) = ac.ind
        AND LOWER(TRIM(COALESCE(m.company_type, ''))) = ac.ctype
    `);

    const finalIndCount = (await client.query('SELECT count(*) FROM master_industries')).rows[0].count;
    console.log(`   -> Total master_industries now stored in PostgreSQL: ${finalIndCount}`);

    // ------------------------------------------------------------------------
    // 3. RECONCILE COUNTRY_CITY_MAPPING
    // ------------------------------------------------------------------------
    console.log('\n3. Reconciling country_city_mapping...');
    // A. Delete mappings that do NOT exist in companies
    const delCC = await client.query(`
      DELETE FROM country_city_mapping m
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c
        WHERE LOWER(TRIM(COALESCE(c.country, ''))) = LOWER(TRIM(COALESCE(m.country, '')))
          AND LOWER(TRIM(COALESCE(c.city, ''))) = LOWER(TRIM(COALESCE(m.city, '')))
      )
    `);
    console.log(`   - Removed ${delCC.rowCount} unused phantom country-city mappings.`);

    // B. Insert any (country, city) from companies that is missing
    const insertCC = await client.query(`
      WITH comp_cc AS (
        SELECT 
          TRIM(c.country) as country,
          COALESCE(TRIM(c.city), '') as city
        FROM companies c
        WHERE c.country IS NOT NULL AND TRIM(c.country) != ''
        GROUP BY TRIM(c.country), COALESCE(TRIM(c.city), '')
      )
      INSERT INTO country_city_mapping (id, country, city, created_by, created_date, modified_by, modified_date)
      SELECT 
        COALESCE((SELECT MAX(id) FROM country_city_mapping), 0) + ROW_NUMBER() OVER () as id,
        cc.country,
        cc.city,
        'APEX_PUBLIC_USER',
        '08-SEP-2026',
        'ZAIN_DATEY',
        '06-NOV-2026'
      FROM comp_cc cc
      WHERE NOT EXISTS (
        SELECT 1 FROM country_city_mapping m
        WHERE LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(cc.country, '')))
          AND LOWER(TRIM(COALESCE(m.city, ''))) = LOWER(TRIM(COALESCE(cc.city, '')))
      )
    `);
    console.log(`   - Inserted ${insertCC.rowCount} missing country-city mappings from companies.`);

    const finalCCCount = (await client.query('SELECT count(*) FROM country_city_mapping')).rows[0].count;
    console.log(`   -> Total country_city_mapping now stored in PostgreSQL: ${finalCCCount}`);

    // ------------------------------------------------------------------------
    // 4. RECONCILE MASTER_COUNTRIES
    // ------------------------------------------------------------------------
    console.log('\n4. Reconciling master_countries...');
    // A. Delete countries that do NOT exist in companies or contacts
    const delCountries = await client.query(`
      DELETE FROM master_countries m
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c
        WHERE LOWER(TRIM(COALESCE(c.country, ''))) = LOWER(TRIM(COALESCE(m.country, '')))
      ) AND NOT EXISTS (
        SELECT 1 FROM contacts ct
        WHERE LOWER(TRIM(COALESCE(ct.country, ''))) = LOWER(TRIM(COALESCE(m.country, '')))
      )
    `);
    console.log(`   - Removed ${delCountries.rowCount} unused phantom country records.`);

    // B. Insert any country from companies or contacts that is missing
    const insertCountries = await client.query(`
      WITH all_countries AS (
        SELECT TRIM(country) as country FROM companies WHERE country IS NOT NULL AND TRIM(country) != ''
        UNION
        SELECT TRIM(country) as country FROM contacts WHERE country IS NOT NULL AND TRIM(country) != ''
      )
      INSERT INTO master_countries (id, country, master_count, created_by, created_date, modified_by, modified_date)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_countries), 0) + ROW_NUMBER() OVER () as id,
        ac.country,
        0,
        'APEX_PUBLIC_USER',
        '20-JUL-2026',
        'AMAAN',
        '10-NOV-2026'
      FROM all_countries ac
      WHERE NOT EXISTS (
        SELECT 1 FROM master_countries m
        WHERE LOWER(TRIM(COALESCE(m.country, ''))) = LOWER(TRIM(COALESCE(ac.country, '')))
      )
    `);
    console.log(`   - Inserted ${insertCountries.rowCount} missing countries.`);

    // C. Update actual company counts in master_countries
    await client.query(`
      WITH country_cnts AS (
        SELECT LOWER(TRIM(country)) as c_name, COUNT(*)::int as cnt
        FROM companies
        WHERE country IS NOT NULL AND TRIM(country) != ''
        GROUP BY LOWER(TRIM(country))
      )
      UPDATE master_countries m
      SET master_count = COALESCE(cc.cnt, 0)
      FROM country_cnts cc
      WHERE LOWER(TRIM(m.country)) = cc.c_name
    `);

    const finalCountryCount = (await client.query('SELECT count(*) FROM master_countries')).rows[0].count;
    console.log(`   -> Total master_countries now stored in PostgreSQL: ${finalCountryCount}`);

    // ------------------------------------------------------------------------
    // 5. RECONCILE MASTER_TECHNOLOGIES
    // ------------------------------------------------------------------------
    console.log('\n5. Reconciling master_technologies...');
    // A. Delete technologies not in companies
    const delTech = await client.query(`
      DELETE FROM master_technologies m
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c
        WHERE LOWER(TRIM(COALESCE(c.technology, ''))) = LOWER(TRIM(COALESCE(m.technology, '')))
           OR LOWER(COALESCE(c.technology, '')) LIKE '%' || LOWER(TRIM(COALESCE(m.technology, ''))) || '%'
      )
    `);
    console.log(`   - Removed ${delTech.rowCount} unused technologies.`);

    // B. Insert distinct technologies from companies
    const insertTech = await client.query(`
      WITH comp_tech AS (
        SELECT DISTINCT TRIM(technology) as technology
        FROM companies
        WHERE technology IS NOT NULL AND TRIM(technology) != ''
      )
      INSERT INTO master_technologies (id, technology, technology_category, master_count, created_by, created_date, modified_by, modified_date)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_technologies), 0) + ROW_NUMBER() OVER () as id,
        ct.technology,
        'General',
        0,
        'APEX_PUBLIC_USER',
        '20-JUL-2026',
        'ADMIN',
        '28-SEP-2026'
      FROM comp_tech ct
      WHERE NOT EXISTS (
        SELECT 1 FROM master_technologies m
        WHERE LOWER(TRIM(COALESCE(m.technology, ''))) = LOWER(TRIM(COALESCE(ct.technology, '')))
      )
    `);
    console.log(`   - Inserted ${insertTech.rowCount} missing technologies from companies.`);

    // C. Update count
    await client.query(`
      WITH tech_counts AS (
        SELECT LOWER(TRIM(technology)) as tech, COUNT(*)::int as cnt
        FROM companies
        WHERE technology IS NOT NULL AND TRIM(technology) != ''
        GROUP BY LOWER(TRIM(technology))
      )
      UPDATE master_technologies m
      SET master_count = COALESCE(tc.cnt, 0)
      FROM tech_counts tc
      WHERE LOWER(TRIM(m.technology)) = tc.tech
    `);

    const finalTechCount = (await client.query('SELECT count(*) FROM master_technologies')).rows[0].count;
    console.log(`   -> Total master_technologies now stored in PostgreSQL: ${finalTechCount}`);

    // ------------------------------------------------------------------------
    // 6. RECONCILE MASTER_SOURCES
    // ------------------------------------------------------------------------
    console.log('\n6. Reconciling master_sources...');
    const delSrc = await client.query(`
      DELETE FROM master_sources m
      WHERE NOT EXISTS (
        SELECT 1 FROM companies c WHERE LOWER(TRIM(COALESCE(c.source, ''))) = LOWER(TRIM(COALESCE(m.source, '')))
      ) AND NOT EXISTS (
        SELECT 1 FROM contacts ct WHERE LOWER(TRIM(COALESCE(ct.source, ''))) = LOWER(TRIM(COALESCE(m.source, '')))
      )
    `);
    console.log(`   - Removed ${delSrc.rowCount} unused sources.`);

    const insertSrc = await client.query(`
      WITH all_sources AS (
        SELECT TRIM(source) as source FROM companies WHERE source IS NOT NULL AND TRIM(source) != ''
        UNION
        SELECT TRIM(source) as source FROM contacts WHERE source IS NOT NULL AND TRIM(source) != ''
      )
      INSERT INTO master_sources (id, source, master_count, contact_count, created_by, created_date, modified_by, modified_date)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_sources), 0) + ROW_NUMBER() OVER () as id,
        asrc.source,
        0,
        0,
        'APEX_PUBLIC_USER',
        '20-JUL-2026',
        'ADMIN',
        '28-SEP-2026'
      FROM all_sources asrc
      WHERE NOT EXISTS (
        SELECT 1 FROM master_sources m
        WHERE LOWER(TRIM(COALESCE(m.source, ''))) = LOWER(TRIM(COALESCE(asrc.source, '')))
      )
    `);
    console.log(`   - Inserted ${insertSrc.rowCount} missing sources.`);

    await client.query(`
      WITH comp_src AS (
        SELECT LOWER(TRIM(source)) as src, COUNT(*)::int as cnt
        FROM companies WHERE source IS NOT NULL AND TRIM(source) != '' GROUP BY LOWER(TRIM(source))
      ),
      cont_src AS (
        SELECT LOWER(TRIM(source)) as src, COUNT(*)::int as cnt
        FROM contacts WHERE source IS NOT NULL AND TRIM(source) != '' GROUP BY LOWER(TRIM(source))
      )
      UPDATE master_sources m
      SET master_count = COALESCE(cs.cnt, 0),
          contact_count = COALESCE(cts.cnt, 0)
      FROM comp_src cs
      FULL OUTER JOIN cont_src cts ON cs.src = cts.src
      WHERE LOWER(TRIM(m.source)) = COALESCE(cs.src, cts.src)
    `);

    const finalSrcCount = (await client.query('SELECT count(*) FROM master_sources')).rows[0].count;
    console.log(`   -> Total master_sources now stored in PostgreSQL: ${finalSrcCount}`);

    // ------------------------------------------------------------------------
    // 7. RECONCILE MASTER_COMPANY_SIZES
    // ------------------------------------------------------------------------
    console.log('\n7. Updating master_company_sizes counts...');
    await client.query(`
      WITH size_cnts AS (
        SELECT LOWER(TRIM(employee_size)) as sz, COUNT(*)::int as cnt
        FROM companies WHERE employee_size IS NOT NULL AND TRIM(employee_size) != '' GROUP BY LOWER(TRIM(employee_size))
      )
      UPDATE master_company_sizes m
      SET master_count = COALESCE(sc.cnt, 0)
      FROM size_cnts sc
      WHERE LOWER(TRIM(m.master_company_size)) = sc.sz
    `);
    const finalSizeCount = (await client.query('SELECT count(*) FROM master_company_sizes')).rows[0].count;
    console.log(`   -> Total master_company_sizes in PostgreSQL: ${finalSizeCount}`);

    // ------------------------------------------------------------------------
    // 8. RECONCILE MASTER_COMPANY_TYPES
    // ------------------------------------------------------------------------
    console.log('\n8. Reconciling master_company_types...');
    const insertType = await client.query(`
      WITH comp_types AS (
        SELECT DISTINCT TRIM(company_type) as ctype FROM companies WHERE company_type IS NOT NULL AND TRIM(company_type) != ''
      )
      INSERT INTO master_company_types (id, master_company_type, master_count, created_by, created_date, modified_by, modified_date)
      SELECT 
        COALESCE((SELECT MAX(id) FROM master_company_types), 0) + ROW_NUMBER() OVER () as id,
        ct.ctype,
        0,
        'APEX_PUBLIC_USER',
        '20-JUL-2026',
        'ZAIN_DATEY',
        '07-NOV-2026'
      FROM comp_types ct
      WHERE NOT EXISTS (
        SELECT 1 FROM master_company_types m WHERE LOWER(TRIM(COALESCE(m.master_company_type, ''))) = LOWER(TRIM(COALESCE(ct.ctype, '')))
      )
    `);
    console.log(`   - Inserted ${insertType.rowCount} missing company types.`);

    await client.query(`
      WITH type_cnts AS (
        SELECT LOWER(TRIM(company_type)) as ct, COUNT(*)::int as cnt
        FROM companies WHERE company_type IS NOT NULL AND TRIM(company_type) != '' GROUP BY LOWER(TRIM(company_type))
      )
      UPDATE master_company_types m
      SET master_count = COALESCE(tc.cnt, 0)
      FROM type_cnts tc
      WHERE LOWER(TRIM(m.master_company_type)) = tc.ct
    `);
    const finalTypeCount = (await client.query('SELECT count(*) FROM master_company_types')).rows[0].count;
    console.log(`   -> Total master_company_types in PostgreSQL: ${finalTypeCount}`);

    // ------------------------------------------------------------------------
    // 9. RECONCILE MASTER_COMPANY_CATEGORIES
    // ------------------------------------------------------------------------
    console.log('\n9. Reconciling master_company_categories...');
    await client.query(`
      WITH cat_cnts AS (
        SELECT LOWER(TRIM(company_categories)) as cc, COUNT(*)::int as cnt
        FROM companies WHERE company_categories IS NOT NULL AND TRIM(company_categories) != '' GROUP BY LOWER(TRIM(company_categories))
      )
      UPDATE master_company_categories m
      SET master_count = COALESCE(cc.cnt, 0)
      FROM cat_cnts cc
      WHERE LOWER(TRIM(m.company_categories)) = cc.cc
    `);
    const finalCatCount = (await client.query('SELECT count(*) FROM master_company_categories')).rows[0].count;
    console.log(`   -> Total master_company_categories in PostgreSQL: ${finalCatCount}`);

    // ------------------------------------------------------------------------
    // 10. RECONCILE MASTER_POSITION_TYPES
    // ------------------------------------------------------------------------
    console.log('\n10. Reconciling master_position_types...');
    await client.query(`
      WITH pos_cnts AS (
        SELECT LOWER(TRIM(pos_type)) as pt, COUNT(*)::int as cnt
        FROM contacts WHERE pos_type IS NOT NULL AND TRIM(pos_type) != '' GROUP BY LOWER(TRIM(pos_type))
      )
      UPDATE master_position_types m
      SET contact_count = COALESCE(pc.cnt, 0)
      FROM pos_cnts pc
      WHERE LOWER(TRIM(m.pos_type)) = pc.pt
    `);
    const finalPosCount = (await client.query('SELECT count(*) FROM master_position_types')).rows[0].count;
    console.log(`   -> Total master_position_types in PostgreSQL: ${finalPosCount}`);

    // ------------------------------------------------------------------------
    // 11. RECONCILE MASTER_SALESPERSONS
    // ------------------------------------------------------------------------
    console.log('\n11. Reconciling master_salespersons...');
    await client.query(`
      WITH sp_cnts AS (
        SELECT LOWER(TRIM(salesperson)) as sp, COUNT(*)::int as cnt
        FROM contacts WHERE salesperson IS NOT NULL AND TRIM(salesperson) != '' GROUP BY LOWER(TRIM(salesperson))
      )
      UPDATE master_salespersons m
      SET contact_count = COALESCE(sc.cnt, 0)
      FROM sp_cnts sc
      WHERE LOWER(TRIM(m.salesperson)) = sc.sp
    `);
    const finalSpCount = (await client.query('SELECT count(*) FROM master_salespersons')).rows[0].count;
    console.log(`   -> Total master_salespersons in PostgreSQL: ${finalSpCount}`);

    // ------------------------------------------------------------------------
    // 12. RECONCILE MASTER_SALESPERSON_EMAILS
    // ------------------------------------------------------------------------
    console.log('\n12. Reconciling master_salesperson_emails...');
    // Refresh aggregated emails list in master_salespersons
    await client.query(`
      WITH numbered AS (
        SELECT 
          sales_person_id,
          ROW_NUMBER() OVER(PARTITION BY sales_person_id ORDER BY email_id) as rn,
          email_address
        FROM master_salesperson_emails
      ),
      aggregated AS (
        SELECT 
          sales_person_id,
          STRING_AGG(rn || '. ' || email_address, E'\n' ORDER BY rn) as email_list
        FROM numbered
        GROUP BY sales_person_id
      )
      UPDATE master_salespersons m
      SET emails = COALESCE(a.email_list, '')
      FROM aggregated a
      WHERE m.id = a.sales_person_id;
    `);
    const finalEmailCount = (await client.query('SELECT count(*) FROM master_salesperson_emails')).rows[0].count;
    console.log(`   -> Total master_salesperson_emails in PostgreSQL: ${finalEmailCount}`);

    // ------------------------------------------------------------------------
    // 13. RE-ALIGN ALL POSTGRESQL SEQUENCES
    // ------------------------------------------------------------------------
    console.log('\n13. Re-aligning all PostgreSQL auto-increment sequences...');
    const tables = [
      'master_designation_positions',
      'master_industries',
      'country_city_mapping',
      'master_countries',
      'master_technologies',
      'master_sources',
      'master_company_sizes',
      'master_company_types',
      'master_company_categories',
      'master_linkedin_accounts',
      'master_position_types',
      'master_salespersons'
    ];
    for (const tbl of tables) {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${tbl}_id_seq`);
      await client.query(`SELECT setval('${tbl}_id_seq', COALESCE((SELECT MAX(id) FROM ${tbl}), 1))`).catch(() => {});
    }
    await client.query(`CREATE SEQUENCE IF NOT EXISTS master_salesperson_emails_id_seq`);
    await client.query(`SELECT setval('master_salesperson_emails_id_seq', COALESCE((SELECT MAX(email_id) FROM master_salesperson_emails), 1))`).catch(() => {});

    await client.query('COMMIT');
    console.log('\n=== MASTER RECONCILIATION COMPLETED AND STORED IN POSTGRESQL (PGADMIN) ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reconciliation failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    process.exit();
  }
}

reconcileMasters();
