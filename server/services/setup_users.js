const db = require('../db/pool');

async function setupUsersTable() {
  console.log('[Users Table Setup] Checking public.users table in PostgreSQL...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'sales',
      can_login BOOLEAN NOT NULL DEFAULT true,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      password VARCHAR(255),
      department VARCHAR(100),
      phone VARCHAR(50),
      notes TEXT,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_by VARCHAR(100) DEFAULT 'admin',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const countRes = await db.query('SELECT COUNT(*)::int AS count FROM public.users');
  if (countRes.rows[0].count === 0) {
    await db.query(`
      INSERT INTO public.users (full_name, email, username, role, can_login, status, department, phone, notes) VALUES
      ('Amaan', 'amaan@iqratechnology.com', 'amaan', 'admin', true, 'Active', 'IT & Administration', '+971 50 123 4567', 'System Administrator with full access'),
      ('Heena Naaz', 'heena.naaz@iqratechnology.com', 'heena.sales', 'sales', true, 'Active', 'Sales Department', '+971 50 234 5678', 'Senior Account Manager - Full CRM and Leads access'),
      ('Rifah Sheikh', 'rifah@iqratechnology.com', 'rifah.mktg', 'marketing', true, 'Active', 'Marketing Department', '+971 50 345 6789', 'Marketing Specialist - Dashboard & CRM access'),
      ('David Miller', 'david.miller@iqratechnology.com', 'david.viewer', 'viewer', true, 'Active', 'Executive Board', '+1 415 555 0199', 'Executive observer with read-only dashboard access'),
      ('Tariq Mansoor', 'tariq.m@iqratechnology.com', 'tariq.sales', 'sales', false, 'Blocked', 'Sales Department', '+971 50 999 8888', 'Login disabled - Suspended account')
    `);
    console.log('[Users Table Setup] Seeded 5 initial representative users for the 4 roles.');
  } else {
    console.log('[Users Table Setup] public.users already has', countRes.rows[0].count, 'records.');
  }
}

module.exports = { setupUsersTable };

if (require.main === module) {
  setupUsersTable()
    .then(() => {
      console.log('[Users Table Setup] Complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Users Table Setup Error]:', err);
      process.exit(1);
    });
}
