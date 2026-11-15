const db = require('../server/db/pool');

async function run() {
  try {
    const tables = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Tables:', tables.rows.map((r) => r.table_name));

    for (const t of ['leads', 'lead_lines', 'companies', 'contacts', 'technologies', 'master_technology', 'lead_proposals', 'lead_resources']) {
      const exists = tables.rows.some((r) => r.table_name === t);
      if (exists) {
        const cols = await db.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
          [t]
        );
        console.log(`\n=== Table: ${t} (${cols.rows.length} columns) ===`);
        console.log(cols.rows.map((c) => `${c.column_name} (${c.data_type})`).join(', '));
      } else {
        console.log(`\nTable ${t} DOES NOT EXIST`);
      }
    }

    // Inspect sample lead row
    const leadSample = await db.query("SELECT * FROM leads LIMIT 1");
    console.log('\nSample lead row keys:', Object.keys(leadSample.rows[0] || {}));
    console.log('Sample lead values:', leadSample.rows[0]);

    // Inspect lead count
    const leadCount = await db.query("SELECT COUNT(*) FROM leads");
    console.log('\nTotal leads count:', leadCount.rows[0].count);

    // Inspect lead line count if exists
    const hasLeadLines = tables.rows.some((r) => r.table_name === 'lead_lines');
    if (hasLeadLines) {
      const llCount = await db.query("SELECT COUNT(*) FROM lead_lines");
      console.log('Total lead_lines count:', llCount.rows[0].count);
      const llSample = await db.query("SELECT * FROM lead_lines LIMIT 1");
      console.log('Sample lead_line row:', llSample.rows[0]);
    }

    process.exit(0);
  } catch (err) {
    console.error('Inspection error:', err);
    process.exit(1);
  }
}

run();
