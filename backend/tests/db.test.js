const { query } = require('../src/db');
const { resetDb } = require('./helpers');

test('migration creates all 7 tables and PostGIS', async () => {
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
