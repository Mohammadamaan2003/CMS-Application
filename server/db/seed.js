const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function seedDatabase() {
  const seedPath = path.join(__dirname, 'seed.sql');
  console.log('Seeding sample data into PostgreSQL...');

  try {
    const sql = fs.readFileSync(seedPath, 'utf-8');
    await pool.query(sql);
    console.log('Sample companies and contacts successfully loaded into database.');
  } catch (error) {
    console.error('Failed to seed sample data:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();

