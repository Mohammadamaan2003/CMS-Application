const db = require('../server/db/pool');

async function testAllDashboardQueries() {
  try {
    console.log('--- 1. Overview KPIs ---');
    const kpiRes = await db.query(`
      SELECT 
        COUNT(DISTINCT l.lead_id) as total_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'WON' THEN l.lead_id END) as won_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'OPEN' THEN l.lead_id END) as open_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'ON HOLD' THEN l.lead_id END) as on_hold_leads,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'LOST' THEN l.lead_id END) as lost_leads,
        ROUND(
          COALESCE(
            COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'WON' THEN l.lead_id END)::numeric / 
            NULLIF(COUNT(DISTINCT l.lead_id), 0) * 100, 
            0
          ), 
          1
        ) as win_rate,
        COALESCE(SUM(l.amount_in_inr), 0) as contract_value_inr,
        ROUND(
          AVG(
            CASE 
              WHEN UPPER(TRIM(l.lost_won)) IN ('WON', 'LOST') 
                AND l.lead_date ~ '^\\d{2}/\\d{2}/\\d{4}$'
                AND l.modified_date ~ '^\\d{2}-[A-Za-z]{3}-\\d{4}$'
              THEN (TO_DATE(l.modified_date, 'DD-MON-YYYY') - TO_DATE(l.lead_date, 'DD/MM/YYYY'))
              ELSE NULL 
            END
          ), 
          1
        ) as avg_time_to_close_days
      FROM leads l
    `);
    console.log('KPIs:', kpiRes.rows[0]);

    console.log('\n--- 2. Lead Status Donut ---');
    const statusRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.lost_won), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id) as count
      FROM leads l
      GROUP BY label
      ORDER BY count DESC
    `);
    console.log('Lead Status Donut:', statusRes.rows);

    console.log('\n--- 3. Lead Lost by Reason Bar Chart ---');
    const reasonRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.reason), ''), 'Unspecified') as label,
        COUNT(DISTINCT l.lead_id) as count
      FROM leads l
      WHERE UPPER(TRIM(l.lost_won)) = 'LOST'
      GROUP BY label
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('Lost by Reason:', reasonRes.rows);

    console.log('\n--- 4. Monthly Leads by Year Line / Trend Chart ---');
    const monthlyYearRes = await db.query(`
      SELECT 
        l.year,
        l.month,
        COUNT(DISTINCT l.lead_id) as count
      FROM leads l
      WHERE l.year IS NOT NULL AND l.month IS NOT NULL AND TRIM(l.month) != ''
      GROUP BY l.year, l.month
      ORDER BY l.year ASC
    `);
    console.log('Monthly Leads by Year (sample 6):', monthlyYearRes.rows.slice(0, 6));

    console.log('\n--- 5. Total Leads by Month Bar Chart ---');
    const monthlyRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.month), ''), 'Unknown') as label,
        COUNT(DISTINCT l.lead_id) as count
      FROM leads l
      GROUP BY label
      ORDER BY count DESC
    `);
    console.log('Leads by Month:', monthlyRes.rows);

    console.log('\n--- 6. Total Leads by Account Manager Bar Chart ---');
    const mgrRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.account_manager), ''), 'Unassigned') as label,
        COUNT(DISTINCT l.lead_id) as count,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'WON' THEN l.lead_id END) as won_count,
        COALESCE(SUM(CASE WHEN UPPER(TRIM(l.lost_won)) = 'WON' THEN l.amount_in_inr ELSE 0 END), 0) as won_inr
      FROM leads l
      GROUP BY label
      ORDER BY count DESC
    `);
    console.log('Leads by Account Manager:', mgrRes.rows);

    console.log('\n--- 7. Countries by Total Leads (Grouped by Country and Technology) ---');
    const countryTechRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.country), ''), 'Unspecified') as country,
        COALESCE(NULLIF(TRIM(mt.technology), ''), NULLIF(TRIM(ll.technology_required), ''), NULLIF(TRIM(l.technology), ''), 'Other') as technology_name,
        COUNT(DISTINCT l.lead_id) as total_leads
      FROM leads l
      LEFT JOIN lead_lines ll ON ll.lead_id = l.lead_id
      LEFT JOIN master_technologies mt ON mt.id::text = ll.technology
      GROUP BY 1, 2
      ORDER BY total_leads DESC, country ASC
      LIMIT 10
    `);
    console.log('Country by Tech:', countryTechRes.rows);

    console.log('\n--- 8. Leads by Contact Report ---');
    const contactRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(l.contacts), ''), 'Unassigned') as contact_name,
        COALESCE(NULLIF(TRIM(l.company_name), ''), 'Unknown Company') as company_name,
        COUNT(DISTINCT l.lead_id) as lead_count,
        COUNT(DISTINCT CASE WHEN UPPER(TRIM(l.lost_won)) = 'WON' THEN l.lead_id END) as won_count
      FROM leads l
      WHERE l.contacts IS NOT NULL AND TRIM(l.contacts) != ''
      GROUP BY contact_name, company_name
      ORDER BY lead_count DESC
      LIMIT 10
    `);
    console.log('Leads by Contact:', contactRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('Test query error:', err);
    process.exit(1);
  }
}

testAllDashboardQueries();
