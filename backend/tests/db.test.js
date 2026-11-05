const { query } = require('../src/db');
const { resetDb } = require('./helpers');
const { hashPassword } = require('../src/services/authService');

test('migrations create all 8 application tables and PostGIS', async () => {
  const { rows } = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const names = rows.map((r) => r.table_name);
  for (const t of [
    'users',
    'listings',
    'listing_images',
    'amenities',
    'listing_amenities',
    'nearby_places',
    'favorites',
    'admin_action_audits',
  ]) {
    expect(names).toContain(t);
  }
  const ext = await query("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
  expect(ext.rows).toHaveLength(1);
});

test('seeds exactly 8 amenities', async () => {
  const { rows } = await query('SELECT count(*)::int AS n FROM amenities');
  expect(rows[0].n).toBe(8);
});

test('resetDb empties data tables but keeps amenities', async () => {
  await query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('A', 'a@mail.com', 'x', 'tenant')"
  );
  await resetDb();
  const users = await query('SELECT count(*)::int AS n FROM users');
  const amenities = await query('SELECT count(*)::int AS n FROM amenities');
  expect(users.rows[0].n).toBe(0);
  expect(amenities.rows[0].n).toBe(8);
});

test('role check rejects unknown roles', async () => {
  await expect(
    query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('B', 'b@mail.com', 'x', 'superuser')"
    )
  ).rejects.toThrow();
});

test('resetDb clears audit fixtures and users only in the isolated test database', async () => {
  const hash = await hashPassword('SyntheticReset!123');
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Reset Admin', 'reset-admin@gmail.com', $1, 'admin'),
            ('Reset Target', 'reset-target@gmail.com', $1, 'landlord') RETURNING id, role`, [hash]
  );
  await query(
    `INSERT INTO admin_action_audits (actor_user_id, target_user_id, action_type, previous_value, new_value)
     VALUES ($1, $2, 'role_change', 'tenant', 'landlord')`,
    [rows.find(row => row.role === 'admin').id, rows.find(row => row.role === 'landlord').id]
  );
  expect((await query('SELECT count(*)::int AS n FROM admin_action_audits')).rows[0].n).toBe(1);
  await resetDb();
  expect((await query('SELECT count(*)::int AS n FROM admin_action_audits')).rows[0].n).toBe(0);
  expect((await query('SELECT count(*)::int AS n FROM users')).rows[0].n).toBe(0);
  expect((await query('SELECT count(*)::int AS n FROM amenities')).rows[0].n).toBe(8);
});
