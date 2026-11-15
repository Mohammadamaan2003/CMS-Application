const { pool } = require('../server/db/pool');

async function run() {
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY ordinal_position
    `);
    console.log('--- COMPANIES COLUMNS ---');
    console.table(cols.rows);

    const constraints = await pool.query(`
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints tc 
      LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
      LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.table_name = 'companies'
    `);
    console.log('--- COMPANIES CONSTRAINTS ---');
    console.table(constraints.rows);

    // Sample row
    const sample = await pool.query(`SELECT * FROM companies LIMIT 1`);
    console.log('--- SAMPLE ROW KEYS ---', Object.keys(sample.rows[0]));

    // Check company count
    const countRes = await pool.query(`SELECT count(*) FROM companies`);
    console.log('--- TOTAL COMPANIES ---', countRes.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
