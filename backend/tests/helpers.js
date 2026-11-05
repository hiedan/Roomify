const { query } = require('../src/db');
const config = require('../src/config');

/** Wipe all data between tests. Seeded `amenities` are kept. */
async function resetDb() {
  if (process.env.NODE_ENV !== 'test' || new URL(config.databaseUrl).pathname !== '/nhatro_test') {
    throw new Error('resetDb requires the separate nhatro_test database');
  }
  await query(
    `TRUNCATE admin_action_audits, users, listings, listing_images, listing_amenities, nearby_places, favorites
     RESTART IDENTITY CASCADE`
  );
}

module.exports = { resetDb };
